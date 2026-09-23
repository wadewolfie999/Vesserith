import { LEVELS, SIGNALS, defaultUI, validUI, validateGraph, type Graph, type Snapshot, type UIState } from './domain';
export const LEGACY_IDS=['ground','model','server','client','failures','independence'];
export interface ImportBundle {graph?:Graph;notes:Record<string,string>;mastery:Record<string,Record<string,string>>;ui?:UIState}
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function prepareImport(input:unknown,current:Snapshot):ImportBundle {
  if(!object(input)||input.version!==1)throw new Error('Choose a supported Vesserith or Nightpath context export.');
  const bundle:ImportBundle={notes:{},mastery:{}};
  if(input.format==='mcp-nightpath.context.v1') {
    if(!object(input.state)||!object(input.state.notes)||!object(input.state.mastery))throw new Error('The legacy export is incomplete.');
    for(const origin of LEGACY_IDS){
      const node=current.graph.nodes.find(n=>n.origin===origin&&n.kind==='stage');
      if(!node)throw new Error(`The template stage ${origin} was deleted. Restore the template in a reviewed reset before importing this legacy file.`);
      bundle.notes[node.id]=input.state.notes[origin];bundle.mastery[node.id]=input.state.mastery[origin];
    }
    const selected=current.graph.nodes.find(n=>n.origin===input.navigation?.selectedId)?.id??current.ui.selected;
    const ui={...defaultUI(),selected,lens:input.navigation?.activeLens??'overview',tab:input.navigation?.detailTab??'brief'};
    if(!validUI(ui))throw new Error('Invalid legacy navigation.');bundle.ui=ui;
  } else if(input.format==='vesserith.context.v1') {
    if(!object(input.state)||!object(input.state.graph)||!Array.isArray(input.state.graph.nodes)||!Array.isArray(input.state.graph.edges)||!object(input.state.learning))throw new Error('The Vesserith export is incomplete.');
    let sourceGraph=structuredClone(input.state.graph) as Graph;
    for(const entry of input.recovery?.queue??[]){if(entry.operation?.kind==='graph')sourceGraph=entry.operation.payload.graph;}
    const problem=validateGraph(sourceGraph);if(problem)throw new Error(problem);
    const map=new Map<string,string>();
    for(const n of sourceGraph.nodes){const existing=current.graph.nodes.find(x=>x.id===n.id || (n.origin&&x.origin===n.origin));map.set(n.id,existing?.id??crypto.randomUUID());}
    const nodes=sourceGraph.nodes.map(n=>{
      const id=map.get(n.id)!,existing=current.graph.nodes.find(x=>x.id===id);
      return {...n,id,kind:existing?.kind??n.kind,origin:existing?.origin??null,code:existing?.code??null,prerequisites:n.prerequisites.map(p=>{const match=map.get(p);if(!match)throw new Error('Missing prerequisite in export');return match;})};
    });
    // Retain displaced account work in Trash; importing never silently deletes it.
    const retained=current.graph.nodes.filter(n=>!nodes.some(x=>x.id===n.id)).map(n=>({...n,archived:true}));
    const edges=sourceGraph.edges.map(e=>({source:map.get(e.source)!,target:map.get(e.target)!}));
    for(const e of current.graph.edges)if(retained.some(n=>n.id===e.source||n.id===e.target)&&!edges.some(x=>x.source===e.source&&x.target===e.target))edges.push(e);
    bundle.graph={nodes:[...nodes,...retained],edges};
    for(const n of sourceGraph.nodes.filter(n=>n.kind==='stage')){
      const id=map.get(n.id)!;const note=input.recovery?.drafts?.[n.id]?.value??input.state.learning.notes?.[n.id]?.value;
      bundle.notes[id]=note;bundle.mastery[id]=Object.fromEntries(SIGNALS.map(s=>[s,input.state.learning.mastery?.[n.id]?.[s]?.value]));
    }
    for(const entry of input.recovery?.queue??[]){const op=entry.operation;if(op?.kind==='mastery'){const id=map.get(op.payload.stage);if(id&&bundle.mastery[id])bundle.mastery[id][op.payload.signal]=op.payload.value;}}
    for(const entry of input.recovery?.queue??[]){const op=entry.operation;if(op?.kind==='mastery_batch'){const id=map.get(op.payload.stage);if(id&&bundle.mastery[id])for(const [s,field] of Object.entries(op.payload.updates) as [string,{value:string}][])bundle.mastery[id][s]=field.value;}}
    const ui={...input.state.ui,selected:map.get(input.state.ui?.selected)??null};if(!validUI(ui))throw new Error('Invalid exported interface state');bundle.ui=ui;
  } else throw new Error('Unsupported context format.');
  for(const [id,note] of Object.entries(bundle.notes))if(typeof note!=='string'||new TextEncoder().encode(note).length>262144)throw new Error(`Invalid or oversized note for ${id}`);
  for(const m of Object.values(bundle.mastery))if(!object(m)||Object.keys(m).length!==3||!SIGNALS.every(s=>LEVELS.includes(m[s] as any)))throw new Error('Invalid mastery in export');
  return bundle;
}
