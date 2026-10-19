/* npm install --no-save playwright, then: node scripts/test-order-truck.cjs */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const {execFileSync}=require('node:child_process');

(async()=>{
  const root=path.resolve(__dirname,'..');
  const out=process.env.ORDER_TEST_OUTPUT||path.join(os.tmpdir(),'jd-order-check');
  fs.mkdirSync(out,{recursive:true});
  const zipFiles=JSON.parse(execFileSync('python',['-c',
    "import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n.rsplit('/',1)[-1]:z.read(n).decode() for n in z.namelist() if n.endswith(('.html','.css','.js'))}))",
    path.join(root,'docs/downloads/jd-order-truck-component.zip')],{encoding:'utf8'}));
  const source=JSON.parse(fs.readFileSync(path.join(root,'docs/order-source.js'),'utf8').replace(/^window.JD_SOURCES = /,'').replace(/;\s*$/,''));
  for(const [key,name] of [['html','component.html'],['css','order-truck.css'],['js','order-truck.js']]) {
    assert.equal(source[key].code,zipFiles[name],`${name}: copied source must equal ZIP`);
    assert.equal(zipFiles[name],fs.readFileSync(path.join(root,'components/order-truck',name),'utf8'));
  }
  // A plain unrelated website, using only the three copied tabs. No initialization helper.
  const fixture=`<!doctype html><meta name="viewport" content="width=device-width"><style>
    body{margin:24px;background:#fff;color:#222;font:18px Georgia}button{font-family:Georgia}
    ${zipFiles['order-truck.css']}</style><h1>Mein Shop</h1><p>Ein unabhängiger Einbau.</p>
    ${zipFiles['component.html']}${zipFiles['component.html']}<script>${zipFiles['order-truck.js']}</script>`;
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/copied'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
    const file=path.join(root,'docs',url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));
    if(!file.startsWith(path.join(root,'docs')+path.sep)||!fs.existsSync(file)){res.statusCode=404;res.end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.zip':'application/zip'})[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.ORDER_TEST_URL||`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const failures=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();
    try{
      await page.goto(`http://127.0.0.1:${server.address().port}/copied`);
      assert.equal(await page.locator('[data-order-truck]').evaluateAll(els=>els.filter(e=>e.jdOrderTruck).length),2,
                   'Copying HTML + CSS + JS must initialize both buttons without extra code');
      await page.locator('[data-order-trigger]').first().click();
      assert.equal(await page.locator('[data-order-truck]').first().getAttribute('data-state'),'running');
      assert.equal(await page.locator('[data-order-truck]').nth(1).getAttribute('data-state'),'idle');
      await page.clock.runFor(8300);
      assert.equal(await page.locator('[data-order-truck]').first().getAttribute('data-state'),'complete');
      await page.locator('[data-order-trigger]').first().click();
      assert.equal(await page.locator('[data-order-truck]').first().getAttribute('data-state'),'running');
      await page.evaluate(()=>{
        const el=document.querySelector('[data-order-truck]'); el.jdOrderTruck.reset();
        window.orders=0;window.completed=0;
        el.addEventListener('ordercomplete',()=>completed++);
        window.order=new OrderTruck(el,{confirm:()=>{orders++;return Promise.resolve({orderId:'test'})}});
      });
      await page.locator('[data-order-trigger]').first().click();
      await page.clock.runFor(8300);
      assert.equal(await page.evaluate(()=>orders),1,'One click must create exactly one order');
      assert.equal(await page.evaluate(()=>completed),1,'Explicit initialization must not duplicate listeners');
      assert.equal(await page.locator('[data-order-trigger]').first().isDisabled(),true,'A confirmed order cannot be submitted twice');
      await page.evaluate(()=>order.run());
      assert.equal(await page.evaluate(()=>orders),1);
      await page.screenshot({path:path.join(out,'copied-in-shop.png')});
      console.log('PASS copied tabs: auto-start, two independent buttons, replay, single callback, duplicate-order guard');
    }catch(e){failures.push('COPY: '+e.message);}
    for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740},{width:3840,height:2160}]){
      try{
        await page.setViewportSize(viewport);
        await page.goto(base+'/order.html?review=003');
        const frame=page.frameLocator('#component-preview');
        const button=frame.locator('[data-order-trigger]');await button.waitFor();
        const stage=await page.locator('.preview-stage').boundingBox();
        assert(stage.height<=460,'Order preview must not keep the 700px Login stage');
        if(viewport.width<=390){
          const box=await button.boundingBox();
          assert(box.y+box.height<=viewport.height,'Button must be visible in the first mobile viewport');
        }else{
          assert(Math.abs((await button.boundingBox()).width-360)<1,'Desktop preview must use the native 360px width');
        }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.equal(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await button.click();
        await frame.locator('[data-order-truck][data-state="running"]').waitFor();
        await frame.locator('.jd-order__scene').evaluate(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=3500}));
        await frame.locator('[data-order-truck]').evaluate(e=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=3500}));
        await page.screenshot({path:path.join(out,`page-${viewport.width}.png`)});
        await page.locator('#reset-preview').click();
        await frame.locator('[data-order-truck][data-state="idle"]').waitFor();
        console.log(`PASS ${viewport.width}px: visible preview, scale, no overflow, click and reset`);
      }catch(e){failures.push(`${viewport.width}px: ${e.message}`);}
    }
    assert.deepEqual(errors,[],'No JavaScript errors');
    if(failures.length)throw Error(failures.join('\n'));
    console.log('PASS ZIP, copied tabs and website use identical component files.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
