-- Immutable v3 schema. Public RPCs are the only write boundary.
create schema if not exists vesserith;
revoke all on schema vesserith from public, anon, authenticated;
grant usage on schema vesserith to authenticated;

create table vesserith.accounts (
  owner uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table vesserith.curricula (
  owner uuid primary key references vesserith.accounts(owner) on delete cascade,
  id uuid not null default gen_random_uuid(),
  graph_revision bigint not null default 1,
  learning_revision bigint not null default 1,
  ui_revision bigint not null default 1,
  next_gate integer not null default 2,
  next_route integer not null default 5,
  unique (owner,id)
);
create table vesserith.nodes (
  owner uuid not null, curriculum uuid not null, id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('stage','gate','route')),
  origin text, code text,
  title text not null check (length(btrim(title)) > 0 and length(title) <= 120),
  content jsonb not null default '{}',
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  x numeric not null default 50 check (x between 5 and 95),
  y numeric not null default 50 check (y between 8 and 90),
  placed boolean not null default false, archived boolean not null default false,
  threshold text not null default 'practicing' check (threshold in ('practicing','independent')),
  primary key (owner,curriculum,id),
  foreign key (owner,curriculum) references vesserith.curricula(owner,id) on delete cascade,
  unique (owner,curriculum,origin), unique (owner,curriculum,kind,code),
  check (jsonb_typeof(content)='object' and octet_length(content::text) <= 110000)
);
create table vesserith.edges (
  owner uuid not null, curriculum uuid not null, source uuid not null, target uuid not null,
  primary key (owner,curriculum,source,target), check (source <> target),
  foreign key (owner,curriculum,source) references vesserith.nodes(owner,curriculum,id) on delete cascade,
  foreign key (owner,curriculum,target) references vesserith.nodes(owner,curriculum,id) on delete cascade
);
create index edges_target on vesserith.edges(owner,curriculum,target);
create table vesserith.prerequisites (
  owner uuid not null, curriculum uuid not null, gate uuid not null, stage uuid not null,
  primary key (owner,curriculum,gate,stage),
  foreign key (owner,curriculum,gate) references vesserith.nodes(owner,curriculum,id) on delete cascade,
  foreign key (owner,curriculum,stage) references vesserith.nodes(owner,curriculum,id)
);
create table vesserith.mastery (
  owner uuid not null, curriculum uuid not null, stage uuid not null,
  signal text not null check (signal in ('understand','execute','explain')),
  value text not null default 'not_yet' check (value in ('not_yet','practicing','independent')),
  revision bigint not null default 1,
  primary key (owner,curriculum,stage,signal),
  foreign key (owner,curriculum,stage) references vesserith.nodes(owner,curriculum,id) on delete cascade
);
create table vesserith.notes (
  owner uuid not null, curriculum uuid not null, stage uuid not null,
  value text not null default '' check (octet_length(value)<=262144),
  revision bigint not null default 1,
  primary key (owner,curriculum,stage),
  foreign key (owner,curriculum,stage) references vesserith.nodes(owner,curriculum,id) on delete cascade
);
create table vesserith.ui (
  owner uuid not null, curriculum uuid not null,
  value jsonb not null,
  primary key (owner,curriculum),
  foreign key (owner,curriculum) references vesserith.curricula(owner,id) on delete cascade
);
create table vesserith.operations (
  owner uuid not null references vesserith.accounts(owner) on delete cascade,
  request_id uuid not null, request jsonb not null, result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner,request_id)
);
create table vesserith.imports (
  owner uuid not null references vesserith.accounts(owner) on delete cascade,
  id uuid not null default gen_random_uuid(), payload jsonb not null,
  revisions jsonb not null, created_at timestamptz not null default now(),
  primary key(owner,id)
);

do $$ declare t text; begin
  foreach t in array array['accounts','curricula','nodes','edges','prerequisites','mastery','notes','ui','operations','imports'] loop
    execute format('alter table vesserith.%I enable row level security',t);
    execute format('create policy own_read on vesserith.%I for select to authenticated using (owner = (select auth.uid()))',t);
    execute format('revoke all on vesserith.%I from public, anon, authenticated',t);
    execute format('grant select on vesserith.%I to authenticated',t);
  end loop;
end $$;

create function vesserith.code(n integer) returns text language plpgsql immutable set search_path='' as $$
declare result text=''; begin
  if n<1 then raise exception 'Invalid code'; end if;
  while n>0 loop n=n-1; result=chr(65+n%26)||result; n=n/26; end loop; return result;
end $$;

create function vesserith.revisions(o uuid) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('curriculum',graph_revision,'learning',learning_revision,'ui',ui_revision) from vesserith.curricula where owner=o;
$$;

