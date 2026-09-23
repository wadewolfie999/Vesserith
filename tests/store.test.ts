import { describe,it,expect,afterEach } from 'vitest';
import { AccountStore,type StorageLike } from '../frontend/store';
import type { AccountService } from '../frontend/service';
import { ServiceError } from '../frontend/service';
import { defaultUI,type Snapshot,type Operation } from '../frontend/domain';
import { prepareImport } from '../frontend/imports';
import { toolsFor } from '../frontend/webmcp';
const stores:AccountStore[]=[];afterEach(()=>{stores.splice(0).forEach(s=>s.stop());});
function fixture():Snapshot{return {curriculumId:'test-curriculum',revisions:{curriculum:1,learning:1,ui:1},graph:{nodes:[{id:'stage-1',kind:'stage',origin:'ground',code:null,title:'Ground',content:{},order:0,x:10,y:70,placed:true,archived:false,threshold:'practicing',prerequisites:[]}],edges:[]},learning:{mastery:{'stage-1':{understand:{value:'not_yet',revision:1},execute:{value:'not_yet',revision:1},explain:{value:'not_yet',revision:1}}},notes:{'stage-1':{value:'',revision:1}}},ui:{...defaultUI(),selected:'stage-1'}};}
class MemoryStorage implements StorageLike {values=new Map<string,string>();fail=false;getItem(k:string){if(this.fail)throw new Error('blocked');return this.values.get(k)??null;}setItem(k:string,v:string){if(this.fail)throw new Error('quota');this.values.set(k,v);}removeItem(k:string){this.values.delete(k);}}
function service(){let state=fixture(),offline=false,expired=false,loseAck=false;const responses=new Map<string,unknown>();const api:AccountService={bootstrap:async()=>structuredClone(state),read:async()=>{if(offline)throw new TypeError('Failed to fetch');return structuredClone(state);},mutate:async(op:Operation)=>{
  if(offline)throw new TypeError('Failed to fetch');if(expired)throw new ServiceError('JWT expired',true);if(responses.has(op.requestId))return responses.get(op.requestId) as any;
  if(op.kind==='mastery_batch'){
    const fields=state.learning.mastery[op.payload.stage as string],updates=op.payload.updates as Record<'understand'|'execute'|'explain',{value:any;revision:number}>;
    if(Object.entries(updates).some(([s,f])=>fields[s as keyof typeof fields].revision!==f.revision))return {ok:false,code:'conflict',message:'Changed',current:structuredClone(fields),revision:state.revisions.learning};
    for(const [s,f] of Object.entries(updates)){fields[s as keyof typeof fields]={value:f.value,revision:f.revision+1};}state.revisions.learning++;
    const result={ok:true as const,revisions:{...state.revisions}};responses.set(op.requestId,result);return result;
  }
  const field=op.kind==='note'?state.learning.notes[op.payload.stage as string]:op.kind==='mastery'?state.learning.mastery[op.payload.stage as string][op.payload.signal as 'understand']:null;
  const revision=field?.revision??state.revisions.ui;if(revision!==op.expected)return {ok:false,code:'conflict',message:'Changed',current:field?.value??state.ui,revision};
  if(field){field.value=op.payload.value as any;field.revision++;state.revisions.learning++;}else if(op.kind==='ui'){state.ui=op.payload.value as any;state.revisions.ui++;}
  const result={ok:true as const,revisions:{...state.revisions}};responses.set(op.requestId,result);if(loseAck){loseAck=false;throw new TypeError('Network lost acknowledgment');}return result;
},previewImport:async()=>{throw new Error('not used');},commitImport:async()=>{throw new Error('not used');}};
return {api,get state(){return state;},offline:(v:boolean)=>offline=v,expired:(v:boolean)=>expired=v,loseAck:()=>loseAck=true};}
async function setup(s=service(),storage=new MemoryStorage(),user='alice'){const store=new AccountStore(user,s.api,storage);stores.push(store);await store.start();await store.flush();return {store,s,storage};}
describe('Account recovery and sync (isolated service stub)',()=>{
  it('never overwrites an unreadable recovery entry when closing or saving new work',async()=>{
    const storage=new MemoryStorage(),key='vesserith.recovery.v1:alice:test-curriculum';
    const damaged=JSON.stringify({version:1,user:'alice',curriculum:'test-curriculum',drafts:{},queue:[{operation:null}]});
    storage.values.set(key,damaged);const {store,s}=await setup(service(),storage);
    store.draft('stage-1','new account save');await store.flush();store.stop();
    expect(storage.getItem(key)).toBe(damaged);expect(s.state.learning.notes['stage-1'].value).toBe('new account save');
  });
  it('retains navigation changed immediately before the store closes',async()=>{
    const {store,s,storage}=await setup();store.updateUI({lens:'explain'});store.stop();
    const restored=await setup(s,storage);await restored.store.flush();
    expect(s.state.ui.lens).toBe('explain');
  });
  it('queues a multi-signal WebMCP operation as one atomic request',async()=>{
    const {store,s}=await setup(),calls:Operation[]=[],mutate=s.api.mutate;s.api.mutate=async op=>{calls.push(structuredClone(op));return mutate(op);};
    const result=await toolsFor(store)[1].execute({stageId:'stage-1',understand:'independent',execute:'practicing'});
    expect(calls.filter(c=>c.kind==='mastery_batch')).toHaveLength(1);expect(calls.some(c=>c.kind==='mastery')).toBe(false);
    expect(result.stages['stage-1']).toMatchObject({understand:'independent',execute:'practicing',explain:'not_yet'});
  });
  it('retains an entire conflicted mastery batch for explicit review and retry',async()=>{
    const {store,s}=await setup();s.state.learning.mastery['stage-1'].execute={value:'independent',revision:2};s.state.revisions.learning++;
    await expect(store.masteryBatch('stage-1',{understand:'practicing',execute:'practicing'})).rejects.toThrow(/not saved/);
    expect(s.state.learning.mastery['stage-1'].understand.value).toBe('not_yet');
    const pending=store.getSnapshot().queue[0];expect(pending.conflict).toBeTruthy();
    await store.resolveOperation(pending.operation.requestId,true);
    expect(s.state.learning.mastery['stage-1'].understand.value).toBe('practicing');expect(s.state.learning.mastery['stage-1'].execute.value).toBe('practicing');
  });
  it('saves literal note drafts, including intentional clearing',async()=>{const {store,s}=await setup();store.draft('stage-1','سلام\n<script>literal</script>');expect(await store.flush()).toBe(true);expect(s.state.learning.notes['stage-1'].value).toContain('<script>');store.draft('stage-1','');await store.flush();expect(s.state.learning.notes['stage-1'].value).toBe('');});
  it('retains offline drafts across reload and retries without changing account',async()=>{const {store,s,storage}=await setup();s.offline(true);store.draft('stage-1','unsent');expect(await store.flush()).toBe(false);expect(store.getSnapshot().status).toBe('Offline — changes waiting');store.stop();s.offline(false);const second=await setup(s,storage);await second.store.flush();expect(s.state.learning.notes['stage-1'].value).toBe('unsent');const other=await setup(service(),storage,'bob');expect(other.store.note('stage-1')).toBe('');});
  it('uses the same request ID after a lost acknowledgment',async()=>{const {store,s}=await setup();s.loseAck();store.draft('stage-1','exactly once');await store.flush();await store.flush();expect(s.state.learning.notes['stage-1'].revision).toBe(2);expect(store.getSnapshot().drafts).toEqual({});});
  it('does not replace focused navigation and detects edits based on an older focused note',async()=>{const {store,s}=await setup();store.setBusy('note',true);s.state.ui.lens='explain';s.state.revisions.ui++;s.state.learning.notes['stage-1']={value:'another browser',revision:2};s.state.revisions.learning++;await store.refresh();expect(store.getSnapshot().ui.lens).toBe('overview');store.draft('stage-1','my older buffer',1);await store.flush();expect(store.getSnapshot().drafts['stage-1'].conflict?.value).toBe('another browser');await store.resolveNote('stage-1','combined');expect(s.state.learning.notes['stage-1'].value).toBe('combined');store.setBusy('note',false);expect(store.getSnapshot().ui.lens).toBe('explain');});
  it('retains text and reports draft-storage failure, retrying storage next time',async()=>{const {store,s,storage}=await setup();storage.fail=true;s.offline(true);store.draft('stage-1','keep open');await store.flush();expect(store.getSnapshot().draftFailure).toBe(true);expect(store.note('stage-1')).toBe('keep open');storage.fail=false;s.offline(false);await store.flush();expect(store.getSnapshot().status).toBe('Saved to your account');});
  it('stops writes after expiry and resumes only in the same store identity',async()=>{const {store,s}=await setup();s.expired(true);store.draft('stage-1','recovery');await store.flush();expect(store.getSnapshot().expired).toBe(true);expect(store.note('stage-1')).toBe('recovery');s.expired(false);store.reauthenticated();await store.flush();expect(s.state.learning.notes['stage-1'].value).toBe('recovery');});
  it('does not transmit unfinished composition',async()=>{const {store,s}=await setup();store.setBusy('composition',true);store.draft('stage-1','composing');await store.flush();expect(s.state.learning.notes['stage-1'].value).toBe('');store.setBusy('composition',false);await store.flush();expect(s.state.learning.notes['stage-1'].value).toBe('composing');});
  it('preserves a rejected note with an actionable status, then permits a corrected save',async()=>{
    const {store,s}=await setup(),mutate=s.api.mutate;
    s.api.mutate=async op=>{if(op.kind==='note'&&op.payload.value==='oversized')throw new ServiceError('Notes must be text up to 256 KiB');return mutate(op);};
    store.draft('stage-1','oversized');expect(await store.flush()).toBe(false);await store.refresh();
    expect(store.getSnapshot().status).toBe('Not saved — Notes must be text up to 256 KiB');expect(store.note('stage-1')).toBe('oversized');
    store.draft('stage-1','corrected');expect(await store.flush()).toBe(true);expect(store.getSnapshot().status).toBe('Saved to your account');
  });
  it('does not erase pending text when its stage is permanently removed elsewhere',async()=>{
    const {store,s}=await setup();store.draft('stage-1','orphan recovery');delete s.state.learning.notes['stage-1'];s.state.revisions.learning++;await store.refresh();await store.flush();
    expect(store.getSnapshot().status).toMatch(/Not saved.*deleted stage/);expect(store.export().recovery.drafts['stage-1'].value).toBe('orphan recovery');
  });
  it('exports recovery text rather than silently exporting only the older saved note',async()=>{const {store,s}=await setup();s.offline(true);store.draft('stage-1','not saved yet');await store.flush();const prepared=prepareImport(store.export(),fixture());expect(prepared.notes['stage-1']).toBe('not saved yet');});
  it('keeps WebMCP names, rejects malformed input, and excludes notes (stub)',async()=>{const {store}=await setup();const tools=toolsFor(store);expect(tools.map(t=>t.name)).toEqual(['get_learning_progress','set_stage_mastery']);await expect(tools[1].execute({stageId:'other',understand:'independent'})).rejects.toThrow(/not recognized/);await expect(tools[1].execute({stageId:'stage-1',unknown:'x'})).rejects.toThrow(/Unknown field/);await expect(tools[1].execute({stageId:'stage-1'})).rejects.toThrow(/at least/);await expect(tools[1].execute({stageId:'stage-1',understand:'mastered'})).rejects.toThrow(/invalid level/);const result=await tools[1].execute({stageId:'stage-1',understand:'independent'});expect(result.stages['stage-1'].understand).toBe('independent');expect(result).not.toHaveProperty('notes');expect(result.gateReady).toBeNull();});
});
