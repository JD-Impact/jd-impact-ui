/* Download Forge: real streamed bytes, abort/error states, dependency-free UI. */
class DownloadForge {
 constructor(root,options={}){
  this.root=root;this.options=options;this.state='idle';this.received=0;this.total=null;this.progress=0;
  this.controller=null;this.reader=null;this.particles=[];this.lastTime=null;this.frameId=null;this.collapseTimer=null;this.urlTimers=new Map();this.destroyed=false;
  this.reduced=root.dataset.jdMotion==='reduced'||(matchMedia('(prefers-reduced-motion: reduce)').matches&&root.dataset.jdMotion!=='full');
  const q=selector=>root.querySelector(selector);
  this.launch=q('.forge-launch');this.label=q('.forge-launch-label');this.meta=q('.forge-launch-meta');this.percent=q('.forge-percent');this.detail=q('.forge-detail');this.cancelButton=q('.forge-cancel');this.ring=q('.forge-ring-progress');this.fill=q('.forge-file-fill');this.type=q('.forge-filetype');this.announcement=q('.forge-announcement');
  this.canvas=q('.forge-particles');this.context=this.canvas.getContext('2d');this.filename=(options.filename||'download.zip').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_');this.type.textContent=(this.filename.split('.').pop()||'FILE').slice(0,5).toUpperCase();
  this.onLaunch=()=>this.start();this.onCancel=()=>this.state==='loading'?this.abort():this.reset();
  this.launch.addEventListener('click',this.onLaunch);this.cancelButton.addEventListener('click',this.onCancel);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(root);this.resize();
  this.tick=time=>{if(this.destroyed)return;const dt=this.lastTime===null?0:Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;this.draw(dt);this.frameId=requestAnimationFrame(this.tick)};
  this.frameId=requestAnimationFrame(this.tick);this.reset();root.downloadForge=this;
 }
 bytes(value){return value<1024?`${value} B`:`${(value/1024).toFixed(1)} KB`}
 setMotion(enabled){this.reduced=!enabled;this.root.dataset.jdMotion=enabled?'full':'reduced';if(!enabled)this.particles=[]}
 setState(state){this.state=state;this.root.dataset.state=state;this.root.setAttribute('aria-busy',String(state==='loading'));this.launch.disabled=state==='loading'||state==='complete'}
 reset(){
  if(this.state==='loading')return;clearTimeout(this.collapseTimer);this.collapseTimer=null;this.setState('idle');this.received=0;this.total=null;this.progress=0;this.particles=[];
  this.label.textContent=this.options.label||'Download';this.meta.textContent='DATA / FORGE';this.percent.textContent='0%';this.percent.setAttribute('role','progressbar');this.percent.setAttribute('aria-valuenow','0');this.cancelButton.textContent='Abbrechen';this.ring.style.strokeDashoffset='100';this.fill.style.clipPath='inset(100% 0 0 0)';
 }
 resize(){const scale=Math.min(devicePixelRatio||1,2);this.width=this.root.clientWidth;this.height=this.root.clientHeight;const w=Math.round(this.width*scale),h=Math.round(this.height*scale);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;if(this.context)this.context.setTransform(scale,0,0,scale,0,0)}}
 spark(count=12,outward=false){
  if(this.reduced)return;
  for(let i=0;i<count;i++)this.particles.push({age:0,duration:.48+Math.random()*.48,angle:Math.random()*Math.PI*2,distance:70+Math.random()*80,size:.7+Math.random()*2,curve:(Math.random()-.5)*1.4,outward,color:i%3===0?'#a3e8d2':'#c6a0ee'});
 }
 draw(dt){
  if(!this.context)return;const ctx=this.context;ctx.clearRect(0,0,this.width,this.height);
  this.particles=this.particles.filter(p=>{p.age+=dt;return p.age<p.duration});
  const cx=this.width/2,cy=58+(this.height-127)/2;
  for(const p of this.particles){const t=p.age/p.duration,u=p.outward?1-Math.pow(1-t,2):Math.pow(1-t,2),angle=p.angle+p.curve*t,d=p.distance*u;
   ctx.globalAlpha=Math.sin(Math.PI*t)*.95;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=6;
   const x=cx+Math.cos(angle)*d,y=cy+Math.sin(angle)*d*.65;ctx.save();ctx.translate(x,y);ctx.rotate(angle+t);ctx.fillRect(-p.size,-p.size,p.size*2,p.size*2);ctx.restore();
  }ctx.globalAlpha=1;ctx.shadowBlur=0;
 }
 report(){
  this.progress=this.total?Math.min(1,this.received/this.total):0;
  if(this.total)this.percent.setAttribute('aria-valuenow',String(Math.round(this.progress*100)));else this.percent.removeAttribute('aria-valuenow');
  this.percent.textContent=this.total?`${Math.round(this.progress*100)}%`:this.bytes(this.received);
  this.detail.textContent=`${this.bytes(this.received)}${this.total?' / '+this.bytes(this.total):''} · ${this.filename}`;
  this.ring.style.strokeDashoffset=String(100*(1-this.progress));this.fill.style.clipPath=`inset(${100*(1-this.progress)}% 0 0 0)`;
  this.root.dispatchEvent(new CustomEvent('forgeprogress',{bubbles:true,detail:{received:this.received,total:this.total,progress:this.total?this.progress:null}}));
 }
 async start(){
  if(this.destroyed||this.state==='loading'||this.state==='complete')return;
  this.reset();this.setState('loading');this.label.textContent='DATA FORGE';this.announcement.textContent='Download wird geladen.';this.controller=new AbortController();const signal=this.controller.signal;const started=performance.now();
  this.root.dispatchEvent(new CustomEvent('forgestart',{bubbles:true}));
  this.detail.textContent='Verbindung wird aufgebaut.';const chunks=[];let contentType='application/octet-stream';
  try{
   const response=this.options.load?await this.options.load(signal):await fetch(this.options.url,{signal});
   if(signal.aborted)throw new DOMException('Abgebrochen','AbortError');
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const size=Number(response.headers.get('content-length'));this.total=Number.isFinite(size)&&size>0?size:null;contentType=response.headers.get('content-type')||contentType;
   if(response.body){
    this.reader=response.body.getReader();
    while(true){const {done,value}=await this.reader.read();if(signal.aborted)throw new DOMException('Abgebrochen','AbortError');if(done)break;chunks.push(value);this.received+=value.byteLength;this.spark();this.report()}
    this.reader.releaseLock();this.reader=null;
   }else{const data=new Uint8Array(await response.arrayBuffer());if(signal.aborted)throw new DOMException('Abgebrochen','AbortError');chunks.push(data);this.received=data.byteLength;this.spark(30);this.report()}
   const remaining=Math.max(0,Number(this.options.minimumDuration??1400)-(performance.now()-started));
   if(remaining)await new Promise((resolve,reject)=>{const onAbort=()=>{clearTimeout(timer);reject(new DOMException('Abgebrochen','AbortError'))};const timer=setTimeout(()=>{signal.removeEventListener('abort',onAbort);resolve()},remaining);signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort()});
   if(signal.aborted)throw new DOMException('Abgebrochen','AbortError');
   const blob=new Blob(chunks,{type:contentType});this.progress=1;this.percent.textContent='100%';this.percent.setAttribute('aria-valuenow','100');this.ring.style.strokeDashoffset='0';this.fill.style.clipPath='inset(0% 0 0 0)';this.setState('complete');this.label.textContent='DOWNLOAD BEREIT';this.detail.textContent=`${this.bytes(blob.size)} · ${this.filename}`;this.cancelButton.textContent='Schließen';this.spark(44,true);
   this.save(blob);this.announcement.textContent='Datei an den Browser übergeben.';
   this.root.dispatchEvent(new CustomEvent('forgedownload',{bubbles:true,detail:{filename:this.filename,size:blob.size}}));
   this.collapseTimer=setTimeout(()=>{this.reset();this.label.textContent='Nochmal downloaden';this.meta.textContent='DOWNLOAD BEREIT'},1600);
  }catch(error){
   if(this.reader){try{await this.reader.cancel()}catch{}this.reader=null}
   if(this.destroyed)return;
   if(signal.aborted||error.name==='AbortError'){this.setState('idle');this.reset();this.label.textContent='Download abgebrochen';this.meta.textContent='ERNEUT STARTEN';this.announcement.textContent='Download abgebrochen.'}
   else{this.setState('error');this.label.textContent='Erneut versuchen';this.percent.textContent='Download fehlgeschlagen';this.percent.removeAttribute('role');this.percent.removeAttribute('aria-valuenow');this.detail.textContent='Datei konnte nicht geladen werden.';this.cancelButton.textContent='Schließen';this.announcement.textContent='Download fehlgeschlagen. Erneut versuchen.';this.root.dispatchEvent(new CustomEvent('forgeerror',{bubbles:true,detail:{message:error.message}}))}
  }
 }
 save(blob){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=this.filename;document.body.append(a);a.click();a.remove();
  const timer=setTimeout(()=>{URL.revokeObjectURL(url);this.urlTimers.delete(url)},30000);this.urlTimers.set(url,timer);
 }
 abort(){if(this.controller&&this.state==='loading')this.controller.abort()}
 destroy(){this.destroyed=true;this.abort();clearTimeout(this.collapseTimer);cancelAnimationFrame(this.frameId);this.observer.disconnect();this.launch.removeEventListener('click',this.onLaunch);this.cancelButton.removeEventListener('click',this.onCancel);/* Existing object URLs retain their scheduled cleanup so an initiated browser download can finish. */delete this.root.downloadForge}
}
window.DownloadForge=DownloadForge;
