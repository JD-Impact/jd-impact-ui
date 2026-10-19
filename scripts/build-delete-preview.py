from pathlib import Path
import re,json,shutil
root=Path(__file__).resolve().parents[1];c=root/'components/delete-undo';out=root/'docs/reels/delete-undo/preview';out.mkdir(parents=True,exist_ok=True)
s=(root/'docs/reels/order-truck/v5/reel.html').read_text()
old=root/'components/order-truck'
s=s.replace((old/'order-truck.css').read_text(),(c/'delete-undo.css').read_text(),1)
s=s.replace((old/'order-truck.js').read_text(),(c/'delete-undo.js').read_text(),1)
a=s.index('<main>');b=s.index('</main>',a)+len('</main>')
s=s[:a]+'''<main><div class="intro"><p class="eyebrow">DEIN NÄCHSTER UI-EFFEKT</p><h1>Ein Klick weg.<br><span>Ein Klick zurück.</span></h1></div><div class="delete-stage">'''+(c/'component.html').read_text()+'''</div><p class="hint">Löschen mit Rückweg.</p><p class="tag">HTML · CSS · JAVASCRIPT</p></main>'''+s[b:]
s=s.replace("const order=new OrderTruck(document.querySelector('[data-order-truck]'));order.setMotion(true);", "const deletion=new DeleteUndo(document.querySelector('[data-delete-undo-root]'));deletion.setMotion(true);",1)
s=s.replace('JD — Order Truck','JD — Delete Undo').replace('COMPONENT 003','COMPONENT 004').replace('DM: ORDER','DM: DELETE')
source='\n'.join((c/name).read_text() for name in ['component.html','delete-undo.css','delete-undo.js'])
s=re.sub(r'  const originalSource = .*?;\n  const glyphs',lambda m:'  const originalSource = '+json.dumps(source,ensure_ascii=False)+';\n  const glyphs',s,count=1)
a=s.index('const ghost=document.getElementById');b=s.index('</script></body>',a)
s=s[:a]+'''const ghost=document.getElementById('ghost');let reelVersion=0,reelTimers=[];
function waitReel(ms){return new Promise(resolve=>{const id=setTimeout(resolve,ms);reelTimers.push({id,resolve})})}
function stopReel(){reelVersion++;reelTimers.forEach(t=>{clearTimeout(t.id);t.resolve()});reelTimers=[];deletion.reset();ghost.classList.remove('visible');document.body.classList.remove('recording')}
function pointTo(button){const r=button.getBoundingClientRect();ghost.style.transition='transform .6s cubic-bezier(.2,.8,.2,1),opacity .2s';ghost.style.transform=`translate(${r.left+r.width*.6}px,${r.top+r.height*.7}px)`;ghost.classList.add('visible')}
async function playReel(){
 stopReel();const version=reelVersion;document.body.classList.add('recording');
 const same=()=>version===reelVersion;
 const first=deletion.removeButton.getBoundingClientRect();ghost.style.transition='none';ghost.style.transform=`translate(${first.right+55}px,${first.bottom+65}px)`;ghost.classList.add('visible');
 await waitReel(80);if(!same())return;pointTo(deletion.removeButton);
 await waitReel(720);if(!same())return;ghost.classList.remove('visible');
 await deletion.remove();if(!same())return;
 await waitReel(1000);if(!same())return;pointTo(deletion.undoButton);
 await waitReel(650);if(!same())return;ghost.classList.remove('visible');
 await deletion.undo();if(!same())return;
 await waitReel(1100);if(!same())return;document.body.classList.remove('recording');
}
document.getElementById('reel-play').addEventListener('click',playReel);document.getElementById('reel-reset').addEventListener('click',stopReel);document.addEventListener('keydown',event=>{if(event.key==='Escape')stopReel()});
if(new URLSearchParams(location.search).has('autoplay'))setTimeout(playReel,400);
'''+s[b:]
styles='''.intro{top:clamp(150px,22svh,235px)!important;left:15px;right:15px;margin:0}h1{font-size:clamp(31px,6.8vw,37px)!important;line-height:1.13}.delete-stage{position:absolute;top:calc(50svh - 110px);left:20px;right:20px;display:flex;justify-content:center}.hint{display:none}.tag{position:fixed;top:auto!important;bottom:126px;left:0;right:0;text-align:center}.reel-cta{bottom:82px!important;font-size:9px!important;letter-spacing:1.1px!important}.brand{top:clamp(30px,8.5svh,82px)!important}.edition{top:calc(clamp(30px,8.5svh,82px) + 16px)!important}.recording .reel-tools{visibility:visible}.reel-tools{bottom:20px}.matrix-canvas{opacity:.38!important}@media(max-height:850px){.tag{display:none}}@media(max-width:350px){.reel-cta{font-size:7px!important;letter-spacing:.7px!important}.edition{right:20px;font-size:7px}.brand{left:20px}}'''
s=s.replace('</style>',styles+'</style>',1)
s=s.replace('<html lang="de">','<html lang="de" data-jd-motion="full">',1)
s=s.replace("const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;","const reducedMotion = document.documentElement.dataset.jdMotion !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;",1)
for name in ['component.html','delete-undo.css','delete-undo.js']:shutil.copy2(c/name,out/name)
(out/'reel.html').write_text(s)
print('Built self-contained JD Reel 004 preview, with exact component code in the Matrix.')
