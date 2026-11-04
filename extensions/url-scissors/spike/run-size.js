'use strict';
/* Sizing only: does the popup stay inside a small browser window, and does it
   honour the minimum? windows.create({width,height}) is ignored here, so the
   window is resized with windows.update and the real size is verified first. */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const http = require('http'); const path=require('path'); const os=require('os'); const fs=require('fs');
const EXT = path.resolve(__dirname,'..');
const DISP = process.env.SPIKE_DISPLAY || ':99';
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(),'size-shots');
fs.mkdirSync(SHOTS,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shot=n=>{try{execSync(`import -window root -display ${DISP} ${path.join(SHOTS,n+'.png')}`,{stdio:'pipe',timeout:20000});return true}catch(e){return false}};

(async()=>{
  const server=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html'});r.end('<!doctype html><title>t</title><body>t '+q.url)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const P=server.address().port;
  const U=n=>`http://127.0.0.1:${P}/m?`+Array.from({length:n},(_,i)=>`param${i}=value%20${i}`).join('&');

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spike-sz-'));
  const ctx=await chromium.launchPersistentContext(dir,{headless:false,
    executablePath:'/opt/pw-browsers/chromium', env:{...process.env,DISPLAY:DISP},
    args:['--no-sandbox','--disable-gpu','--window-size=1200,820','--window-position=0,0',
          `--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`]});
  const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:20000});
  const ID=new URL(sw.url()).host;
  const probe=await ctx.newPage(); await probe.goto(`chrome-extension://${ID}/results.html`);

  const clear=()=>sw.evaluate(async()=>{const a=await chrome.storage.local.get(null);
    await chrome.storage.local.remove(Object.keys(a).filter(k=>k.startsWith('log:')))});
  const log=()=>sw.evaluate(async()=>{const a=await chrome.storage.local.get(null);
    return Object.keys(a).filter(k=>k.startsWith('log:')).sort().map(k=>a[k])});

  const W=await sw.evaluate(u=>chrome.windows.create({url:u,focused:true,type:'normal'})
    .then(x=>({win:x.id,tab:x.tabs[0].id})), U(28));
  await sleep(1800);

  let seq=0; const out=[];
  const run=async(label,w,h,params,file)=>{
    // resize and VERIFY before measuring anything
    await sw.evaluate(o=>chrome.windows.update(o.win,{width:o.w,height:o.h,state:'normal',left:20,top:20}),{win:W.win,w,h});
    await sleep(1200);
    const real=await sw.evaluate(i=>chrome.windows.get(i).then(x=>({w:x.width,h:x.height})),W.win);
    await sw.evaluate(o=>chrome.tabs.update(o.tab,{url:o.url}),{tab:W.tab,url:U(params)});
    await sleep(1200);
    await clear();
    const pid='s'+(++seq);
    const r=await sw.evaluate(async o=>{try{
      await chrome.action.setPopup({popup:o.popup});
      await chrome.windows.update(o.win,{focused:true});
      await chrome.action.openPopup({windowId:o.win}); return {ok:true};
    }catch(e){return {ok:false,error:String(e)}}},
      {popup:`popup.html?tab=${W.tab}&pid=${pid}&autoclose=2600`,win:W.win});
    await sleep(1300);
    const m=(await log()).filter(e=>e.type==='popup-marks'&&e.marks&&e.marks.pid===pid).map(e=>e.marks)[0];
    const s=shot(file);
    out.push({label,requested:{w,h},realWindow:real,params,open:r,
              sizing:m&&m.sizing,box:m&&m.bodyRect,shot:s&&file});
    await sleep(2000);
  };

  await run('normal window, 28 params', 1200, 820, 28, '30-normal-28');
  await run('short window, 28 params',   900, 430, 28, '31-short-28');
  await run('narrow window, 28 params',  430, 760, 28, '32-narrow-28');
  await run('normal window, 1 param',   1200, 820,  1, '33-normal-1');

  await ctx.close(); server.close();
  console.log('\n============== SIZING (headful + openbox) ==============');
  for(const o of out){
    console.log(`${o.label.padEnd(26)} window ${String(o.realWindow.w)}x${o.realWindow.h}`);
    console.log(`   computed  w=${o.sizing&&o.sizing.w}  maxh=${o.sizing&&o.sizing.maxh}   (from windowW=${o.sizing&&o.sizing.windowW} windowH=${o.sizing&&o.sizing.windowH})`);
    console.log(`   popup box ${o.box&&o.box.w}x${o.box&&o.box.h}   fits-in-window=${o.box&&o.sizing?(o.box.h<=o.realWindow.h&&o.box.w<=o.realWindow.w?'YES':'NO'):'?'}   open=${o.open.ok}${o.open.error?' '+o.open.error.slice(0,70):''}`);
  }
  console.log('\nshots ->', SHOTS);
  console.log('========================================================\n');
  fs.writeFileSync(path.join(SHOTS,'size.json'), JSON.stringify(out,null,2));
})().catch(e=>{console.error('FAILED:',e);process.exit(1)});