create function vesserith.validate_content(k text, body jsonb) returns void language plpgsql set search_path='' as $$
declare key text; val jsonb; allowed text[];
begin
  allowed=case k when 'stage' then array['objective','action','evidence'] when 'route' then array['choose','outcome','constraint'] else array[]::text[] end;
  if body is null or jsonb_typeof(body)<>'object' then raise exception 'Content must be an object'; end if;
  for key,val in select * from jsonb_each(body) loop
    if not (key=any(allowed)) or jsonb_typeof(val)<>'string' or length(val#>>'{}')>4000 then raise exception 'Invalid content field'; end if;
  end loop;
end $$;

create function vesserith.validate_ui(o uuid,c uuid,v jsonb) returns void language plpgsql set search_path='' as $$
declare k text;
begin
  if v is null or jsonb_typeof(v)<>'object' or octet_length(v::text)>16000 then raise exception 'Invalid UI state'; end if;
  if (select count(*) from jsonb_object_keys(v))<>8 or not v ?& array['selected','lens','tab','about','deferred','expanded','concept','schema'] then raise exception 'Invalid UI fields'; end if;
  if v->>'schema' is distinct from '1' or (v->>'lens' in ('overview','understand','execute','explain')) is not true or (v->>'tab' in ('brief','self-check','notes')) is not true then raise exception 'Invalid UI choice'; end if;
  if v->>'selected' is not null and not exists(select 1 from vesserith.nodes where owner=o and curriculum=c and id=(v->>'selected')::uuid) then raise exception 'Selected waypoint unavailable'; end if;
  foreach k in array array['about','deferred','expanded'] loop if jsonb_typeof(v->k) is distinct from 'boolean' then raise exception 'Invalid disclosure state'; end if; end loop;
  if jsonb_typeof(v->'concept')<>'object' or (select count(*) from jsonb_object_keys(v->'concept'))<>4 or not (v->'concept') ?& array['open','view','step','participant'] then raise exception 'Invalid concept state'; end if;
  if jsonb_typeof(v#>'{concept,open}') is distinct from 'boolean' or (v#>>'{concept,view}' in ('lab','host')) is not true or jsonb_typeof(v#>'{concept,step}') is distinct from 'number' or (v#>>'{concept,step}') !~ '^[0-6]$' or jsonb_typeof(v#>'{concept,participant}') is distinct from 'string' or length(v#>>'{concept,participant}')>80 then raise exception 'Invalid concept selection'; end if;
end $$;

create function vesserith.validate_graph(o uuid,c uuid) returns void language plpgsql set search_path='' as $$
declare node_record record;
begin
  if (select count(*) from vesserith.nodes where owner=o and curriculum=c)>200 or (select count(*) from vesserith.edges where owner=o and curriculum=c)>400 then raise exception 'Trail limit: 200 nodes / 400 edges'; end if;
  for node_record in select * from vesserith.nodes where owner=o and curriculum=c loop perform vesserith.validate_content(node_record.kind,node_record.content); end loop;
  if exists(select 1 from vesserith.edges e join vesserith.nodes n on n.owner=e.owner and n.curriculum=e.curriculum and n.id=e.source where e.owner=o and e.curriculum=c and n.kind='route') then raise exception 'Routes cannot have outgoing connections'; end if;
  if exists(
    with recursive walk(source,target) as (
      select e.source,e.target from vesserith.edges e join vesserith.nodes a on (a.owner,a.curriculum,a.id)=(e.owner,e.curriculum,e.source) join vesserith.nodes b on (b.owner,b.curriculum,b.id)=(e.owner,e.curriculum,e.target) where e.owner=o and e.curriculum=c and not a.archived and not b.archived
      union
      select w.source,e.target from walk w join vesserith.edges e on e.owner=o and e.curriculum=c and e.source=w.target join vesserith.nodes b on (b.owner,b.curriculum,b.id)=(e.owner,e.curriculum,e.target) where not b.archived
    ) select 1 from walk where source=target
  ) then raise exception 'Connections cannot form a cycle'; end if;
  if exists(select 1 from vesserith.prerequisites p join vesserith.nodes g on (g.owner,g.curriculum,g.id)=(p.owner,p.curriculum,p.gate) join vesserith.nodes s on (s.owner,s.curriculum,s.id)=(p.owner,p.curriculum,p.stage) where p.owner=o and p.curriculum=c and (g.kind<>'gate' or s.kind<>'stage')) then raise exception 'Prerequisites must connect gates to stages'; end if;
  if exists(select 1 from vesserith.nodes n where n.owner=o and n.curriculum=c and n.kind='gate' and n.placed and not n.archived and not exists(select 1 from vesserith.prerequisites p where (p.owner,p.curriculum,p.gate)=(o,c,n.id))) then raise exception 'A gate needs prerequisite stages'; end if;
  if exists(
    with recursive upstream(source,target) as (
      select source,target from vesserith.edges where owner=o and curriculum=c
      union select w.source,e.target from upstream w join vesserith.edges e on e.owner=o and e.curriculum=c and e.source=w.target
    ) select 1 from vesserith.prerequisites p join vesserith.nodes g on (g.owner,g.curriculum,g.id)=(p.owner,p.curriculum,p.gate) join vesserith.nodes s on (s.owner,s.curriculum,s.id)=(p.owner,p.curriculum,p.stage)
    where p.owner=o and p.curriculum=c and not g.archived and not s.archived and not exists(select 1 from upstream where source=p.stage and target=p.gate)
  ) then raise exception 'A prerequisite must be an upstream stage'; end if;
end $$;

create function vesserith.seed(o uuid,c uuid) returns void language plpgsql set search_path='' as $$
declare stage_ids uuid[]='{}'; ids uuid[]='{}'; n jsonb; new_id uuid; previous uuid; gate_id uuid; idx integer=0;
begin
  for n in select * from jsonb_array_elements('[
    {"origin":"ground","title":"Ground environment","x":7,"y":78,"objective":"Know exactly which project, interpreter, environment, and MCP SDK are active.","action":"Verify the working directory, project-local Python, virtual environment, and installed package.","evidence":"The project-local interpreter runs a minimal file from the intended workspace."},
    {"origin":"model","title":"Understand MCP","x":19,"y":59,"objective":"Build a dependable mental model of the participants and the boundary MCP creates.","action":"Trace one request through host, client, transport, server, tool, and underlying Python function.","evidence":"You can name each participant and identify who owns the data and action."},
    {"origin":"server","title":"Build server","x":32,"y":69,"objective":"Expose one small, typed Python function as a discoverable MCP tool.","action":"Run the deterministic add tool and inspect its name, schema, and result through MCP Inspector.","evidence":"The Inspector discovers the tool and add(2, 3) returns 5."},
    {"origin":"client","title":"Build client","x":45,"y":42,"objective":"Understand capability discovery and tool invocation from the client side.","action":"Write a local Python client that discovers and calls add over stdio, then disconnects cleanly.","evidence":"You can change the inputs, predict the response, and distinguish discovery from invocation."},
    {"origin":"failures","title":"Read failures","x":57,"y":58,"objective":"Identify which layer failed before attempting to repair it.","action":"Introduce one controlled fault and inspect its Python traceback or MCP/transport error.","evidence":"You name the failed layer, find the relevant frame, and test the smallest correction."},
    {"origin":"independence","title":"Rebuild independently","x":66,"y":30,"objective":"Demonstrate that the pattern is understood rather than merely familiar.","action":"Rebuild the pair from a blank start and replace add with another deterministic function.","evidence":"You can explain, modify, and debug the pair while using hints before complete solutions."}
  ]'::jsonb) loop
    new_id=gen_random_uuid(); stage_ids=array_append(stage_ids,new_id);
    insert into vesserith.nodes(owner,curriculum,id,kind,origin,title,content,sort_order,x,y,placed) values(o,c,new_id,'stage',n->>'origin',n->>'title',n-array['origin','title','x','y'],idx,(n->>'x')::numeric,(n->>'y')::numeric,true);
    insert into vesserith.mastery(owner,curriculum,stage,signal) select o,c,new_id,s from unnest(array['understand','execute','explain']) s;
    insert into vesserith.notes(owner,curriculum,stage) values(o,c,new_id);
    if previous is not null then insert into vesserith.edges values(o,c,previous,new_id); end if;
    previous=new_id; idx=idx+1;
  end loop;
  gate_id=gen_random_uuid();
  insert into vesserith.nodes(owner,curriculum,id,kind,origin,code,title,sort_order,x,y,placed) values(o,c,gate_id,'gate','gate','A','Gate A self-test',6,74,51,true);
  insert into vesserith.edges values(o,c,previous,gate_id);
  insert into vesserith.prerequisites select o,c,gate_id,s from unnest(stage_ids) s;
  idx=0;
  for n in select * from jsonb_array_elements('[
    {"origin":"research","title":"PySR research groundwork","choose":"Choose after Gate A when you want a bounded path toward a PySR research MCP.","outcome":"Map one manual results workflow and define one read-only capability over sanitized, completed runs.","constraint":"Do not launch experiments, write research data, add SSH, or introduce cross-machine synchronization."},
    {"origin":"consolidation","title":"Consolidation loop","choose":"Choose when the first server-client pair cannot yet be rebuilt or explained without substantial help.","outcome":"Create a second tiny pair around a different deterministic function and diagnose one controlled fault.","constraint":"Use hints first and keep the exercise local, small, and independent of research data."},
    {"origin":"host","title":"AI-host rehearsal","choose":"Choose when the local pair is understood and configuration experience is the next uncertainty.","outcome":"Connect the toy server to one AI host with documented, removable configuration.","constraint":"Use toy data and one host; do not treat the rehearsal as the research deployment."},
    {"origin":"pymynyra","title":"Py-Mynyra groundwork","choose":"Explore a sourced project briefing as a bounded application of the local MCP pattern.","outcome":"Study a read-only project-state reader and separate stdio MCP adapter. The project scenario has a tested prototype; persistent AI-host integration is its next design question.","constraint":"Keep the scenario local and reversible: no credentials, remote transport, synchronization, or write-capable actions."}
  ]'::jsonb) loop
    new_id=gen_random_uuid();
    insert into vesserith.nodes(owner,curriculum,id,kind,origin,code,title,content,sort_order,x,y,placed) values(o,c,new_id,'route',n->>'origin',vesserith.code(idx+1),n->>'title',n-array['origin','title'],7+idx,92,14+idx*23,true);
    insert into vesserith.edges values(o,c,gate_id,new_id); idx=idx+1;
  end loop;
  insert into vesserith.ui values(o,c,jsonb_build_object('schema',1,'selected',stage_ids[1],'lens','overview','tab','brief','about',false,'deferred',false,'expanded',false,'concept',jsonb_build_object('open',false,'view','lab','step',0,'participant','application')));
end $$;

create function public.vesserith_read(known jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare o uuid=auth.uid(); c vesserith.curricula; result jsonb; g jsonb; l jsonb;
begin
  if o is null then raise exception 'Authentication required' using errcode='28000'; end if;
  -- Hold the account revision stable while assembling changed slices.
  select * into c from vesserith.curricula where owner=o for share;
  if c is null then raise exception 'Bootstrap required'; end if;
  result=jsonb_build_object('curriculumId',c.id,'revisions',vesserith.revisions(o));
  if coalesce((known->>'curriculum')::bigint,0)<>c.graph_revision then
    select jsonb_build_object('nodes',coalesce(jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'origin',n.origin,'code',n.code,'title',n.title,'content',n.content,'order',n.sort_order,'x',n.x,'y',n.y,'placed',n.placed,'archived',n.archived,'threshold',n.threshold,'prerequisites',coalesce((select jsonb_agg(p.stage order by p.stage) from vesserith.prerequisites p where (p.owner,p.curriculum,p.gate)=(o,c.id,n.id)),'[]'::jsonb)) order by n.sort_order,n.id),'[]'::jsonb),'edges',coalesce((select jsonb_agg(jsonb_build_object('source',source,'target',target) order by source,target) from vesserith.edges where owner=o and curriculum=c.id),'[]'::jsonb)) into g from vesserith.nodes n where n.owner=o and n.curriculum=c.id;
    result=result||jsonb_build_object('graph',g);
  end if;
  if coalesce((known->>'learning')::bigint,0)<>c.learning_revision then
    select jsonb_build_object('mastery',coalesce((select jsonb_object_agg(stage,signals) from (select stage,jsonb_object_agg(signal,jsonb_build_object('value',value,'revision',revision)) signals from vesserith.mastery where owner=o and curriculum=c.id group by stage) m),'{}'::jsonb),'notes',coalesce((select jsonb_object_agg(stage,jsonb_build_object('value',value,'revision',revision)) from vesserith.notes where owner=o and curriculum=c.id),'{}'::jsonb)) into l;
    result=result||jsonb_build_object('learning',l);
  end if;
  if coalesce((known->>'ui')::bigint,0)<>c.ui_revision then result=result||jsonb_build_object('ui',(select value-'schema' from vesserith.ui where owner=o and curriculum=c.id)); end if;
  return result;
end $$;

create function public.vesserith_bootstrap() returns jsonb language plpgsql security definer set search_path='' as $$
declare o uuid=auth.uid(); c uuid;
begin
  if o is null then raise exception 'Authentication required' using errcode='28000'; end if;
  insert into vesserith.accounts(owner) values(o) on conflict do nothing;
  perform 1 from vesserith.accounts where owner=o for update;
  if not exists(select 1 from vesserith.curricula where owner=o) then
    insert into vesserith.curricula(owner) values(o) returning id into c;
    perform vesserith.seed(o,c);
  end if;
  return public.vesserith_read();
end $$;

-- Function default EXECUTE privileges are unsafe for private helpers.
revoke all on all functions in schema vesserith from public, anon, authenticated;
revoke all on function public.vesserith_read(jsonb),public.vesserith_bootstrap() from public, anon;
grant execute on function public.vesserith_read(jsonb),public.vesserith_bootstrap() to authenticated;
