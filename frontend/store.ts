import { defaultUI, type Changes, type Graph, type Level, type MutationResult, type Operation, type Signal, type Snapshot, type UIState } from './domain';
import { ServiceError, type AccountService } from './service';

interface Draft { value: string; base: number; request?: Operation; conflict?: { value: string; revision: number }; error?: string }
interface Queued { operation: Operation; conflict?: Exclude<MutationResult,{ok:true}>; error?: string }
export interface StoreView {
  state: Snapshot | null; ui: UIState; drafts: Record<string,Draft>; queue: Queued[];
  status: string; error: string; expired: boolean; draftFailure: boolean;
}
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export class AccountStore {
  private value: StoreView={state:null,ui:defaultUI(),drafts:{},queue:[],status:'Loading your account…',error:'',expired:false,draftFailure:false};
  private listeners=new Set<()=>void>();
  private stopped=false; private pumping:Promise<boolean>|null=null; private loading:Promise<void>|null=null;
  private noteTimer:ReturnType<typeof setTimeout>|undefined; private maxTimer:ReturnType<typeof setTimeout>|undefined;
  private uiTimer:ReturnType<typeof setTimeout>|undefined; private poll:ReturnType<typeof setInterval>|undefined;
  private remoteUI:UIState|null=null; private busy=new Set<string>(); private channel:BroadcastChannel|null=null;
  private key=''; private dirtyUI=false; private unreadableRecovery=false;
  constructor(readonly userId:string,readonly service:AccountService,private storage:StorageLike=localStorage){}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn); return ()=>this.listeners.delete(fn);};
  getSnapshot=()=>this.value;
  private emit(patch:Partial<StoreView>={}) { if(this.stopped)return; this.value={...this.value,...patch}; for(const fn of this.listeners)fn(); }
  private persist() {
    if(!this.key)return;
    // Do not replace a recovery entry we could not interpret with an empty queue.
    if(this.unreadableRecovery){this.emit({draftFailure:true});return;}
    try { this.storage.setItem(this.key,JSON.stringify({version:1,user:this.userId,curriculum:this.value.state!.curriculumId,drafts:this.value.drafts,queue:this.value.queue})); this.emit({draftFailure:false}); }
    catch { this.emit({draftFailure:true,status:'Draft not retained — keep this page open and export your work.'}); }
  }
  private status() {
    if(this.unreadableRecovery){this.emit({status:'Browser recovery could not be read — original copy retained. New drafts are memory-only; restore browser storage and reload.'});return;}
    const pending=Object.keys(this.value.drafts).length || this.value.queue.length || this.dirtyUI;
    const rejected=Object.values(this.value.drafts).find(d=>d.error)?.error;
    this.emit({status:this.value.draftFailure&&pending?'Draft not retained — keep this page open and export your work.':this.value.expired?'Session expired — sign in again to save':rejected?`Not saved — ${rejected}`:this.hasConflict()?'Conflict — review both versions':this.value.error?(pending?'Offline — changes waiting':'Connection unavailable — retrying'):pending?'Saving…':'Saved to your account'});
  }
  async start() {
    if(this.value.state){await this.refresh();return;}
    try {
      const state=await this.service.bootstrap(); if(this.stopped)return;
      this.key=`vesserith.recovery.v1:${this.userId}:${state.curriculumId}`;
      let drafts:Record<string,Draft>={},queue:Queued[]=[];
      try { const saved=JSON.parse(this.storage.getItem(this.key)??'null');
        if(saved?.version===1&&saved.user===this.userId&&saved.curriculum===state.curriculumId) {
          if(!saved.drafts||!Array.isArray(saved.queue))throw new Error('Invalid recovery data');
          for(const [id,d] of Object.entries(saved.drafts) as [string,Draft][]) if(typeof d.value==='string'&&Number.isInteger(d.base)&&d.base>0) drafts[id]=d; else throw new Error('Invalid recovery draft');
          for(const entry of saved.queue){
            const op=entry?.operation;
            if(!op||typeof op.requestId!=='string'||!['note','mastery','mastery_batch','graph','ui','reset'].includes(op.kind)||!Number.isSafeInteger(op.expected)||op.expected<0||!op.payload||typeof op.payload!=='object'||Array.isArray(op.payload))throw new Error('Invalid recovery operation');
          }
          queue=saved.queue;
        }
      } catch { this.unreadableRecovery=true;this.emit({draftFailure:true,error:'Browser recovery data could not be read. It has not been removed.'}); }
      this.emit({state,ui:state.ui,drafts,queue}); this.status();
      if(typeof BroadcastChannel!=='undefined') {this.channel=new BroadcastChannel(`vesserith:${this.userId}`); this.channel.onmessage=()=>{void this.refresh();};}
      this.poll=setInterval(()=>{if(typeof document==='undefined'||document.visibilityState==='visible'){void this.refresh();void this.flush();}},2000);
      if(typeof window!=='undefined'){window.addEventListener('focus',this.resume);window.addEventListener('online',this.resume);document.addEventListener('visibilitychange',this.visibility);}
      void this.flush();
    } catch(e){this.fail(e);}
  }
  private visibility=()=>{if(document.visibilityState==='visible')this.resume();else void this.flush();};
  private resume=()=>{void this.refresh();void this.flush();};
  setBusy(reason:string,on:boolean){on?this.busy.add(reason):this.busy.delete(reason);if(!this.busy.size&&this.remoteUI&&!this.dirtyUI&&!this.value.queue.some(q=>q.operation.kind==='ui')){this.emit({ui:this.remoteUI});this.remoteUI=null;}}
  private apply(change:Changes) {
    const old=this.value.state;if(!old||this.stopped)return;
    const freshGraph=change.revisions.curriculum>=old.revisions.curriculum,freshLearning=change.revisions.learning>=old.revisions.learning,freshUI=change.revisions.ui>=old.revisions.ui;
    const state={...old,revisions:{curriculum:Math.max(old.revisions.curriculum,change.revisions.curriculum),learning:Math.max(old.revisions.learning,change.revisions.learning),ui:Math.max(old.revisions.ui,change.revisions.ui)},graph:freshGraph?(change.graph??old.graph):old.graph,learning:freshLearning?(change.learning??old.learning):old.learning,ui:freshUI?(change.ui??old.ui):old.ui};
    let ui=this.value.ui;
    if(change.ui&&freshUI&&!this.dirtyUI&&!this.value.queue.some(q=>q.operation.kind==='ui')) {if(this.busy.size)this.remoteUI=change.ui;else ui=change.ui;}
    this.emit({state,ui});
  }
  refresh():Promise<void> {
    if(this.loading)return this.loading;
    if(!this.value.state||this.stopped||this.value.expired)return Promise.resolve();
    this.loading=(async()=>{try{const changes=await this.service.read(this.value.state!.revisions);this.apply(changes);this.emit({error:''});this.status();}catch(e){this.fail(e);}finally{this.loading=null;}})();
    return this.loading;
  }
  updateUI(patch:Partial<UIState>) {
    this.dirtyUI=true;this.remoteUI=null;this.emit({ui:{...this.value.ui,...patch}}); clearTimeout(this.uiTimer);
    this.uiTimer=setTimeout(()=>{this.enqueueUI();void this.flush();},250);this.status();
  }
  private enqueueUI() {
    if(!this.dirtyUI||!this.value.state)return;
    this.dirtyUI=false;
    this.value.queue.push({operation:{requestId:crypto.randomUUID(),kind:'ui',expected:this.value.state.revisions.ui,payload:{value:this.value.ui}}});this.persist();
  }
  draft(stage:string,value:string,base?:number) {
    const current=this.value.state?.learning.notes[stage];if(!current)return;
    const d=this.value.drafts[stage]??{value:current.value,base:base??current.revision};
    this.emit({drafts:{...this.value.drafts,[stage]:{...d,value,error:undefined}}});this.persist();this.status();
    clearTimeout(this.noteTimer);this.noteTimer=setTimeout(()=>{void this.flush();},300);
    if(!this.maxTimer)this.maxTimer=setTimeout(()=>{this.maxTimer=undefined;void this.flush();},2000);
  }
  note(stage:string) {return this.value.drafts[stage]?.value??this.value.state?.learning.notes[stage]?.value??'';}
  async mastery(stage:string,signal:Signal,value:Level) {
    const field=this.value.state?.learning.mastery[stage]?.[signal];if(!field)throw new Error('Stage unavailable');
    const item:Queued={operation:{requestId:crypto.randomUUID(),kind:'mastery',expected:field.revision,payload:{stage,signal,value}}};
    this.value.queue.push(item);this.persist();this.status();await this.flush();
    if(this.value.queue.includes(item))throw new Error(item.error??'Mastery change not saved. Review the pending change.');
  }
  async graph(graph:Graph,expected=this.value.state!.revisions.curriculum) {return this.enqueue('graph',expected,{graph});}
  async masteryBatch(stage:string,values:Partial<Record<Signal,Level>>) {
    const fields=this.value.state?.learning.mastery[stage];if(!fields)throw new Error('Stage unavailable');
    const updates=Object.fromEntries(Object.entries(values).map(([signal,value])=>[signal,{value,revision:fields[signal as Signal].revision}]));
    if(!(await this.enqueue('mastery_batch',this.value.state!.revisions.learning,{stage,updates})))throw new Error('Mastery changes not saved. Review the pending update.');
  }
  async enqueue(kind:string,expected:number,payload:Record<string,unknown>) {
    const item:Queued={operation:{requestId:crypto.randomUUID(),kind,expected,payload}};
    this.value.queue.push(item);this.persist();this.status();await this.flush();return !this.value.queue.includes(item);
  }
  hasConflict(){return Object.values(this.value.drafts).some(d=>d.conflict)||this.value.queue.some(q=>q.conflict||q.error);}
  async resolveNote(stage:string,value:string|null) {
    const d=this.value.drafts[stage];if(!d?.conflict)return;
    const drafts={...this.value.drafts};
    if(value===null)delete drafts[stage];else drafts[stage]={value,base:d.conflict.revision};
    this.emit({drafts});this.persist();await this.flush();
  }
  async resolveOperation(requestId:string,retry:boolean) {
    const item=this.value.queue.find(q=>q.operation.requestId===requestId);if(!item)return;
    if(retry&&item.conflict?.revision) {
      if(item.operation.kind==='mastery_batch'){
        const current=item.conflict.current as Record<string,{revision:number}>;
        const updates=item.operation.payload.updates as Record<string,{value:Level;revision:number}>;
        item.operation.payload={...item.operation.payload,updates:Object.fromEntries(Object.entries(updates).map(([s,field])=>[s,{...field,revision:current[s].revision}]))};
      }
      item.operation={...item.operation,requestId:crypto.randomUUID(),expected:item.conflict.revision};delete item.conflict;delete item.error;
    }
    else this.value.queue=this.value.queue.filter(q=>q!==item);
    this.persist();await this.flush();
  }
  flush():Promise<boolean> {
    if(this.pumping)return this.pumping;
    if(this.stopped||!this.value.state||this.value.expired)return Promise.resolve(false);
    this.enqueueUI();clearTimeout(this.noteTimer);clearTimeout(this.maxTimer);this.maxTimer=undefined;
    this.pumping=this.pump().finally(()=>{this.pumping=null;});return this.pumping;
  }
  private async pump():Promise<boolean> {
    try {
      for(const item of [...this.value.queue]) {
        if(this.stopped||this.value.expired) return false;
        if(item.conflict||item.error)continue;
        let result:MutationResult;
        try{result=await this.service.mutate(item.operation);}catch(e){if(e instanceof ServiceError&&!e.expired&&!/fetch|network|offline|timeout/i.test(e.message)){item.error=e.message;this.persist();continue;}throw e;}
        if(!result.ok){
          if(item.operation.kind==='ui'&&result.revision){
            // Navigation is last-interaction-wins, never used for learning or topology.
            this.value.queue=this.value.queue.filter(q=>q!==item);this.dirtyUI=true;
          } else item.conflict=result;
        } else this.value.queue=this.value.queue.filter(q=>q!==item);
        this.persist();await this.refresh();
      }
      for(const stage of Object.keys(this.value.drafts)) {
        if(this.stopped||this.value.expired)return false;
        if(this.busy.has('composition'))continue;
        const d=this.value.drafts[stage];if(d.conflict||d.error)continue;
        if(!this.value.state!.learning.notes[stage]){d.error='A pending note belongs to a deleted stage. Export your recovery work.';this.persist();continue;}
        d.request??={requestId:crypto.randomUUID(),kind:'note',expected:d.base,payload:{stage,value:d.value}};
        const request=d.request;this.persist();
        let result:MutationResult;
        try{result=await this.service.mutate(request);}catch(e){
          if(e instanceof ServiceError&&!e.expired&&!/fetch|network|offline|timeout/i.test(e.message)){
            const latest=this.value.drafts[stage];if(latest){delete latest.request;if(latest.value===request.payload.value)latest.error=e.message;}this.persist();continue;
          }throw e;
        }
        const latest=this.value.drafts[stage];if(!latest)continue;
        if(!result.ok)latest.conflict={value:typeof result.current==='string'?result.current:'',revision:result.revision??latest.base};
        else if(latest.value===request.payload.value)delete this.value.drafts[stage];
        else {latest.base=request.expected+1;delete latest.request;}
        this.persist();await this.refresh();
      }
      this.emit({error:''});this.channel?.postMessage('changed');this.status();
      return !Object.keys(this.value.drafts).length&&!this.value.queue.length&&!this.dirtyUI;
    }catch(e){this.persist();this.fail(e);return false;}
  }
  private fail(e:unknown){const error=e instanceof Error?e.message:String(e);this.emit({error,expired:e instanceof ServiceError&&e.expired});this.status();}
  reauthenticated(){this.emit({expired:false,error:''});this.resume();}
  async forceRefresh(){if(!this.value.state)return;const changes=await this.service.read({});this.apply(changes);this.status();}
  export() {
    if(!this.value.state)throw new Error('Account not loaded');
    return {format:'vesserith.context.v1',version:1,exportedAt:new Date().toISOString(),state:{...this.value.state,ui:this.value.ui},recovery:{drafts:this.value.drafts,queue:this.value.queue}};
  }
  stop(){this.enqueueUI();this.persist();this.stopped=true;clearInterval(this.poll);clearTimeout(this.noteTimer);clearTimeout(this.maxTimer);clearTimeout(this.uiTimer);this.channel?.close();if(typeof window!=='undefined'){window.removeEventListener('focus',this.resume);window.removeEventListener('online',this.resume);document.removeEventListener('visibilitychange',this.visibility);}this.listeners.clear();}
}
