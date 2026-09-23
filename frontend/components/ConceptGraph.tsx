import { useLayoutEffect, useRef, useState } from 'react';
import { CONCEPT_VIEWS,CONCEPT_PARTICIPANTS,CONCEPT_STEPS,GRAPH_EDGES,STEP_MESSAGES } from '../concept-content';
import type { UIState } from '../domain';
import { Modal } from './Modal';
type Selection=UIState['concept'];
const activeEdges=[['host-client','protocol'],['protocol'],['protocol','publish'],['model-host','host-client','protocol'],['publish','dispatch'],['dispatch','publish','protocol','host-client','model-host'],['protocol','host-client']];
type EdgeDrawing={id:string;path:string;x:number;y:number};
export function ConceptGraph({selection,update,onWrite}:{selection:Selection;update:(p:Selection)=>void;onWrite:()=>void}){
  const surface=useRef<HTMLDivElement>(null),[drawings,setDrawings]=useState<EdgeDrawing[]>([]);
  const {view,step,participant,open}=selection;
  const participants=CONCEPT_PARTICIPANTS as unknown as Record<string,Record<string,{label:string;what:string;owns:string;role:string}>>;
  const edges=GRAPH_EDGES as Record<string,{from:string;to:string;label:string;what:string;owns:string;role:string}>;
  const definition=participants[participant]?.[view]??participants[participant]?.lab??edges[participant]??participants.application[view];
  const selectedTitle='label' in definition?definition.label:participant;
  useLayoutEffect(()=>{
    if(!open)return;const element=surface.current!;let frame=0;
    const draw=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const bounds=element.getBoundingClientRect(),next:EdgeDrawing[]=[];
      for(const [id,e] of Object.entries(edges)){
        const from=element.querySelector<HTMLElement>(`[data-participant="${e.from}"]`),to=element.querySelector<HTMLElement>(`[data-participant="${e.to}"]`);if(!from||!to)continue;
        const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
        const across=b.left>a.right+30;
        let x1=across?a.right-bounds.left:a.left+a.width/2-bounds.left,y1=across?a.top+a.height/2-bounds.top:a.bottom-bounds.top;
        let x2=across?b.left-bounds.left:b.left+b.width/2-bounds.left,y2=across?b.top+b.height/2-bounds.top:b.top-bounds.top;
        // Results travel back through the same ownership boundaries; don't invent a shutdown message.
        if(step===5){[x1,x2]=[x2,x1];[y1,y2]=[y2,y1];}
        const midX=(x1+x2)/2,midY=(y1+y2)/2;
        next.push({id,path:across?`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`:`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`,x:midX,y:midY});
      }setDrawings(next);
    });};
    const observer=new ResizeObserver(draw);observer.observe(element);element.querySelectorAll('button').forEach(b=>{if(b.dataset.participant)observer.observe(b);});draw();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[open,view,step]);
  const node=(id:string,detail:string)=>{const d=participants[id]?.[view]??participants[id]?.lab;return <button data-participant={id} aria-pressed={participant===id} className={`concept-node ${CONCEPT_STEPS[step].participants.some(p=>p===id)?'in-step':''}`} onClick={()=>update({...selection,participant:id})}><strong>{d.label}</strong><span>{detail}</span><small>{CONCEPT_STEPS[step].participants.some(p=>p===id)?'◆ In this step':'○ Participant'}</small></button>;};
  return <Modal open={open} title="Follow one call through the system" className="concept-modal" onClose={()=>update({...selection,open:false})}>
    <div className="concept-top"><div className="segmented" aria-label="Concept map view">{(['lab','host'] as const).map(v=><button key={v} aria-pressed={view===v} onClick={()=>update({...selection,view:v,step:0,participant:'application'})}>{CONCEPT_VIEWS[v].label}</button>)}</div><p>{CONCEPT_VIEWS[view].description}</p></div>
    <section className="walkthrough" aria-label="Guided add call"><div aria-live="polite" aria-atomic="true"><span className="eyebrow">STEP {step+1} / 7 · add(2, 3)</span><h3>{CONCEPT_STEPS[step].title}</h3><p>{CONCEPT_STEPS[step].description}</p></div><nav aria-label="Walkthrough controls"><button disabled={!step} onClick={()=>update({...selection,step:step-1})}>Previous</button><button onClick={()=>update({...selection,step:0})}>Restart</button><button className="primary" disabled={step===6} onClick={()=>update({...selection,step:step+1})}>Next →</button></nav></section>
    <div className="concept-layout"><section className="graph-surface"><p className="eyebrow">SYSTEM VIEW · Select a node or connection</p><p className="graph-key">◎ White outline: selection · ◆ Yellow: active step</p>
      <div className={`system-graph ${view}`} ref={surface}>
        <svg className="system-edges" aria-hidden="true"><defs><marker id="concept-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1 9 5 1 9" fill="none" stroke="context-stroke" strokeWidth="1.6"/></marker></defs>{drawings.map(e=><path key={e.id} d={e.path} markerEnd="url(#concept-arrow)" className={`${activeEdges[step].includes(e.id)?'active':''} ${e.id==='dependency'?'optional':''}`}/>)}</svg>
        {view==='host'&&<div className="model-region">{node('model','Separate participant · local or remote')}</div>}
        <section className="ownership application-region" aria-label="Application ownership"><p className="region-label">{view==='lab'?'PYTHON APPLICATION':'AI HOST APPLICATION'}</p>{node('application','Program flow · policy · lifecycle')}{node('client','One session with this server')}</section>
        <section className="ownership server-region" aria-label="Server ownership"><p className="region-label">SERVER PROCESS</p>{node('server','Advertised capability boundary')}{node('tool','add · name + input description')}{node('function','def add(a, b): return a + b')}</section>
        <div className="data-region">{node('data','Optional · not used by add')}</div>
        {drawings.map(e=><button key={e.id} style={{left:e.x,top:e.y}} className={`edge-label ${activeEdges[step].includes(e.id)?'in-step':''}`} aria-pressed={participant===e.id} onClick={()=>update({...selection,participant:e.id})}>{e.id==='protocol'?STEP_MESSAGES[step]:edges[e.id].label}</button>)}
      </div>
      <details><summary>Read the relationships as text</summary><p>{CONCEPT_VIEWS[view].summary}</p><ul>{Object.entries(edges).filter(([id])=>view==='host'||id!=='model-host').map(([id,e])=><li key={id}><button className="text-button" onClick={()=>update({...selection,participant:id})}>{e.what}</button></li>)}</ul></details>
    </section><aside className="concept-inspector"><p className="eyebrow">YOUR SELECTION</p><h3>{selectedTitle}</h3><dl><dt>What it is</dt><dd>{definition.what}</dd><dt>What it owns</dt><dd>{definition.owns}</dd><dt>In this example</dt><dd>{definition.role}</dd></dl></aside></div>
    <section className="concept-background" aria-label="Explore concepts">
      <details><summary>Tools · things to do</summary><p>A named action with a description and input schema. Discover it with tools/list and request it with tools/call. The server validates and dispatches it; the Python function implements the arithmetic.</p></details>
      <details><summary>Resources · context to read</summary><p>Addressable content a server exposes, such as a document or record. Reading context is distinct from invoking an action. This lab needs no resource.</p></details>
      <details><summary>Prompts · templates to reuse</summary><p>Server-provided interaction templates with optional arguments. They are neither the model nor implementation code. This lab does not need one.</p></details>
      <details><summary>Host · the coordinator</summary><p>The host creates clients, handles permissions, coordinates the model, dispatches calls, and returns results. The client owns its protocol session; the server owns its exposed capabilities. Your plain Python lab needs no AI model.</p></details>
    </section>
    <footer className="concept-footer"><p>Illustrative local stdio lab using the classic initialization lifecycle. This diagram does not execute a server or claim all protocol versions share this lifecycle. <a href="https://modelcontextprotocol.io/specification/2025-11-25/architecture" target="_blank" rel="noreferrer">MCP architecture</a> · <a href="https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle" target="_blank" rel="noreferrer">Versioned lifecycle</a></p><button className="primary" onClick={onWrite}>Write this in my words →</button></footer>
  </Modal>;
}
