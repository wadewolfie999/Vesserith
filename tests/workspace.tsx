import { createRoot } from 'react-dom/client';
import { Workspace } from '../frontend/App';
import { AccountStore } from '../frontend/store';
import { ServiceError,type AccountService } from '../frontend/service';
import '../frontend/style.css';
if(!import.meta.env.DEV)throw new Error('Fixture must never run in a production build');
async function call(name:string,payload:unknown={}){const r=await fetch(`http://127.0.0.1:4181/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const value=await r.json();if(!r.ok)throw new ServiceError(value.error);return value;}
const service:AccountService={bootstrap:()=>call('bootstrap'),read:known=>call('read',{known}),mutate:op=>call('mutate',op),previewImport:payload=>call('preview',payload),commitImport:(id,choices,requestId)=>call('commit',{id,choices,requestId})};
const storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const store=new AccountStore('isolated-fixture',service,storage);void store.start();
if(import.meta.hot)import.meta.hot.dispose(()=>store.stop());
createRoot(document.getElementById('fixture')!).render(<><aside style={{padding:'.5rem 1rem',background:'#463920'}}>Isolated test fixture · simulated identity · no real learner data <button onClick={()=>document.documentElement.style.fontSize=document.documentElement.style.fontSize==='32px'?'16px':'32px'}>Toggle 200% text</button></aside><Workspace store={store} identity="Test learner" onSignOut={async()=>{store.stop();}} onSignIn={()=>{}}/></>);
