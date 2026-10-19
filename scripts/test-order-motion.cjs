/* Real-time browser test: no fake clock, animation seeking, or forced screenshots. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

(async()=>{
  const docs=path.resolve(__dirname,'../docs');
  const server=http.createServer((req,res)=>{
    const file=path.join(docs,new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(docs+path.sep)||!fs.existsSync(file)){res.statusCode=404;res.end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.ORDER_TEST_URL||`http://127.0.0.1:${server.address().port}`;
  const output=process.env.ORDER_TEST_OUTPUT||'/tmp/jd-order-motion';fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const results=await Promise.allSettled(['reduce','no-preference'].map(async reducedMotion=>{
      const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion,ignoreHTTPSErrors:true});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      try{
        await page.goto(base+'/order.html?motion-check=16',{waitUntil:'networkidle'});
        const frame=page.frameLocator('#component-preview');
        const button=frame.locator('[data-order-trigger]');await button.waitFor();
        await button.click();
        const started=Date.now();const samples=[];
        for(const target of [250,700,2800,4400,7400]){
          await page.waitForTimeout(Math.max(0,target-(Date.now()-started)));
          const sample=await frame.locator('[data-order-truck]').evaluate(root=>{
            const vehicle=root.querySelector('.jd-order__vehicle');
            const gate=root.querySelector('.jd-order__door');
            return {state:root.dataset.state,motion:root.dataset.jdMotion,
              elapsed:performance.now(),animations:root.getAnimations({subtree:true}).length,
              vehicleX:new DOMMatrix(getComputedStyle(vehicle).transform).e,
              gateHeight:gate.getBoundingClientRect().height,
              width:root.getBoundingClientRect().width};
          });
          samples.push(sample);
          assert.equal(sample.state,'running',`${reducedMotion}: must show the full sequence at ${target}ms`);
          assert(sample.animations>0,`${reducedMotion}: CSS animations must actually run`);
          if(target===2800||target===4400)await page.screenshot({path:path.join(output,`${reducedMotion}-${target}.png`)});
        }
        assert(samples[1].vehicleX< -5,'Truck visibly arrives');
        assert(Math.abs(samples[2].vehicleX)<1,'Truck is parked while loading');
        assert(samples[2].gateHeight<15,'Tailgate is visibly open');
        assert(samples[4].vehicleX>200,'Truck visibly departs');
        await frame.locator('[data-order-truck][data-state="complete"]').waitFor({timeout:3000});
        assert(Date.now()-started>=8000,'Confirmation must wait for the real animation');
        assert(Math.abs(samples[0].width-360)<1,'Preview must use the native 360px width');
        await button.click();
        await page.waitForTimeout(300);
        assert.equal(await frame.locator('[data-order-truck]').getAttribute('data-state'),'running','Replay must animate');
        await page.locator('#reset-preview').click();
        await frame.locator('[data-order-truck][data-state="idle"]').waitFor();
        assert.deepEqual(errors,[]);
        return {reducedMotion,samples,result:'PASS'};
      }finally{await page.close();}
    }));
    const report=results.map(r=>r.status==='fulfilled'?r.value:{result:'FAIL',message:r.reason.message});
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
    assert(results.every(r=>r.status==='fulfilled'),'Live sequence must work with both OS motion preferences');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
