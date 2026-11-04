'use strict';
/* Headful + Xvfb + openbox. Everything is driven from the service worker so no
   Playwright page interaction can steal window focus from the target window. */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const http = require('http'); const path = require('path');
const os = require('os'); const fs = require('fs');

const EXT = path.resolve(__dirname, '..');
const DISP = process.env.SPIKE_DISPLAY || ':99';
const N = Number(process.env.ITER || 6);
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'wm-shots');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'spike-wm.json');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => { try { execSync(`import -window root -display ${DISP} ${path.join(SHOTS, n + '.png')}`,
  { stdio:'pipe', timeout:20000 }); return true; } catch(e){ return false; } };
const stats = a => { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y);
  const q=p=>s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];
  return { n:s.length, p50:+q(.5).toFixed(1), p90:+q(.9).toFixed(1), min:+s[0].toFixed(1) }; };

(async () => {
  const server = http.createServer((q,r)=>{ r.writeHead(200,{'content-type':'text/html'});
    r.end('<!doctype html><title>target</title><body style="font:14px system-ui">target '+q.url); });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const P = server.address().port;
  const URL7  = `http://127.0.0.1:${P}/s?utm_source=x&utm_medium=y&q=hello%20world&empty=&flag&id=12345&lang=zh-TW`;
  const URL28 = `http://127.0.0.1:${P}/many?` + Array.from({length:28},(_,i)=>`param${i}=value%20${i}`).join('&');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'spike-wm-'));
  const ctx = await chromium.launchPersistentContext(dir, {
    headless:false, executablePath:'/opt/pw-browsers/chromium',
    env:{ ...process.env, DISPLAY: DISP },
    args:['--no-sandbox','--disable-gpu','--window-size=1180,800','--window-position=0,0',
          `--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker',{timeout:20000});
  const ID = new URL(sw.url()).host;
  const probe = await ctx.newPage(); await probe.goto(`chrome-extension://${ID}/results.html`);
  const homeWin = await probe.evaluate(()=>chrome.windows.getCurrent().then(w=>w.id));

  const clear = () => sw.evaluate(async () => { const a = await chrome.storage.local.get(null);
    await chrome.storage.local.remove(Object.keys(a).filter(k=>k.startsWith('log:'))); });
  const log = () => sw.evaluate(async () => { const a = await chrome.storage.local.get(null);
    return Object.keys(a).filter(k=>k.startsWith('log:')).sort().map(k=>a[k]); });

  const mkWin = (url,w,h) => sw.evaluate(o => chrome.windows.create(
      { url:o.url, focused:true, type:'normal', width:o.w, height:o.h, left:20, top:20 })
      .then(x => ({ win:x.id, tab:x.tabs[0].id, width:x.width, height:x.height })), {url,w,h});

  let seq = 0;
  const open = (win, tab, extra) => {
    const pid = 'p' + (++seq);
    const popup = 'popup.html?tab=' + tab + '&pid=' + pid + (extra ? '&' + extra : '');
    return sw.evaluate(async o => {
      try {
        await chrome.action.setPopup({ popup: o.popup });
        await chrome.windows.update(o.win, { focused: true });
        await chrome.action.openPopup({ windowId: o.win });
        return { ok:true, pid:o.pid };
      } catch(e){ return { ok:false, pid:o.pid, error:String(e) }; }
    }, { popup, win, pid }).then(r => r);
  };
  const marksFor = async pid => (await log())
    .filter(e=>e.type==='popup-marks'&&e.marks&&e.marks.pid===pid).map(e=>e.marks)[0];
  const discFor  = async pid => (await log()).filter(e=>e.type==='popup-disconnect'&&e.pid===pid);

  const R = { wm:'openbox', cases:{}, variants:{} };

  /* ===== sizing under a real WM (window sizes are honoured now) ===== */
  const sizeCase = async (label, url, w, h, file) => {
    await clear();
    const W = await mkWin(url, w, h); await sleep(1700);
    const o = await open(W.win, W.tab, 'autoclose=2600');
    await sleep(1300);
    const m = await marksFor(o.pid);
    const ok = shot(file);
    R.cases[label] = { requested:{w,h}, actual:{w:W.width,h:W.height}, open:o,
                       sizing:m&&m.sizing, box:m&&m.bodyRect, shot:ok&&file };
    await sleep(1800);
    await sw.evaluate(w2 => chrome.windows.remove(w2).catch(()=>{}), W.win);
    await sleep(600);
  };
  await sizeCase('SIZE_normal_28params', URL28, 1180, 800, '10-normal-window-28-params');
  await sizeCase('SIZE_short_window',    URL28,  900, 420, '11-short-window-clamped');
  await sizeCase('SIZE_narrow_window',   URL28,  420, 700, '12-narrow-window-clamped');

  /* ===== perf variants in a real popup ===== */
  const main = await mkWin(URL7, 1180, 800); await sleep(1700);
  const variant = async (label, extra) => {
    const rows=[], errs=[];
    for (let i=0;i<N;i++){
      await clear();
      const o = await open(main.win, main.tab, (extra?extra+'&':'')+'autoclose=1000');
      if (!o.ok){ errs.push(o.error); await sleep(1400); continue; }
      await sleep(950);
      const m = await marksFor(o.pid); if (m) rows.push(m);
      await sleep(900);
    }
    R.variants[label] = { samples:rows.length, errors:errs.length, sampleErr:errs[0],
      ipcMs: stats(rows.map(r=>r.ipcMs).filter(v=>v!=null)),
      scriptToPaintMs: stats(rows.map(r=>r.scriptToPaintMs)),
      docToPaintMs: stats(rows.map(r=>r.rowsPainted)),
      box: rows[0]&&rows[0].bodyRect };
  };
  await variant('A default (both IPC)','');
  await variant('C zero IPC before paint','u='+encodeURIComponent(URL7)+'&size=1180x800');

  /* ===== 0-1 survival + validity gates ===== */
  await clear();
  const s = await open(main.win, main.tab, 'autoapply=1&delay=900&mutate=applied');
  await sleep(900); shot('20-popup-before-apply');
  await sleep(2600); shot('21-popup-after-apply');
  const l1 = await log();
  R.cases.SURVIVAL = {
    open: s,
    applied: l1.filter(e=>e.type==='popup-msg'&&e.pid===s.pid&&e.phase==='pre-apply').map(e=>e.url),
    navs:    l1.filter(e=>e.type==='tab-updated'&&e.url&&e.url.startsWith('http')).map(e=>e.url),
    discAfterApply: await discFor(s.pid),
    tabAfter: await sw.evaluate(t=>chrome.tabs.get(t).then(x=>x.url).catch(e=>String(e)), main.tab),
  };
  // GATE A: switch to another tab in the SAME window (intra-window, no WM needed)
  await sw.evaluate(w => chrome.tabs.create({ windowId:w, active:true, url:'about:blank' }), main.win);
  await sleep(1400);
  R.cases.SURVIVAL.discAfterTabSwitch = await discFor(s.pid);
  // GATE B: focus a different window (needs the WM)
  await sw.evaluate(w => chrome.windows.update(w, { focused:true }), homeWin);
  await sleep(1400);
  R.cases.SURVIVAL.discAfterWindowFocus = await discFor(s.pid);

  await ctx.close(); server.close();
  fs.writeFileSync(OUT, JSON.stringify(R,null,2));

  const S = R.cases.SURVIVAL;
  console.log('\n============== HEADFUL + OPENBOX ==============');
  for (const k of Object.keys(R.cases).filter(k=>k.startsWith('SIZE'))){
    const c = R.cases[k];
    console.log(`${k.padEnd(22)} window ${c.actual.w}x${c.actual.h}  -> popup box ${c.box&&c.box.w}x${c.box&&c.box.h}  (w=${c.sizing&&c.sizing.w} maxh=${c.sizing&&c.sizing.maxh})  open=${c.open.ok}`);
  }
  console.log('');
  for (const k of Object.keys(R.variants)){
    const v = R.variants[k];
    console.log(`${k.padEnd(28)} n=${v.samples} err=${v.errors}  ipc p50=${v.ipcMs&&v.ipcMs.p50}  doc->rows p50=${v.docToPaintMs&&v.docToPaintMs.p50}  box=${v.box&&v.box.w+'x'+v.box.h}`);
    if (v.sampleErr) console.log('   err:', String(v.sampleErr).slice(0,120));
  }
  console.log('\n--- 0-1 survival (pid ' + s.pid + ') open=' + s.ok + (s.error?' err='+s.error:'') + ' ---');
  console.log('  applied            :', S.applied[0]);
  console.log('  navigation commit  :', S.navs.some(u=>u.includes('spike=applied')) ? 'YES' : 'NO');
  console.log('  tab after          :', S.tabAfter);
  console.log('  disc after apply   :', JSON.stringify(S.discAfterApply));
  console.log('  GATE A tab switch  :', JSON.stringify(S.discAfterTabSwitch));
  console.log('  GATE B win focus   :', JSON.stringify(S.discAfterWindowFocus));
  const gate = S.discAfterTabSwitch.length>0 || S.discAfterWindowFocus.length>0;
  const surv = S.applied.length>0 && S.navs.some(u=>u.includes('spike=applied')) && S.discAfterApply.length===0;
  console.log('  VALIDITY GATE      :', gate?'PASS':'FAIL');
  console.log('  VERDICT            :', !gate?'INCONCLUSIVE':surv?'SURVIVES navigation':'DIES on navigation');
  console.log('\nshots ->', SHOTS, '\njson  ->', OUT);
  console.log('===============================================\n');
})().catch(e=>{console.error('FAILED:',e);process.exit(1);});
