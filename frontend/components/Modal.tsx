import { useEffect, useId, useRef, type ReactNode } from 'react';
export function Modal({open,title,children,onClose,className=''}:{open:boolean;title:string;children:ReactNode;onClose:()=>void;className?:string}){
  const ref=useRef<HTMLDialogElement>(null),label=useId(),onCloseRef=useRef(onClose);onCloseRef.current=onClose;
  useEffect(()=>{const dialog=ref.current!;if(!open){if(dialog.open)dialog.close();return;}
    const trigger=document.activeElement as HTMLElement|null;dialog.showModal();
    const cancel=(e:Event)=>{e.preventDefault();onCloseRef.current();};dialog.addEventListener('cancel',cancel);
    return ()=>{dialog.removeEventListener('cancel',cancel);if(dialog.open)dialog.close();if(trigger?.isConnected)trigger.focus({preventScroll:true});};
  },[open]);
  return <dialog ref={ref} aria-labelledby={label} className={`modal ${className}`}><header className="dialog-heading"><div><p className="eyebrow">VESSERITH / OBSERVATORY</p><h2 id={label}>{title}</h2></div><button onClick={onClose} aria-label={`Close ${title}`}>Close ×</button></header>{children}</dialog>;
}
