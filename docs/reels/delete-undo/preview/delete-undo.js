/* Delete Undo: remove the actual element, then restore the same DOM node. */
class DeleteUndo {
  constructor(root) {
    if (root.jdDeleteUndo) return root.jdDeleteUndo;
    this.root=root;this.card=root.querySelector('[data-delete-card]');this.slot=root.querySelector('[data-delete-slot]');
    this.removeButton=root.querySelector('[data-delete-trigger]');this.undoButton=root.querySelector('[data-delete-undo]');
    this.status=root.querySelector('[data-delete-status]');this.count=root.querySelector('[data-delete-count]');
    this.state='idle';this.version=0;this.animations=[];this.motion=null;
    this.removeButton.addEventListener('click',()=>this.remove());
    this.undoButton.addEventListener('click',()=>this.undo());root.jdDeleteUndo=this;
  }
  setMotion(enabled){this.motion=enabled;}
  setState(state){this.state=state;this.root.dataset.state=state;const busy=['removing','restoring'].includes(state);this.root.setAttribute('aria-busy',String(busy));this.removeButton.disabled=state!=='idle';this.undoButton.disabled=state!=='removed';}
  animate(){
    const reduced=this.motion===false||(this.motion!==true&&matchMedia('(prefers-reduced-motion: reduce)').matches);
    const duration=reduced?100:2100;
    const make=(selector,frames)=>this.root.querySelector(selector).animate(frames,{duration,fill:'both',easing:'linear'});
    const end={opacity:0,transform:'translate(0,0) scale(.17,.25) rotateX(75deg)',offset:1};
    this.animations=[
      this.card.animate([
        {opacity:1,transform:'translate(0,0) scale(1) rotateX(0deg)',offset:0},
        {opacity:1,transform:'translate(0,-6px) scale(.98) rotateX(12deg)',offset:.12},
        {opacity:0,transform:'translate(0,0) scale(.17,.25) rotateX(75deg)',offset:.34},end
      ],{duration,fill:'both',easing:'linear'}),
      make('.jd-delete__paper',[
        {opacity:0,transform:'translate(0,0) scale(.6)',offset:0},
        {opacity:0,transform:'translate(0,0) scale(.6)',offset:.18},
        {opacity:1,transform:'translate(0,-5px) scale(1)',offset:.32},
        {opacity:1,transform:'translate(35px,-25px) rotate(-14deg) scale(.9)',offset:.45},
        {opacity:1,transform:'translate(94px,60px) rotate(6deg) scale(.72)',offset:.64},
        {opacity:1,transform:'translate(94px,142px) rotate(0deg) scale(.5)',offset:.8},
        {opacity:0,transform:'translate(94px,168px) scale(.4)',offset:.88},
        {opacity:0,transform:'translate(94px,168px) scale(.4)',offset:1}
      ]),
      make('.jd-delete__paper-left',[{transform:'rotateY(0deg)',offset:0},{transform:'rotateY(0deg)',offset:.25},{transform:'rotateY(52deg)',offset:.44},{transform:'rotateY(52deg)',offset:1}]),
      make('.jd-delete__paper-right',[{transform:'rotateY(0deg)',offset:0},{transform:'rotateY(-12deg)',offset:.25},{transform:'rotateY(-52deg)',offset:.44},{transform:'rotateY(-52deg)',offset:1}]),
      make('.jd-delete__lid',[{transform:'rotate(0deg)',offset:0},{transform:'rotate(0deg)',offset:.12},{transform:'rotate(66deg)',offset:.3},{transform:'rotate(66deg)',offset:.85},{transform:'rotate(0deg)',offset:1}])
    ];
    return this.animations;
  }
  async remove(){
    if(this.state!=='idle')return false;
    const version=++this.version;this.setState('removing');this.status.textContent='Falten. Einwerfen. Deckel zu.';
    this.card.setAttribute('aria-hidden','true');
    this.animate();
    try{await Promise.all(this.animations.map(a=>a.finished));}catch{return false;}
    if(version!==this.version)return false;
    this.card.remove();this.count.textContent='00 DATEIEN';this.setState('removed');
    this.status.textContent='Zu früh gelöscht? Ein Klick bringt sie zurück.';
    this.root.dispatchEvent(new CustomEvent('itemremoved',{bubbles:true,detail:{element:this.card}}));return true;
  }
  async undo(){
    if(this.state!=='removed')return false;
    const version=++this.version;this.slot.append(this.card);this.setState('restoring');
    this.status.textContent='Einmal zurückspulen, bitte.';
    this.animations.forEach(a=>{a.playbackRate=-1;a.currentTime=a.effect.getTiming().duration;a.play();});
    try{await Promise.all(this.animations.map(a=>a.finished));}catch{return false;}
    if(version!==this.version)return false;
    this.animations.forEach(a=>a.cancel());this.animations=[];this.card.removeAttribute('aria-hidden');this.count.textContent='01 DATEI';this.setState('idle');
    this.status.textContent='Gute Ideen verdienen eine zweite Chance.';
    this.root.dispatchEvent(new CustomEvent('itemrestored',{bubbles:true,detail:{element:this.card}}));return true;
  }
  reset(){this.version++;this.animations.forEach(a=>a.cancel());this.animations=[];if(!this.card.isConnected)this.slot.append(this.card);this.card.removeAttribute('aria-hidden');this.count.textContent='01 DATEI';this.setState('idle');this.status.textContent='Die gute Idee bleibt erst mal hier.';}
}
window.DeleteUndo=DeleteUndo;
