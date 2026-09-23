// Exercises the actual application bootstrap's media-change listener, not a copy.
import '../frontend/bootstrap';
if(!import.meta.env.DEV)throw new Error('Motion acceptance is development-only');
const probe=document.createElement('aside'),start=document.createElement('button'),report=document.createElement('output');
probe.style.cssText='position:fixed;bottom:12px;left:12px;z-index:10000;background:#20323f;padding:12px;color:white';
start.textContent='Start isolated motion probe';report.setAttribute('aria-label','Motion acceptance result');
let animation:Animation|null=null;
const status=()=>{report.textContent=JSON.stringify({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,animation:animation?.playState??'none',running:document.getAnimations().filter(a=>a.playState==='running').length});};
start.onclick=()=>{animation?.cancel();animation=probe.animate([{opacity:1},{opacity:.7}],{duration:60000});status();};
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>requestAnimationFrame(status));
probe.append(start,report);document.body.append(probe);status();
