-- Multi-signal WebMCP updates succeed or conflict together, never partially.
create function public.vesserith_mastery_batch(request_id uuid,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o uuid=auth.uid(); c vesserith.curricula; previous vesserith.operations;
  fingerprint jsonb; stage_id uuid; signal_name text; field jsonb; current_fields jsonb;
  result jsonb;
begin
  if o is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if request_id is null or payload is null or jsonb_typeof(payload) is distinct from 'object'
    or octet_length(payload::text)>4000 or jsonb_typeof(payload->'updates') is distinct from 'object'
    then raise exception 'Invalid mastery batch'; end if;
  if (select count(*) from jsonb_object_keys(payload->'updates')) not between 1 and 3
    then raise exception 'Provide one to three mastery signals'; end if;
  select * into c from vesserith.curricula where owner=o for update;
  if c is null then raise exception 'Bootstrap required'; end if;
  fingerprint=to_jsonb(encode(sha256(convert_to(jsonb_build_object('kind','mastery_batch','payload',payload)::text,'UTF8')),'hex'));
  select * into previous from vesserith.operations op where op.owner=o and op.request_id=vesserith_mastery_batch.request_id;
  if previous is not null then
    if previous.request<>fingerprint then raise exception 'Request ID already used for a different operation'; end if;
    return previous.result;
  end if;
  stage_id=(payload->>'stage')::uuid;
  if not exists(select 1 from vesserith.nodes where (owner,curriculum,id)=(o,c.id,stage_id) and kind='stage' and not archived)
    then raise exception 'Stage unavailable in this account'; end if;
  select jsonb_object_agg(signal,jsonb_build_object('value',value,'revision',revision)) into current_fields
    from vesserith.mastery where (owner,curriculum,stage)=(o,c.id,stage_id);
  for signal_name,field in select * from jsonb_each(payload->'updates') loop
    if signal_name not in ('understand','execute','explain') or jsonb_typeof(field) is distinct from 'object'
      or (field->>'value' in ('not_yet','practicing','independent')) is not true
      or jsonb_typeof(field->'revision') is distinct from 'number'
      or (field->>'revision')::numeric<1 or (field->>'revision')::numeric<>trunc((field->>'revision')::numeric)
      then raise exception 'Invalid mastery signal, level or revision'; end if;
  end loop;
  for signal_name,field in select * from jsonb_each(payload->'updates') loop
    if (field->>'revision')::bigint<>(current_fields->signal_name->>'revision')::bigint then
      return jsonb_build_object('ok',false,'code','conflict','message','A mastery signal changed. Review the whole update.','revision',c.learning_revision,'current',current_fields);
    end if;
  end loop;
  for signal_name,field in select * from jsonb_each(payload->'updates') loop
    update vesserith.mastery set value=field->>'value',revision=revision+1
      where (owner,curriculum,stage,signal)=(o,c.id,stage_id,signal_name);
  end loop;
  update vesserith.curricula set learning_revision=learning_revision+1 where owner=o;
  result=jsonb_build_object('ok',true,'revisions',vesserith.revisions(o));
  insert into vesserith.operations values(o,request_id,fingerprint,result,now());
  return result;
end $$;
revoke all on function public.vesserith_mastery_batch(uuid,jsonb) from public,anon;
grant execute on function public.vesserith_mastery_batch(uuid,jsonb) to authenticated;
