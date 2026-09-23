create function vesserith.replace_graph(o uuid,c uuid,g jsonb) returns void language plpgsql set search_path='' as $$
declare n jsonb; e jsonb; old vesserith.nodes; node_id uuid; counter integer; assigned_code text; prerequisite jsonb;
begin
  if g is null or jsonb_typeof(g->'nodes') is distinct from 'array' or jsonb_typeof(g->'edges') is distinct from 'array' or jsonb_array_length(g->'nodes')>200 or jsonb_array_length(g->'edges')>400 then raise exception 'Invalid graph or trail limit exceeded'; end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(g->'nodes'))<>jsonb_array_length(g->'nodes') then raise exception 'Duplicate node IDs'; end if;
  -- An ordinary topology save cannot hard-delete a live node or a referenced stage.
  if exists(select 1 from vesserith.nodes existing where existing.owner=o and existing.curriculum=c and not existing.archived and not exists(select 1 from jsonb_array_elements(g->'nodes') j where (j->>'id')::uuid=existing.id)) then raise exception 'Archive nodes before permanent deletion'; end if;
  if exists(select 1 from vesserith.prerequisites p where p.owner=o and p.curriculum=c and not exists(select 1 from jsonb_array_elements(g->'nodes') j where (j->>'id')::uuid=p.stage)) then raise exception 'Repair gate prerequisites before permanent deletion'; end if;
  for n in select * from jsonb_array_elements(g->'nodes') loop
    node_id=(n->>'id')::uuid;
    if node_id is null or jsonb_typeof(n->'placed') is distinct from 'boolean' or jsonb_typeof(n->'archived') is distinct from 'boolean' or jsonb_typeof(n->'prerequisites') is distinct from 'array' then raise exception 'Invalid node fields'; end if;
    select * into old from vesserith.nodes where (owner,curriculum,id)=(o,c,node_id);
    if old.id is not null and (old.kind<>n->>'kind' or old.origin is distinct from n->>'origin' or old.code is distinct from n->>'code') then raise exception 'Node type, origin and code are immutable'; end if;
    assigned_code=old.code;
    if old.id is null then
      if n->>'origin' is not null then raise exception 'Custom nodes cannot claim template origins'; end if;
      if n->>'kind'='gate' then update vesserith.curricula set next_gate=next_gate+1 where owner=o returning next_gate-1 into counter; assigned_code=vesserith.code(counter);
      elsif n->>'kind'='route' then update vesserith.curricula set next_route=next_route+1 where owner=o returning next_route-1 into counter; assigned_code=vesserith.code(counter); end if;
    end if;
    perform vesserith.validate_content(n->>'kind',n->'content');
    insert into vesserith.nodes(owner,curriculum,id,kind,origin,code,title,content,sort_order,x,y,placed,archived,threshold)
    values(o,c,node_id,n->>'kind',old.origin,assigned_code,n->>'title',n->'content',(n->>'order')::integer,(n->>'x')::numeric,(n->>'y')::numeric,(n->>'placed')::boolean,(n->>'archived')::boolean,n->>'threshold')
    on conflict(owner,curriculum,id) do update set title=excluded.title,content=excluded.content,sort_order=excluded.sort_order,x=excluded.x,y=excluded.y,placed=excluded.placed,archived=excluded.archived,threshold=excluded.threshold;
    if n->>'kind'='stage' then
      insert into vesserith.mastery(owner,curriculum,stage,signal) select o,c,node_id,s from unnest(array['understand','execute','explain']) s on conflict do nothing;
      insert into vesserith.notes(owner,curriculum,stage) values(o,c,node_id) on conflict do nothing;
    end if;
  end loop;
  delete from vesserith.prerequisites where owner=o and curriculum=c;
  delete from vesserith.edges where owner=o and curriculum=c;
  delete from vesserith.nodes existing where existing.owner=o and existing.curriculum=c and not exists(select 1 from jsonb_array_elements(g->'nodes') j where (j->>'id')::uuid=existing.id);
  for e in select * from jsonb_array_elements(g->'edges') loop insert into vesserith.edges values(o,c,(e->>'source')::uuid,(e->>'target')::uuid); end loop;
  for n in select * from jsonb_array_elements(g->'nodes') loop
    for prerequisite in select * from jsonb_array_elements(n->'prerequisites') loop insert into vesserith.prerequisites values(o,c,(n->>'id')::uuid,(prerequisite#>>'{}')::uuid); end loop;
  end loop;
  perform vesserith.validate_graph(o,c);
  -- A disconnected draft is never promoted into progress simply by claiming placed=true.
  with recursive reached(id) as (
    (select id from vesserith.nodes where owner=o and curriculum=c and kind='stage' and placed order by sort_order,id limit 1)
    union
    select e.target from reached r join vesserith.edges e on e.owner=o and e.curriculum=c and e.source=r.id
  ) update vesserith.nodes nd set placed=exists(select 1 from reached where id=nd.id) where nd.owner=o and nd.curriculum=c and not nd.archived;
  -- Retained connections through archived nodes keep affected gates visible as unavailable.
  -- Reachability may promote a draft gate; validate its prerequisites in that final state.
  perform vesserith.validate_graph(o,c);
end $$;

create function public.vesserith_mutate(request_id uuid,kind text,expected bigint,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o uuid=auth.uid(); c vesserith.curricula; previous vesserith.operations; req jsonb;
  rev bigint; current_value jsonb; stage_id uuid; result jsonb; ui_value jsonb;
begin
  if o is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if request_id is null or expected is null or expected<1 or payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>2000000 then raise exception 'Invalid mutation envelope'; end if;
  select * into c from vesserith.curricula where owner=o for update;
  if c is null then raise exception 'Bootstrap required'; end if;
  -- Retain a canonical fingerprint, not an unrequested history of private note text.
  req=to_jsonb(encode(sha256(convert_to(jsonb_build_object('kind',kind,'expected',expected,'payload',payload)::text,'UTF8')),'hex'));
  select * into previous from vesserith.operations op where op.owner=o and op.request_id=vesserith_mutate.request_id;
  if previous is not null then
    if previous.request<>req then raise exception 'Request ID already used for a different operation'; end if;
    return previous.result;
  end if;
  if kind in ('note','mastery') then
    stage_id=(payload->>'stage')::uuid;
    if not exists(select 1 from vesserith.nodes n where (n.owner,n.curriculum,n.id)=(o,c.id,stage_id) and n.kind='stage' and not n.archived) then raise exception 'Stage unavailable in this account'; end if;
    if kind='note' then
      if jsonb_typeof(payload->'value') is distinct from 'string' or octet_length(payload->>'value')>262144 then raise exception 'Notes must be text up to 256 KiB'; end if;
      select revision,to_jsonb(value) into rev,current_value from vesserith.notes where (owner,curriculum,stage)=(o,c.id,stage_id);
    else
      if (payload->>'signal' in ('understand','execute','explain')) is not true or (payload->>'value' in ('not_yet','practicing','independent')) is not true then raise exception 'Invalid mastery signal or level'; end if;
      select revision,to_jsonb(value) into rev,current_value from vesserith.mastery where (owner,curriculum,stage,signal)=(o,c.id,stage_id,payload->>'signal');
    end if;
  elsif kind='ui' then rev=c.ui_revision; select value-'schema' into current_value from vesserith.ui where owner=o;
  elsif kind in ('graph','reset') then rev=c.graph_revision; current_value=public.vesserith_read()->'graph';
  else raise exception 'Unknown mutation'; end if;
  if expected<>rev then return jsonb_build_object('ok',false,'code','conflict','message','Another browser changed this field. Review both versions.','revision',rev,'current',current_value); end if;
  if kind='note' then
    update vesserith.notes set value=payload->>'value',revision=revision+1 where (owner,curriculum,stage)=(o,c.id,stage_id);
    update vesserith.curricula set learning_revision=learning_revision+1 where owner=o;
  elsif kind='mastery' then
    update vesserith.mastery set value=payload->>'value',revision=revision+1 where (owner,curriculum,stage,signal)=(o,c.id,stage_id,payload->>'signal');
    update vesserith.curricula set learning_revision=learning_revision+1 where owner=o;
  elsif kind='ui' then
    ui_value=(payload->'value')||jsonb_build_object('schema',1);
    perform vesserith.validate_ui(o,c.id,ui_value);
    update vesserith.ui set value=ui_value where owner=o;
    update vesserith.curricula set ui_revision=ui_revision+1 where owner=o;
  elsif kind='graph' then
    perform vesserith.replace_graph(o,c.id,payload->'graph');
    update vesserith.curricula set graph_revision=graph_revision+1,learning_revision=learning_revision+1 where owner=o;
    -- Repair a deleted selection without touching notes or an active client editor.
    if not exists(select 1 from vesserith.nodes where owner=o and id=(select (value->>'selected')::uuid from vesserith.ui where owner=o)) then
      update vesserith.ui set value=jsonb_set(value,'{selected}','null') where owner=o;
      update vesserith.curricula set ui_revision=ui_revision+1 where owner=o;
    end if;
  elsif kind='reset' then
    if payload->>'confirmation' is distinct from 'RESET MY TRAIL' or (payload->>'learningRevision')::bigint is distinct from c.learning_revision or (payload->>'uiRevision')::bigint is distinct from c.ui_revision then raise exception 'Reset preview is stale or confirmation missing'; end if;
    delete from vesserith.prerequisites where owner=o;
    delete from vesserith.nodes where owner=o;
    delete from vesserith.ui where owner=o;
    update vesserith.curricula set graph_revision=graph_revision+1,learning_revision=learning_revision+1,ui_revision=ui_revision+1,next_gate=2,next_route=5 where owner=o;
    perform vesserith.seed(o,c.id);
  end if;
  result=jsonb_build_object('ok',true,'revisions',vesserith.revisions(o));
  insert into vesserith.operations values(o,request_id,req,result,now());
  return result;
end $$;

revoke all on all functions in schema vesserith from public,anon,authenticated;
revoke all on function public.vesserith_mutate(uuid,text,bigint,jsonb) from public,anon;
grant execute on function public.vesserith_mutate(uuid,text,bigint,jsonb) to authenticated;
