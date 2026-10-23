// The browser draws the arrow. No pointermove handler or frame-by-frame DOM
// cursor updates compete with the 3D renderer; only press state and bursts use JS.
export function createPointer({fine,reduced}){
 const root=document.documentElement,layer=document.querySelector('#pointer-layer');
 const supported=typeof layer.showPopover==='function';
 let releaseTimer=0,pressedAt=0,downPointers=new Set();
 root.classList.add('native-pointer');
 function lift(){if(supported&&layer.matches(':popover-open')){layer.hidePopover();layer.showPopover();}}
 function release(){clearTimeout(releaseTimer);downPointers.clear();root.classList.remove('pointer-pressed');}
 function hide(){release();layer.replaceChildren();if(supported&&layer.matches(':popover-open'))layer.hidePopover();}
 function down(event){
  if(![0,2].includes(event.button)||!fine.matches||event.pointerType==='touch')return;
  clearTimeout(releaseTimer);downPointers.add(event.pointerId);pressedAt=performance.now();
  if(!reduced.matches)root.classList.add('pointer-pressed');
  if(!supported||reduced.matches)return;
  if(!layer.matches(':popover-open'))layer.showPopover();
  const count=6+Math.floor(Math.random()*10),fragment=document.createDocumentFragment();
  layer.dataset.lastBurst=JSON.stringify({x:event.clientX,y:event.clientY,count});
  for(let i=0;i<count;i++){
   const pixel=document.createElement('i'),angle=Math.random()*Math.PI*2,distance=18+Math.random()*40,duration=420+Math.random()*260,size=3+Math.floor(Math.random()*4);
   pixel.className='click-pixel';pixel.style.left=`${event.clientX}px`;pixel.style.top=`${event.clientY}px`;pixel.style.width=pixel.style.height=`${size}px`;
   pixel.style.setProperty('--dx',`${Math.round(Math.cos(angle)*distance)}px`);pixel.style.setProperty('--dy',`${Math.round(Math.sin(angle)*distance)}px`);pixel.style.animationDuration=`${duration}ms`;
   fragment.append(pixel);setTimeout(()=>pixel.remove(),duration+60);
  }
  layer.append(fragment);
 }
 function up(event){
  if(![0,2].includes(event.button))return;downPointers.delete(event.pointerId);
  if(!downPointers.size)releaseTimer=setTimeout(release,Math.max(0,100-(performance.now()-pressedAt)));
 }
 document.addEventListener('pointerdown',down,{passive:true});document.addEventListener('pointerup',up,{passive:true});document.addEventListener('pointercancel',release);
 fine.addEventListener('change',hide);reduced.addEventListener('change',hide);addEventListener('blur',hide);
 return{lift,hide,dispose(){hide();root.classList.remove('native-pointer');document.removeEventListener('pointerdown',down);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',release);fine.removeEventListener('change',hide);reduced.removeEventListener('change',hide);removeEventListener('blur',hide);}};
}
