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
    const duration=reduced?100:2800;
    const make=(selector,frames)=>this.root.querySelector(selector).animate(frames,{duration,fill:'both',easing:'linear'});
    const flat='polygon(0% 0%,33% 0%,67% 0%,100% 0%,100% 33%,100% 67%,100% 100%,67% 100%,33% 100%,0% 100%,0% 67%,0% 33%)';
    const bent='polygon(7% 9%,35% 0%,65% 10%,94% 2%,100% 36%,91% 65%,98% 91%,63% 100%,34% 90%,2% 96%,9% 65%,0% 33%)';
    const crushed='polygon(18% 9%,37% 3%,67% 11%,85% 5%,96% 36%,88% 62%,91% 82%,66% 96%,35% 90%,12% 95%,4% 65%,10% 36%)';
    const appear=[{opacity:0,transform:'translateY(22px) scale(.84)',offset:0},{opacity:0,transform:'translateY(22px) scale(.84)',offset:.4},{opacity:1,transform:'translateY(-3px) scale(1.02)',offset:.54},{opacity:1,transform:'translateY(0) scale(1)',offset:.59},{opacity:1,transform:'translateY(0) scale(1)',offset:1}];
    this.animations=[
      this.card.animate([
        {opacity:1,transform:'translateY(0) scale(1) rotate(0deg)',clipPath:flat,offset:0},
        {opacity:1,transform:'translateY(-4px) scale(.94,.94) rotate(-2deg)',clipPath:bent,offset:.1},
        {opacity:1,transform:'translateY(-12px) scale(.55,.7) rotate(5deg)',clipPath:crushed,offset:.2},
        {opacity:0,transform:'translateY(-25px) scale(.19,.3) rotate(-9deg)',clipPath:crushed,offset:.32},
        {opacity:0,transform:'translateY(-25px) scale(.19,.3) rotate(-9deg)',clipPath:crushed,offset:1}
      ],{duration,fill:'both',easing:'linear'}),
      make('.jd-delete__paper',[
        {opacity:0,transform:'translateY(-8px) rotate(5deg) scale(1.45,.9)',clipPath:flat,offset:0},
        {opacity:0,transform:'translateY(-8px) rotate(5deg) scale(1.45,.9)',clipPath:flat,offset:.17},
        {opacity:1,transform:'translateY(-18px) rotate(-8deg) scale(.9,.8)',clipPath:bent,offset:.27},
        {opacity:1,transform:'translateY(-47px) rotate(9deg) scale(.65,.59)',clipPath:crushed,offset:.37},
        {opacity:1,transform:'translateY(-61px) rotate(-14deg) scale(.5,.48)',clipPath:crushed,offset:.45},
        {opacity:1,transform:'translateY(-64px) rotate(-20deg) scale(.5,.48)',clipPath:crushed,offset:.6},
        {opacity:1,transform:'translateY(-54px) rotate(-11deg) scale(.5,.48)',clipPath:crushed,offset:.65},
        {opacity:1,transform:'translateY(-26px) rotate(7deg) scale(.48,.46)',clipPath:crushed,offset:.71},
        {opacity:1,transform:'translateY(26px) rotate(26deg) scale(.44,.42)',clipPath:crushed,offset:.78},
        {opacity:0,transform:'translateY(58px) rotate(34deg) scale(.4,.38)',clipPath:crushed,offset:.83},
        {opacity:0,transform:'translateY(58px) rotate(34deg) scale(.4,.38)',clipPath:crushed,offset:1}
      ]),
      make('.jd-delete__creases',[{opacity:0,offset:0},{opacity:.15,offset:.2},{opacity:1,offset:.43},{opacity:1,offset:1}]),
      make('.jd-delete__paper-lines',[{opacity:1,offset:0},{opacity:.8,offset:.27},{opacity:0,offset:.42},{opacity:0,offset:1}]),
      make('.jd-delete__bin-back',appear),make('.jd-delete__bin-front',appear),
      make('.jd-delete__lid',[
        {opacity:0,transform:'translateY(22px) scale(.84) rotate(0deg)',offset:0},
        {opacity:0,transform:'translateY(22px) scale(.84) rotate(0deg)',offset:.4},
        {opacity:1,transform:'translateY(0) scale(1) rotate(0deg)',offset:.51},
        {opacity:1,transform:'translateY(0) scale(1) rotate(105deg)',offset:.59},
        {opacity:1,transform:'translateY(0) scale(1) rotate(105deg)',offset:.84},
        {opacity:1,transform:'translateY(0) scale(1) rotate(-4deg)',offset:.96},
        {opacity:1,transform:'translateY(0) scale(1) rotate(0deg)',offset:1}
      ])
    ];
    return this.animations;
  }
  async remove(){
    if(this.state!=='idle')return false;
    const version=++this.version;this.setState('removing');this.status.textContent='Zerknüllen. Einwerfen. Deckel zu.';
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
