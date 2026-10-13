/* Drop-in magnetic theme switch. No framework or dependencies. */
(() => {
 const button=document.querySelector('[data-theme-switch]');
 if(!button)return;
 const knob=button.querySelector('.theme-switch__knob');
 let reduced=button.dataset.jdMotion==='reduced'||(matchMedia('(prefers-reduced-motion: reduce)').matches&&button.dataset.jdMotion!=='full');
 const storageKey='jd-ui-theme';
 let theme,position=0,velocity=0,hoverOffset=0,drag=null,lastFrame=null,accumulator=0;
 let remembered;try{remembered=localStorage.getItem(storageKey)}catch{}
 const initial=remembered==='light'||remembered==='dark'?remembered:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
 const travel=()=>button.clientWidth-knob.offsetWidth-16;
 const clamp=(value,a,b)=>Math.max(a,Math.min(b,value));
 function apply(next,persist=true){
  const changed=theme!==next;theme=next;
  document.documentElement.dataset.theme=next;button.dataset.theme=next;
  button.setAttribute('aria-checked',String(next==='dark'));
  button.setAttribute('aria-label','Dunkler Modus');
  if(persist)try{localStorage.setItem(storageKey,next)}catch{}
  if(changed)button.dispatchEvent(new CustomEvent('themechange',{bubbles:true,detail:{theme:next}}));
  if(reduced){position=next==='dark'?travel():0;velocity=0;paint()}
 }
 function paint(){knob.style.transform=`translate3d(${position.toFixed(3)}px,0,0)`}
 function step(dt){
  const target=drag?drag.target:(theme==='dark'?travel():0)+hoverOffset;
  if(reduced){position=target;velocity=0;return}
  velocity+=(target-position)*300*dt;velocity*=Math.exp(-15*dt);position+=velocity*dt;
 }
 function frame(time){
  if(lastFrame===null)lastFrame=time;accumulator+=Math.min((time-lastFrame)/1000,.1);lastFrame=time;
  while(accumulator>=1/120){step(1/120);accumulator-=1/120}
  paint();requestAnimationFrame(frame);
 }
 button.addEventListener('pointermove',event=>{
  const bounds=button.getBoundingClientRect(),local=event.clientX-bounds.left;
  if(drag){
   drag.target=clamp(local-drag.grabOffset,0,travel());
   if(Math.abs(event.clientX-drag.startX)>5)drag.moved=true;
  }else{hoverOffset=clamp((local-(position+knob.offsetWidth/2+8))*.08,-5,5)}
 });
 button.addEventListener('pointerleave',()=>{if(!drag)hoverOffset=0});
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  const bounds=button.getBoundingClientRect();
  const local=event.clientX-bounds.left;
  drag={startX:event.clientX,target:position,grabOffset:clamp(local-position,8,knob.offsetWidth+8),moved:false};
  hoverOffset=0;button.setPointerCapture(event.pointerId);
 });
 button.addEventListener('pointerup',event=>{
  if(!drag)return;const moved=drag.moved,target=drag.target;drag=null;hoverOffset=0;
  apply(moved?(target>travel()/2?'dark':'light'):(theme==='dark'?'light':'dark'),event.isTrusted);
 });
 button.addEventListener('pointercancel',()=>{drag=null;hoverOffset=0});
 button.addEventListener('click',event=>{if(event.detail===0)apply(theme==='dark'?'light':'dark')});
 button.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();apply(event.key==='ArrowLeft'?'light':'dark')}
 });
 apply(initial,false);position=initial==='dark'?travel():0;paint();
 button.jdThemeSwitch={setMotion(enabled){reduced=!enabled;button.dataset.jdMotion=enabled?'full':'reduced'},setTheme(next,{persist=true}={}){if(next==='light'||next==='dark'){drag=null;hoverOffset=0;apply(next,persist)}},getTheme:()=>theme};
 addEventListener('resize',()=>{position=theme==='dark'?travel():0;velocity=0;hoverOffset=0;paint()});
 document.addEventListener('visibilitychange',()=>{lastFrame=null});requestAnimationFrame(frame);
})();
