import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {configuredClient,createService,initializeSession} from '../frontend/service';
import type {Snapshot} from '../frontend/domain';
import '../frontend/style.css';
if(!import.meta.env.DEV)throw new Error('Account audit is development-only');
const client=configuredClient()!;
function Audit(){
  const [account,setAccount]=useState<{user:string;name:string;state:Snapshot}|null>(null),[foreign,setForeign]=useState(''),[foreignOwner,setForeignOwner]=useState(''),[report,setReport]=useState(''),[busy,setBusy]=useState(false);
  const load=async()=>{try{const session=await initializeSession(client);if(!session)throw new Error('Sign into Vesserith in this browser first.');setAccount({user:session.user.id,name:session.user.user_metadata.user_name,state:await createService(client).bootstrap()});}catch(e){setReport(String(e));}};
  useEffect(()=>{void load();},[]);
  const audit=async()=>{if(!account||!foreign||!foreignOwner)return;setBusy(true);try{
    if(account.state.graph.nodes.some(n=>n.id===foreign)||foreignOwner===account.user)throw new Error('Use a stage and user ID from the OTHER test account.');
    const read=await client.rpc('vesserith_read',{known:{owner:foreignOwner}});
    const attempts:Record<string,unknown>={account:account.name,foreignReadDenied:!read.error&&read.data.curriculumId===account.state.curriculumId&&!read.data.graph.nodes.some((n:{id:string})=>n.id===foreign)};
    const mutation=await client.rpc('vesserith_mutate',{request_id:crypto.randomUUID(),kind:'note',expected:1,payload:{owner:foreignOwner,stage:foreign,value:'Cross-account denial probe'}});
    attempts.foreignWriteDenied=!!mutation.error&&/Stage unavailable/.test(mutation.error.message);
    attempts.writeError=mutation.error?.message??'UNEXPECTED WRITE ACCEPTED — stop release';
    const direct=await client.schema('vesserith').from('notes').update({value:'Direct-write denial probe'}).eq('owner',foreignOwner).eq('stage',foreign);
    attempts.directTableWriteDenied=!!direct.error;
    attempts.directWriteError=direct.error?.code??'UNEXPECTED DIRECT WRITE ACCEPTED — stop release';
    setReport(JSON.stringify(attempts,null,2));
  }catch(e){setReport(String(e));}finally{setBusy(false);}};
  return <main className="loading-shell"><h1>Live account isolation acceptance</h1><p>Development-only test against the signed-in account. Tokens and note text are never shown. Use only the two authorized test accounts.</p>
    {account&&<dl><dt>Identity</dt><dd>{account.name}</dd><dt>User ID</dt><dd>{account.user}</dd><dt>Curriculum ID</dt><dd>{account.state.curriculumId}</dd><dt>Stage 00 ID</dt><dd>{account.state.graph.nodes.find(n=>n.origin==='ground')?.id}</dd><dt>Initial state</dt><dd>{account.state.graph.nodes.length} nodes · {Object.values(account.state.learning.notes).filter(n=>n.value!=='').length} nonempty notes · {Object.values(account.state.learning.mastery).flatMap(m=>Object.values(m)).filter(m=>m.value!=='not_yet').length} non-neutral mastery fields</dd></dl>}
    <label>Other test account user ID<input value={foreignOwner} onChange={e=>setForeignOwner(e.target.value)}/></label><label>Other test account Stage 00 ID<input value={foreign} onChange={e=>setForeign(e.target.value)}/></label>
    <button disabled={busy||!account} onClick={()=>void audit()}>Check cross-account denial</button><button onClick={()=>void load()}>Refresh own account</button><pre aria-label="Isolation results">{report}</pre>
  </main>;
}
createRoot(document.getElementById('audit')!).render(<Audit/>);
