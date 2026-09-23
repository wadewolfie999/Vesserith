import { createRoot } from 'react-dom/client';
import { Component,type ReactNode } from 'react';
import { App } from './App';
import './style.css';
class ErrorBoundary extends Component<{children:ReactNode},{error:boolean}>{
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<main className="loading-shell"><h1>Vesserith could not open this view</h1><p>Your account data and recovery drafts have not been reset. Reload after checking the connection.</p><button onClick={()=>location.reload()}>Reload safely</button></main>:this.props.children;}
}
const motion=matchMedia('(prefers-reduced-motion: reduce)');
motion.addEventListener('change',()=>{if(motion.matches)document.getAnimations().forEach(a=>a.cancel());});
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
