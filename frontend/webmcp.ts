import { activeNodes,gateState,LEVELS,nextWaypoint,SIGNALS,type Signal } from './domain';
import type { AccountStore } from './store';
export function progressSnapshot(store:AccountStore){
  const {state,ui}=store.getSnapshot();if(!state)throw new Error('Authentication and account loading required.');
  const stages=activeNodes(state.graph).filter(n=>n.kind==='stage'),gates=activeNodes(state.graph).filter(n=>n.kind==='gate'),gateA=gates.find(n=>n.code==='A'),current=nextWaypoint(state);
  const totals=SIGNALS.map(s=>stages.reduce((sum,n)=>sum+LEVELS.indexOf(state.learning.mastery[n.id]?.[s]?.value??'not_yet'),0));
  return {version:1,activeLens:ui.lens,currentWaypoint:current?{id:current.id,...(current.kind==='stage'?{index:String(stages.indexOf(current)).padStart(2,'0')} : {}),title:current.title}:null,
    gateReady:gateA?gateState(gateA,state.graph,state.learning).ready:null,bottleneck:SIGNALS[totals.indexOf(Math.min(...totals))],
    stages:Object.fromEntries(stages.map(n=>[n.id,Object.fromEntries(SIGNALS.map(s=>[s,state.learning.mastery[n.id]?.[s]?.value??'not_yet']))])),
    gates:Object.fromEntries(gates.map(n=>[n.id,{code:n.code,...gateState(n,state.graph,state.learning)}])),revisions:state.revisions};
}
export function toolsFor(store:AccountStore){return [
  {name:'get_learning_progress',title:'Get Vesserith progress',description:'Read authenticated private trail progress and gate readiness. Notes are excluded.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async(input:unknown={})=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new TypeError('No input fields expected.');await store.forceRefresh();return progressSnapshot(store);}},
  {name:'set_stage_mastery',title:'Set Vesserith mastery',description:'Update one or more mastery signals on an authenticated private stage.',inputSchema:{type:'object',properties:{stageId:{type:'string'},...Object.fromEntries(SIGNALS.map(s=>[s,{type:'string',enum:LEVELS}]))},required:['stageId'],anyOf:SIGNALS.map(s=>({required:[s]})),additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{
    if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Input must be an object.');const v=input as Record<string,unknown>;
    for(const key of Object.keys(v))if(key!=='stageId'&&!SIGNALS.includes(key as Signal))throw new TypeError(`Unknown field: ${key}.`);
    const stage=store.getSnapshot().state?.graph.nodes.find(n=>n.id===v.stageId&&n.kind==='stage'&&!n.archived);if(!stage)throw new TypeError('stageId is not recognized.');
    const updates=SIGNALS.filter(s=>Object.hasOwn(v,s));if(!updates.length)throw new TypeError('Provide at least one mastery signal.');
    for(const s of updates)if(!LEVELS.includes(v[s] as any))throw new TypeError(`${s} has an invalid level.`);
    if(updates.length===1)await store.mastery(stage.id,updates[0],v[updates[0]] as typeof LEVELS[number]);
    else await store.masteryBatch(stage.id,Object.fromEntries(updates.map(s=>[s,v[s]])) as Partial<Record<Signal,typeof LEVELS[number]>>);
    return progressSnapshot(store);
  }}
];}
export function registerWebMCP(store:AccountStore){
  const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void;unregisterTool?:(name:string)=>void}}).modelContext;
  if(!context)return()=>{};const lifecycle=new AbortController();
  for(const tool of toolsFor(store)){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser API; no authentication bypass. */}}
  return()=>{lifecycle.abort();for(const tool of toolsFor(store))context.unregisterTool?.(tool.name);};
}
