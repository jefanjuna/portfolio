// Centre each complete caption between the header and experience controls.
// Measure the loaded font and the whole block, rather than fixing its top edge.
export function createSceneLayout(panels,root){
 const touch=matchMedia('(hover: none), (pointer: coarse)'),contents=panels.map(panel=>{const content=document.createElement('div');content.className='scene-content';while(panel.firstChild)content.append(panel.firstChild);panel.append(content);return content;});
 let frame=0,disposed=false;
 function fit(){frame=0;if(disposed)return;const header=document.querySelector('.masthead').getBoundingClientRect(),hud=document.querySelector('.hud').getBoundingClientRect(),top=Math.max(64,header.bottom+18),bottom=Math.max(top+100,Math.min(innerHeight-64,hud.top-22)),space=bottom-top;
  root.dataset.layoutWidth=String(innerWidth);root.dataset.layoutHeight=String(innerHeight);
  root.style.setProperty('--scene-center',`${(top+bottom)/2}px`);
  contents.forEach(content=>{const scale=Math.min(1,space/(content.offsetHeight+24));content.style.setProperty('--scene-scale',scale.toFixed(4));});
 }
 function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(fit);}
 function inputMode(){root.classList.toggle('touch-input',touch.matches);schedule();}
 const observer=new ResizeObserver(schedule);contents.forEach(content=>observer.observe(content));observer.observe(document.querySelector('.masthead'));observer.observe(document.querySelector('.hud'));
 touch.addEventListener('change',inputMode);addEventListener('resize',schedule);document.fonts?.ready.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);inputMode();schedule();
 return{fit,dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();touch.removeEventListener('change',inputMode);removeEventListener('resize',schedule);document.fonts?.removeEventListener('loadingdone',schedule);}};
}
