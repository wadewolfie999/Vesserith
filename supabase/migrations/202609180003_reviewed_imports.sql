create function public.vesserith_preview_import(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o uuid=auth.uid(); c vesserith.curricula; preview_id uuid; fields jsonb='[]'; import_stage text; v jsonb; s text; old jsonb; title text; u jsonb; graph_payload jsonb;
begin
  if o is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select * into c from vesserith.curricula where owner=o for update;
  if c is null then raise exception 'Bootstrap required'; end if;
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>60000000 or jsonb_typeof(payload->'notes') is distinct from 'object' or jsonb_typeof(payload->'mastery') is distinct from 'object' then raise exception 'Invalid import bundle'; end if;
  graph_payload=payload->'graph';
  if graph_payload is not null then
    -- Validate the exact transaction, then roll back this subtransaction, including code counters.
    begin
      perform vesserith.replace_graph(o,c.id,graph_payload);
      if payload ? 'ui' then perform vesserith.validate_ui(o,c.id,payload->'ui'||'{"schema":1}'::jsonb); end if;
      raise exception 'Preview only' using errcode='VSP01';
    exception when sqlstate 'VSP01' then null; end;
    fields=fields||jsonb_build_array(jsonb_build_object('key','graph','title','Private curriculum (displaced work is archived)','current',public.vesserith_read()->'graph','incoming',graph_payload,'conflict',true));
  end if;
  for import_stage,v in select * from jsonb_each(payload->'notes') loop
    if jsonb_typeof(v)<>'string' or octet_length(v#>>'{}')>262144 then raise exception 'Invalid note'; end if;
    select n.title,to_jsonb(note.value) into title,old from vesserith.nodes n join vesserith.notes note on (note.owner,note.curriculum,note.stage)=(n.owner,n.curriculum,n.id) where (n.owner,n.curriculum,n.id)=(o,c.id,import_stage::uuid);
    if title is null then
      select j->>'title' into title from jsonb_array_elements(coalesce(graph_payload->'nodes','[]')) j where j->>'id'=import_stage and j->>'kind'='stage';
      if title is null then raise exception 'Import targets an unavailable stage'; end if;
    end if;
    fields=fields||jsonb_build_array(jsonb_build_object('key','note:'||import_stage,'title',title||' — note','current',old,'incoming',v,'conflict',old is not null and old<>v));
  end loop;
  for import_stage,v in select * from jsonb_each(payload->'mastery') loop
    if jsonb_typeof(v)<>'object' or (select count(*) from jsonb_object_keys(v))<>3 or not v ?& array['understand','execute','explain'] then raise exception 'Invalid mastery'; end if;
    if not exists(select 1 from vesserith.nodes where owner=o and curriculum=c.id and nodes.id=import_stage::uuid and kind='stage') and not exists(select 1 from jsonb_array_elements(coalesce(graph_payload->'nodes','[]')) j where j->>'id'=import_stage and j->>'kind'='stage') then raise exception 'Import stage unavailable'; end if;
    foreach s in array array['understand','execute','explain'] loop
      if (v->>s in ('not_yet','practicing','independent')) is not true then raise exception 'Invalid mastery value'; end if;
      select to_jsonb(value) into old from vesserith.mastery where (owner,curriculum,stage,signal)=(o,c.id,import_stage::uuid,s);
      fields=fields||jsonb_build_array(jsonb_build_object('key','mastery:'||import_stage||':'||s,'title',coalesce((select n.title from vesserith.nodes n where n.owner=o and n.id=import_stage::uuid), 'New stage')||' — '||s,'current',old,'incoming',v->s,'conflict',old is not null and old<>v->s));
    end loop;
  end loop;
  if payload ? 'ui' then
    if graph_payload is null then perform vesserith.validate_ui(o,c.id,payload->'ui'||'{"schema":1}'::jsonb); end if;
    select value-'schema' into u from vesserith.ui where owner=o;
    fields=fields||jsonb_build_array(jsonb_build_object('key','ui','title','Saved workspace navigation','current',u,'incoming',payload->'ui','conflict',u<>payload->'ui'));
  end if;
  -- Previews expire and contain private copies under the same owner RLS.
  delete from vesserith.imports where owner=o and created_at<now()-interval '1 day';
  if (select count(*) from vesserith.imports where owner=o)>=10 then raise exception 'Too many import previews. Try again after previous previews expire.'; end if;
  insert into vesserith.imports(owner,payload,revisions) values(o,payload,vesserith.revisions(o)) returning imports.id into preview_id;
  return jsonb_build_object('id',preview_id,'fields',fields,'revisions',vesserith.revisions(o));
end $$;

create function public.vesserith_commit_import(preview_id uuid,choices jsonb,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o uuid=auth.uid(); c vesserith.curricula; p vesserith.imports; old vesserith.operations; req jsonb; result jsonb; import_stage text; v jsonb; s text;
begin
  if o is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if request_id is null or jsonb_typeof(choices) is distinct from 'object' then raise exception 'Invalid import confirmation'; end if;
  select * into c from vesserith.curricula where owner=o for update;
  req=to_jsonb(encode(sha256(convert_to(jsonb_build_object('kind','import','preview',preview_id,'choices',choices)::text,'UTF8')),'hex'));
  select * into old from vesserith.operations op where op.owner=o and op.request_id=vesserith_commit_import.request_id;
  if old.request_id is not null then if old.request<>req then raise exception 'Request ID reused'; end if; return old.result; end if;
  select * into p from vesserith.imports where owner=o and id=preview_id and created_at>now()-interval '1 day';
  if p.id is null then raise exception 'Import preview expired or unavailable'; end if;
  if p.revisions<>vesserith.revisions(o) then return jsonb_build_object('ok',false,'code','conflict','message','Account changed since the preview. Preview the import again.'); end if;
  if choices->'graph'='true'::jsonb then perform vesserith.replace_graph(o,c.id,p.payload->'graph'); update vesserith.curricula set graph_revision=graph_revision+1 where owner=o; end if;
  for import_stage,v in select * from jsonb_each(p.payload->'notes') loop
    if choices->('note:'||import_stage)='true'::jsonb then
      update vesserith.notes set value=v#>>'{}',revision=revision+1 where (owner,curriculum,stage)=(o,c.id,import_stage::uuid);
      if not found then raise exception 'Select the imported curriculum before importing its new stage notes'; end if;
    end if;
  end loop;
  for import_stage,v in select * from jsonb_each(p.payload->'mastery') loop foreach s in array array['understand','execute','explain'] loop
    if choices->('mastery:'||import_stage||':'||s)='true'::jsonb then
      update vesserith.mastery set value=v->>s,revision=revision+1 where (owner,curriculum,stage,signal)=(o,c.id,import_stage::uuid,s);
      if not found then raise exception 'Select the imported curriculum before its new stage mastery'; end if;
    end if;
  end loop; end loop;
  if choices->'ui'='true'::jsonb then
    perform vesserith.validate_ui(o,c.id,p.payload->'ui'||'{"schema":1}'::jsonb);
    update vesserith.ui set value=p.payload->'ui'||'{"schema":1}'::jsonb where owner=o;
    update vesserith.curricula set ui_revision=ui_revision+1 where owner=o;
  end if;
  update vesserith.curricula set learning_revision=learning_revision+1 where owner=o;
  result=jsonb_build_object('ok',true,'revisions',vesserith.revisions(o));
  insert into vesserith.operations values(o,request_id,req,result,now());
  delete from vesserith.imports where owner=o and id=preview_id;
  return result;
end $$;

revoke all on function public.vesserith_preview_import(jsonb),public.vesserith_commit_import(uuid,jsonb,uuid) from public,anon;
grant execute on function public.vesserith_preview_import(jsonb),public.vesserith_commit_import(uuid,jsonb,uuid) to authenticated;
