import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
if(!import.meta.env.DEV)throw new Error('Layout fixtures are development-only');
function Layout(){
  const [width,setWidth]=useState(969),[report,setReport]=useState('');
  const frame=useRef<HTMLIFrameElement>(null);
  const measure=async()=>{
    // Let React and the measured SVG connections settle after a viewport change.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const d=frame.current!.contentDocument!,w=d.defaultView!,root=d.querySelector('dialog[open]')??d.body;
    const overflow:unknown[]=[],clipped:unknown[]=[],walker=d.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n:Node|null;
    while(n=walker.nextNode()){
      if(!n.textContent?.trim()||n.parentElement?.closest('svg,script,style,.skip-link,textarea,option'))continue;
      const range=d.createRange();range.selectNodeContents(n);
      const control=n.parentElement?.closest('.concept-node,.edge-label,.lens-switch button,.node-label'),box=control?.getBoundingClientRect();
      for(const r of range.getClientRects())if(r.width&&r.height){
        const item={text:n.textContent.trim().slice(0,80),left:r.left,right:r.right};
        if(r.left<-.5||r.right>w.innerWidth+.5)overflow.push(item);
        if(box&&(r.left<box.left-.5||r.right>box.right+.5||r.top<box.top-.5||r.bottom>box.bottom+.5))clipped.push(item);
      }
    }
    const regions=[...root.querySelectorAll('.node-label,.concept-node,.edge-label')].map(el=>({text:el.textContent!.slice(0,70),r:el.getBoundingClientRect()})).filter(x=>x.r.width&&x.r.height),overlap=[];
    for(let i=0;i<regions.length;i++)for(let j=i+1;j<regions.length;j++){
      const a=regions[i],b=regions[j];if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>.5&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>.5)overlap.push([a.text,b.text]);
    }
    setReport(JSON.stringify({width:w.innerWidth,height:w.innerHeight,font:w.getComputedStyle(d.documentElement).fontSize,scroll:d.documentElement.scrollWidth,toolbar:d.querySelector('.map-toolbar')?.getBoundingClientRect().height,overflow,clipped,overlap},null,2));
  };
  return <main style={{color:'#eee',background:'#101820',padding:12,fontFamily:'system-ui'}}>
    <h1>Isolated layout checks</h1><p>Fixed CSS-pixel frame · simulated learner · no production account</p>
    <label>Viewport <select value={width} onChange={e=>setWidth(Number(e.target.value))}><option value="1440">1440 × 1106</option><option value="969">969 × 1106</option><option value="320">320 × 1106</option></select></label>
    <button onClick={measure}>Measure visible bounds</button><pre aria-label="Layout measurements">{report}</pre>
    <iframe ref={frame} title="Isolated Vesserith workspace" src="./workspace.html" style={{display:'block',width,height:1106,border:0,marginTop:16}}/>
  </main>;
}
createRoot(document.getElementById('layout')!).render(<Layout/>);
