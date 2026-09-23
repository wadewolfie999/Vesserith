import { useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { TrailNode } from '../domain';
import type { AccountStore } from '../store';
import { Modal } from './Modal';
export function Notes({stage,store,expanded,onExpand,focusToken}:{stage:TrailNode;store:AccountStore;expanded:boolean;onExpand:(b:boolean)=>void;focusToken:number}){
  const view=useSyncExternalStore(store.subscribe,store.getSnapshot),saved=view.state!.learning.notes[stage.id];
  const [text,setText]=useState(store.note(stage.id)),[review,setReview]=useState(false),[combined,setCombined]=useState('');
  const focused=useRef(false),composing=useRef(false),base=useRef(saved?.revision??1),input=useRef<HTMLTextAreaElement>(null),inline=useRef<HTMLDivElement>(null),large=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),expandButton=useRef<HTMLButtonElement>(null);
  const [host]=useState(()=>document.createElement('div'));
  const wasExpanded=useRef(false);
  const conflict=view.drafts[stage.id]?.conflict;
  useEffect(()=>{store.setBusy('expanded-note',expanded);return()=>store.setBusy('expanded-note',false);},[expanded,store]);
  useEffect(()=>{if(!focused.current&&!composing.current){setText(store.note(stage.id));base.current=view.drafts[stage.id]?.base??saved?.revision??1;}else if(saved?.value===text&&!view.drafts[stage.id])base.current=saved.revision;},[saved,view.drafts,stage.id]);
  useLayoutEffect(()=>{const textarea=input.current;const selection=textarea?{start:textarea.selectionStart,end:textarea.selectionEnd,direction:textarea.selectionDirection,scroll:textarea.scrollTop}:null;
    (expanded?large.current:inline.current)!.append(host);
    if(expanded&&!dialog.current!.open)dialog.current!.showModal();
    if(!expanded&&dialog.current!.open)dialog.current!.close();
    if(textarea&&selection){textarea.setSelectionRange(selection.start,selection.end,selection.direction);textarea.scrollTop=selection.scroll;if(expanded)textarea.focus({preventScroll:true});else if(wasExpanded.current)expandButton.current?.focus({preventScroll:true});}
    wasExpanded.current=expanded;
  },[expanded,host]);
  useEffect(()=>{if(focusToken)input.current?.focus();},[focusToken]);
  useEffect(()=>()=>{store.setBusy('note',false);store.setBusy('composition',false);void store.flush();host.remove();},[host,store]);
  return <><div className="notes-header"><p className="eyebrow">FIELD NOTES</p><button ref={expandButton} onClick={()=>onExpand(true)}>Expand ↗</button></div><div ref={inline}/>
    {createPortal(<section className="note-editor"><label htmlFor={`note-${stage.id}`}>{stage.title} — in my words</label><p id={`prompt-${stage.id}`} className="muted">What clicked? What is still unclear?</p><textarea id={`note-${stage.id}`} ref={input} aria-describedby={`prompt-${stage.id}`} value={text} rows={10}
      onFocus={()=>{focused.current=true;store.setBusy('note',true);}}
      onBlur={()=>{focused.current=false;if(!composing.current)store.setBusy('note',false);void store.flush();}}
      onCompositionStart={()=>{composing.current=true;store.setBusy('composition',true);}}
      onCompositionEnd={e=>{composing.current=false;store.setBusy('composition',false);store.draft(stage.id,e.currentTarget.value,base.current);}}
      onChange={e=>{setText(e.target.value);store.draft(stage.id,e.target.value,base.current);}}/>
      <span className="small">{new TextEncoder().encode(text).length.toLocaleString()} / 262,144 bytes</span><p role="status" className={view.draftFailure||conflict?'warning':''}>{view.status}</p>{conflict&&<button onClick={()=>{setCombined(text);setReview(true);}}>Review both versions</button>}
    </section>,host)}
    <dialog ref={dialog} className="modal expanded-note" aria-labelledby="expanded-note-title" onCancel={e=>{e.preventDefault();onExpand(false);}}><header className="dialog-heading"><h2 id="expanded-note-title">{stage.title} — in my words</h2><button onClick={()=>onExpand(false)}>Done ↙</button></header><div ref={large}/></dialog>
    <Modal open={review&&!!conflict} title="Two versions of your note" onClose={()=>setReview(false)}><p>No text has been discarded. Choose either copy, or edit a combined version.</p><div className="conflict-copies"><label>Your pending draft<textarea value={text} readOnly/><button onClick={async()=>{await store.resolveNote(stage.id,text);setReview(false);}}>Use my draft</button></label><label>Latest account copy<textarea value={conflict?.value??''} readOnly/><button onClick={async()=>{setText(conflict!.value);await store.resolveNote(stage.id,null);setReview(false);}}>Use account copy</button></label></div><label>Combined version<textarea value={combined} onChange={e=>setCombined(e.target.value)}/></label><button className="primary" onClick={async()=>{setText(combined);await store.resolveNote(stage.id,combined);setReview(false);}}>Save combined version</button></Modal>
  </>;
}
