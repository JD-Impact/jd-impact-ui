/* Browser regression: native-size shared stage and real delete/restore. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const dir=path.join(root,'docs/reels/delete-undo/preview');
  const html=fs.readFileSync(path.join(dir,'reel.html'),'utf8');
  for(const name of ['component.html','delete-undo.css','delete-undo.js']){
    const native=fs.readFileSync(path.join(root,'components/delete-undo',name),'utf8');
    assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),native);
    assert(html.includes(native),`Reel must embed the original ${name}`);
  }
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const page=await browser.newPage({viewport:{width:540,height:960},deviceScaleFactor:2,reducedMotion:'reduce',ignoreHTTPSErrors:true});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.DELETE_TEST_URL||`http://127.0.0.1:${server.address().port}`);
    const state=s=>page.locator(`[data-delete-undo-root][data-state="${s}"]`).waitFor();
    const opacity=()=>page.locator('.jd-delete__bin-front').evaluate(el=>Number(getComputedStyle(el).opacity));
    assert.equal(await opacity(),0,'No bin before clicking Delete');
    const card=await page.locator('[data-delete-card]').boundingBox(),bin=await page.locator('.jd-delete__bin').boundingBox();
    assert.equal(card.width,360,'Native component size');
    assert(Math.abs(bin.x+bin.width/2-card.x-card.width/2)<1,'Same center');
    assert(bin.y>card.y&&bin.y+bin.height<card.y+card.height+16,'Bin uses original card area');
    await page.locator('[data-delete-trigger]').click();
    await page.waitForTimeout(350);
    assert.equal(await opacity(),0,'Bin waits for crumpling');
    await page.waitForTimeout(1200);
    assert(await opacity()>.9,'Bin appears before the paper drops');
    assert.equal(await page.locator('[data-delete-undo-root]').getAttribute('data-state'),'removing','Full sequence despite OS reduced motion when explicitly enabled');
    await page.evaluate(()=>deletion.remove()); // duplicate calls do not start a second sequence
    await state('removed');
    assert.equal(await page.locator('[data-delete-card]').count(),0,'Actual DOM removal');
    await page.locator('[data-delete-undo]').click();
    await state('idle');
    assert.equal(await opacity(),0,'Undo also hides bin');
    assert(await page.evaluate(()=>deletion.card===document.querySelector('[data-delete-card]')),'Same original node restored');
    await page.locator('[data-delete-trigger]').click();
    await page.waitForTimeout(450);
    await page.evaluate(()=>deletion.reset());
    assert.equal(await opacity(),0,'Reset cancels forward animation');
    await page.locator('[data-delete-trigger]').click();await state('removed');
    await page.locator('[data-delete-undo]').click();await page.waitForTimeout(450);
    await page.evaluate(()=>deletion.reset());
    assert.equal(await opacity(),0,'Reset cancels reverse animation');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile overflow');
      await page.locator('[data-delete-trigger]').click();await state('removed');
      await page.locator('[data-delete-undo]').click();await state('idle');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS exact native source, hidden bin, shared stage, timed appearance, actual removal, same-node undo, cancellation, mobile, explicit motion.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
