import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Snapshot, MutationResult } from '../frontend/domain';
let db: PGlite;
const ALICE='00000000-0000-4000-8000-000000000001', BOB='00000000-0000-4000-8000-000000000002';
async function asUser(id: string | null) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id ?? '']); await db.exec(id ? 'set role authenticated' : 'set role anon'); }
async function read(): Promise<Snapshot> { const r=await db.query<{s:Snapshot}>('select public.vesserith_read() s'); return r.rows[0].s; }
async function mutate(kind:string,expected:number,payload:unknown,requestId=randomUUID()): Promise<MutationResult> { const r=await db.query<{s:MutationResult}>('select public.vesserith_mutate($1,$2,$3,$4::jsonb) s',[requestId,kind,expected,JSON.stringify(payload)]); return r.rows[0].s; }
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values('${ALICE}'),('${BOB}');`);
  for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
  await asUser(ALICE); await db.query('select public.vesserith_bootstrap()');
  await asUser(BOB); await db.query('select public.vesserith_bootstrap()');
},60000);
afterAll(async()=>{await db?.close();});
describe('PostgreSQL account boundary (PGlite; auth identity stub only)',()=>{
  it('applies mastery batches atomically, rejects stale batches, and deduplicates retries',async()=>{
    await asUser(ALICE);const a=await read(),stage=a.graph.nodes.find(n=>n.kind==='stage')!.id;
    const fields=a.learning.mastery[stage],id=randomUUID();
    const batch=(payload:unknown,request=id)=>db.query<{s:MutationResult}>('select public.vesserith_mastery_batch($1,$2::jsonb) s',[request,JSON.stringify(payload)]).then(r=>r.rows[0].s);
    const stale={stage,updates:{understand:{value:'independent',revision:fields.understand.revision},execute:{value:'practicing',revision:fields.execute.revision+1}}};
    expect(await batch(stale)).toMatchObject({ok:false,code:'conflict'});expect((await read()).learning).toEqual(a.learning);
    const valid={stage,updates:{understand:{value:'not_yet',revision:fields.understand.revision},execute:{value:'not_yet',revision:fields.execute.revision}}};
    const first=await batch(valid);expect(first.ok).toBe(true);expect(await batch(valid)).toEqual(first);
    expect((await read()).learning.mastery[stage].understand.revision).toBe(fields.understand.revision+1);
    await expect(batch(stale)).rejects.toThrow(/Request ID/);
    await expect(batch({stage,updates:{explain:{value:'invented',revision:1}}},randomUUID())).rejects.toThrow(/Invalid mastery/);
    await asUser(BOB);await expect(batch(valid,randomUUID())).rejects.toThrow(/Stage unavailable/);
    await asUser(null);await expect(batch(valid,randomUUID())).rejects.toThrow(/permission denied/);
    // Keep this suite's legacy fixed-revision examples independent of the batch probe.
    await db.exec('reset role');await db.query('update vesserith.mastery set revision=1 where owner=$1',[ALICE]);await db.query('update vesserith.curricula set learning_revision=1 where owner=$1',[ALICE]);
  });
  it('initializes a neutral private template once',async()=>{
    await asUser(ALICE); const a=await read(); await db.query('select public.vesserith_bootstrap()'); const again=await read();
    expect(a).toEqual(again); expect(a.graph.nodes).toHaveLength(11); expect(a.graph.edges).toHaveLength(10);
    expect(a.graph.nodes.filter(n=>n.kind==='route').map(n=>n.code)).toEqual(['A','B','C','D']);
    expect(Object.values(a.learning.notes).every(n=>n.value==='')).toBe(true);
    expect(Object.values(a.learning.mastery).every(m=>Object.values(m).every(s=>s.value==='not_yet'))).toBe(true);
  });
  it('denies anonymous RPC and private-table access',async()=>{
    await asUser(null); await expect(db.query('select public.vesserith_read()')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from vesserith.notes')).rejects.toThrow(/permission denied/);
  });
  it('RLS hides another account and direct writes are forbidden',async()=>{
    await asUser(ALICE);
    expect((await db.query('select * from vesserith.nodes where owner=$1',[BOB])).rows).toHaveLength(0);
    await expect(db.query("update vesserith.notes set value='bypass'")).rejects.toThrow(/permission denied/);
    await asUser(BOB); const b=await read(); await asUser(ALICE);
    await expect(mutate('note',1,{stage:b.graph.nodes[0].id,value:'attack',owner:BOB})).rejects.toThrow(/Stage unavailable/);
  });
  it('merges independent signals and rejects stale note edits without losing text',async()=>{
    await asUser(ALICE); const a=await read(),stage=a.graph.nodes[0].id;
    expect((await mutate('mastery',1,{stage,signal:'understand',value:'independent'})).ok).toBe(true);
    expect((await mutate('mastery',1,{stage,signal:'execute',value:'practicing'})).ok).toBe(true);
    const text='سلام\n<script>literal only</script>';
    expect((await mutate('note',1,{stage,value:text})).ok).toBe(true);
    const conflict=await mutate('note',1,{stage,value:'stale'});
    expect(conflict).toMatchObject({ok:false,code:'conflict',current:text,revision:2});
    expect((await read()).learning.notes[stage].value).toBe(text);
  });
  it('retries idempotently and rejects request-ID reuse',async()=>{
    await asUser(ALICE); const a=await read(),stage=a.graph.nodes[0].id,id=randomUUID();
    const p={stage,value:''}; const first=await mutate('note',2,p,id); const second=await mutate('note',2,p,id);
    expect(second).toEqual(first); expect((await read()).learning.notes[stage]).toEqual({value:'',revision:3});
    await expect(mutate('note',2,{stage,value:'different'},id)).rejects.toThrow(/Request ID/);
  });
  it('validates graph rules transactionally',async()=>{
    await asUser(ALICE); const a=await read(),g=structuredClone(a.graph); g.edges.push({source:g.nodes[1].id,target:g.nodes[0].id});
    await expect(mutate('graph',a.revisions.curriculum,{graph:g})).rejects.toThrow(/cycle/);
    expect((await read()).graph).toEqual(a.graph);
    const terminal=structuredClone(a.graph); terminal.edges.push({source:terminal.nodes[7].id,target:terminal.nodes[0].id});
    await expect(mutate('graph',a.revisions.curriculum,{graph:terminal})).rejects.toThrow(/outgoing/);
  });
  it('checks note byte limits and rejects malformed mastery',async()=>{
    await asUser(ALICE); const a=await read(),stage=a.graph.nodes[0].id;
    await expect(mutate('note',3,{stage,value:'語'.repeat(90000)})).rejects.toThrow(/256 KiB/);
    await expect(mutate('mastery',1,{stage,signal:'invented',value:'independent'})).rejects.toThrow(/Invalid mastery/);
    await expect(mutate('mastery',1,{stage,signal:'explain'})).rejects.toThrow(/Invalid mastery/);
  });
  it('creates drafts, keeps route codes stable, and validates both gate thresholds',async()=>{
    await asUser(BOB);let b=await read();const graph=structuredClone(b.graph),routeId=randomUUID(),stageId=randomUUID();
    graph.nodes.push({...graph.nodes[0],id:stageId,origin:null,title:'Custom stage',placed:false});
    graph.nodes.push({...graph.nodes[7],id:routeId,origin:null,code:null,title:'Custom route',placed:false});
    expect((await mutate('graph',b.revisions.curriculum,{graph})).ok).toBe(true);
    b=await read();expect(b.graph.nodes.find(n=>n.id===routeId)?.code).toBe('E');expect(b.graph.nodes.find(n=>n.id===stageId)?.placed).toBe(false);
    const renamed=structuredClone(b.graph);const r=renamed.nodes.find(n=>n.id===routeId)!;r.title='Renamed';r.order=55;
    const gate=renamed.nodes.find(n=>n.kind==='gate')!;gate.threshold='independent';
    expect((await mutate('graph',b.revisions.curriculum,{graph:renamed})).ok).toBe(true);
    b=await read();expect(b.graph.nodes.find(n=>n.id===routeId)?.code).toBe('E');expect(b.graph.nodes.find(n=>n.kind==='gate')?.threshold).toBe('independent');
  });
  it('archives and restores with dependencies retained, and blocks unrepaired deletion',async()=>{
    await asUser(BOB);let b=await read();const graph=structuredClone(b.graph),stage=graph.nodes.find(n=>n.origin==='server')!;stage.archived=true;
    expect((await mutate('graph',b.revisions.curriculum,{graph})).ok).toBe(true);b=await read();
    expect(b.graph.nodes.find(n=>n.kind==='gate')!.prerequisites).toContain(stage.id);
    expect(b.graph.nodes.find(n=>n.kind==='gate')!.placed).toBe(true);
    const missing=structuredClone(b.graph);missing.nodes=missing.nodes.filter(n=>n.id!==stage.id);missing.edges=missing.edges.filter(e=>e.source!==stage.id&&e.target!==stage.id);
    await expect(mutate('graph',b.revisions.curriculum,{graph:missing})).rejects.toThrow(/Repair gate/);
    const restored=structuredClone(b.graph);restored.nodes.find(n=>n.id===stage.id)!.archived=false;
    expect((await mutate('graph',b.revisions.curriculum,{graph:restored})).ok).toBe(true);expect((await read()).graph.edges).toEqual(b.graph.edges);
  });
  it('cannot activate a gate draft without prerequisites by connecting it',async()=>{
    await asUser(ALICE);const a=await read(),graph=structuredClone(a.graph),gate=graph.nodes.find(n=>n.kind==='gate')!;
    const draft={...gate,id:randomUUID(),origin:null,code:null,placed:false,prerequisites:[]};graph.nodes.push(draft);
    graph.edges.push({source:graph.nodes[0].id,target:draft.id});
    await expect(mutate('graph',a.revisions.curriculum,{graph})).rejects.toThrow(/prerequisite/i);
    expect((await read()).graph).toEqual(a.graph);
  });
  it('rejects duplicate connections, cross-account endpoints, oversized content and missing reset confirmation',async()=>{
    await asUser(ALICE);const a=await read();await asUser(BOB);const b=await read();
    const duplicate=structuredClone(b.graph);duplicate.edges.push(duplicate.edges[0]);await expect(mutate('graph',b.revisions.curriculum,{graph:duplicate})).rejects.toThrow(/duplicate/);
    const cross=structuredClone(b.graph);cross.edges.push({source:b.graph.nodes[0].id,target:a.graph.nodes[0].id});await expect(mutate('graph',b.revisions.curriculum,{graph:cross})).rejects.toThrow(/foreign key/);
    const tooLong=structuredClone(b.graph);tooLong.nodes[0].content.action='a'.repeat(4001);await expect(mutate('graph',b.revisions.curriculum,{graph:tooLong})).rejects.toThrow(/Invalid content/);
    await expect(mutate('reset',b.revisions.curriculum,{learningRevision:b.revisions.learning,uiRevision:b.revisions.ui})).rejects.toThrow(/confirmation/);
    expect((await read()).graph).toEqual(b.graph);
  });
  it('previews imports without applying them, keeps source text literal, and checks preview revisions',async()=>{
    await asUser(ALICE);const a=await read(),stage=a.graph.nodes[0].id,text='語\n<img src=x onerror=alert(1)>';
    const bundle={notes:{[stage]:text},mastery:{[stage]:{understand:'independent',execute:'practicing',explain:'practicing'}}};
    const preview=(await db.query<{p:{id:string;fields:any[]}}>('select public.vesserith_preview_import($1::jsonb) p',[JSON.stringify(bundle)])).rows[0].p;
    expect((await read()).learning.notes[stage].value).toBe('');expect(preview.fields.find(f=>f.key===`note:${stage}`).incoming).toBe(text);
    await asUser(BOB);await expect(db.query('select public.vesserith_commit_import($1,$2::jsonb,$3)',[preview.id,JSON.stringify({[`note:${stage}`]:true}),randomUUID()])).rejects.toThrow(/expired or unavailable/);
    await asUser(ALICE);const requestId=randomUUID(),choices=JSON.stringify({[`note:${stage}`]:true});
    const first=(await db.query<{r:MutationResult}>('select public.vesserith_commit_import($1,$2::jsonb,$3) r',[preview.id,choices,requestId])).rows[0].r;
    const again=(await db.query<{r:MutationResult}>('select public.vesserith_commit_import($1,$2::jsonb,$3) r',[preview.id,choices,requestId])).rows[0].r;
    expect(first).toEqual(again);expect(first.ok).toBe(true);expect((await read()).learning.notes[stage].value).toBe(text);
    const p2=(await db.query<{p:{id:string}}>('select public.vesserith_preview_import($1::jsonb) p',[JSON.stringify({...bundle,notes:{[stage]:''}})])).rows[0].p;
    await mutate('note',(await read()).learning.notes[stage].revision,{stage,value:'newer'});
    const stale=(await db.query<{r:MutationResult}>('select public.vesserith_commit_import($1,$2::jsonb,$3) r',[p2.id,choices,randomUUID()])).rows[0].r;expect(stale).toMatchObject({ok:false,code:'conflict'});
  });
  it('returns only changed slices and rejects malformed durable UI state',async()=>{
    await asUser(ALICE);const a=await read();const unchanged=(await db.query<{s:unknown}>('select public.vesserith_read($1::jsonb) s',[JSON.stringify(a.revisions)])).rows[0].s;
    expect(unchanged).toEqual({curriculumId:a.curriculumId,revisions:a.revisions});
    await expect(mutate('ui',a.revisions.ui,{value:{...a.ui,lens:null}})).rejects.toThrow(/Invalid UI/);
    await expect(mutate('ui',a.revisions.ui,{value:{...a.ui,concept:{...a.ui.concept,step:1.5}}})).rejects.toThrow(/Invalid concept/);
  });
  it('rejects simultaneous topology edits and stale reset previews, then resets only the confirmed account',async()=>{
    await asUser(ALICE);const untouched=await read();await asUser(BOB);let b=await read();
    const changed=structuredClone(b.graph);changed.nodes[0].title='New topology revision';
    expect((await mutate('graph',b.revisions.curriculum,{graph:changed})).ok).toBe(true);
    expect(await mutate('graph',b.revisions.curriculum,{graph:b.graph})).toMatchObject({ok:false,code:'conflict'});
    b=await read();const stage=b.graph.nodes.find(n=>n.kind==='stage')!.id;
    await mutate('note',b.learning.notes[stage].revision,{stage,value:'Do not erase a newer note'});
    await expect(mutate('reset',b.revisions.curriculum,{confirmation:'RESET MY TRAIL',learningRevision:b.revisions.learning,uiRevision:b.revisions.ui})).rejects.toThrow(/stale/);
    b=await read();const requestId=randomUUID(),payload={confirmation:'RESET MY TRAIL',learningRevision:b.revisions.learning,uiRevision:b.revisions.ui};
    const result=await mutate('reset',b.revisions.curriculum,payload,requestId);
    expect(result.ok).toBe(true);expect(await mutate('reset',b.revisions.curriculum,payload,requestId)).toEqual(result);
    const reset=await read();expect(reset.graph.nodes).toHaveLength(11);expect(Object.values(reset.learning.notes).every(n=>n.value==='')).toBe(true);
    await asUser(ALICE);expect(await read()).toEqual(untouched);
  });
});
