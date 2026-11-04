'use strict';
/* REAL popup measurements (previous runs were tab-hosted and understated IPC),
   plus a pid-attributed 0-1 with a focus-dismissal validity gate. */
const { chromium } = require('playwright');
const http = require('http'); const path = require('path');
const os = require('os'); const fs = require('fs');

const EXT = path.resolve(__dirname, '..');
const DISP = process.env.SPIKE_DISPLAY || ':99';
const N = Number(process.env.ITER || 8);
const OUT = process.env.OUT || path.join(os.tmpdir(), 'popup-perf.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stats = a => { if (!a.length) return null; const s=[...a].sort((x,y)=>x-y);
  const q=p=>s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];
  return { n:s.length, p50:+q(.5).toFixed(1), p90:+q(.9).toFixed(1), min:+s[0].toFixed(1), max:+s[s.length-1].toFixed(1) }; };

(async () => {
  const server = http.createServer((q, r) => { r.writeHead(200, {'content-type':'text/html'});
    r.end('<!doctype html><title>t</title><body>target ' + q.url); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const PORT = server.address().port;
  const URL7 = `http://127.0.0.1:${PORT}/s?utm_source=x&utm_medium=y&q=hello%20world&empty=&flag&id=12345&lang=zh-TW`;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spike-pp-'));
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: false, executablePath: '/opt/pw-browsers/chromium',
    env: { ...process.env, DISPLAY: DISP },
    args: ['--no-sandbox','--disable-gpu','--window-size=1200,820','--window-position=0,0',
           `--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker',{timeout:20000});
  const ID = new URL(sw.url()).host;
  const extUrl = p => `chrome-extension://${ID}/${p}`;

  const probe = await ctx.newPage(); await probe.goto(extUrl('results.html'));
  const trig  = await ctx.newPage(); await trig.goto('about:blank');
  const clear = () => probe.evaluate(async () => { const a = await chrome.storage.local.get(null);
    await chrome.storage.local.remove(Object.keys(a).filter(k=>k.startsWith('log:'))); });
  const log = () => probe.evaluate(async () => { const a = await chrome.storage.local.get(null);
    return Object.keys(a).filter(k=>k.startsWith('log:')).sort().map(k=>a[k]); });

  const target = await probe.evaluate(u => chrome.windows.create({ url:u, focused:true, type:'normal' })
    .then(w => ({ win:w.id, tab:w.tabs[0].id })), URL7);
  await sleep(1800);

  let pidSeq = 0;
  const fire = async (extra) => {
    const pid = 'p' + (++pidSeq);
    const popup = 'popup.html?tab=__TAB__&pid=' + pid + (extra ? '&' + extra : '');
    await trig.goto(extUrl('trigger.html?win=' + target.win + '&tab=' + target.tab +
                           '&popup=' + encodeURIComponent(popup)));
    await sleep(150);
    await trig.click('#seed-open');
    await trig.waitForFunction(() => window.__triggerResult, null, { timeout:10000 }).catch(()=>{});
    const t = await trig.evaluate(() => window.__triggerResult).catch(()=>null);
    return { pid, trigger: t };
  };
  const marksFor = async pid => (await log())
    .filter(e => e.type === 'popup-marks' && e.marks && e.marks.pid === pid).map(e => e.marks)[0];
  const discFor = async pid => (await log())
    .filter(e => e.type === 'popup-disconnect' && e.pid === pid);

  const R = { variants: {}, survival: {} };

  /* ---------- perf variants, each popup self-closes so the next can open ---------- */
  const variant = async (label, extra) => {
    const rows = [];
    for (let i = 0; i < N; i++){
      await clear();
      const { pid, trigger } = await fire((extra ? extra + '&' : '') + 'autoclose=1100');
      if (!trigger || !trigger.ok) { rows.push({ err: trigger && trigger.error }); await sleep(1500); continue; }
      await sleep(1000);
      const m = await marksFor(pid);
      if (m) rows.push(m);
      await sleep(900);                       // let it autoclose before the next open
    }
    const ok = rows.filter(r => r && r.scriptToPaintMs != null);
    R.variants[label] = {
      label, samples: ok.length,
      ipcMs:            stats(ok.map(r=>r.ipcMs).filter(v=>v!=null)),
      tabsQueryMs:      stats(ok.map(r=>r.tabsQueryMs).filter(v=>v!=null)),
      winGetMs:         stats(ok.map(r=>r.winGetMs).filter(v=>v!=null)),
      scriptToPaintMs:  stats(ok.map(r=>r.scriptToPaintMs)),
      docToPaintMs:     stats(ok.map(r=>r.rowsPainted)),
      box:              ok[0] && ok[0].bodyRect,
      errors:           rows.filter(r=>r && r.err).length,
    };
  };
  await variant('A default (tabs.query + windows.getCurrent)', '');
  await variant('B pre-seeded url (?u=, windows.getCurrent only)', 'u=' + encodeURIComponent(URL7));
  await variant('C pre-seeded url + size (zero IPC before paint)', 'u=' + encodeURIComponent(URL7) + '&size=1200x820');

  /* ---------- 0-1 with pid attribution + focus-dismissal gate ---------- */
  await clear();
  const t1 = await fire('autoapply=1&delay=900&mutate=applied');
  await sleep(3200);
  const lg1 = await log();
  R.survival.applied  = lg1.filter(e=>e.type==='popup-msg'&&e.pid===t1.pid&&e.phase==='pre-apply').map(e=>e.url);
  R.survival.navs     = lg1.filter(e=>e.type==='tab-updated'&&e.url&&e.url.startsWith('http')).map(e=>e.url);
  R.survival.discAfterApply = await discFor(t1.pid);
  R.survival.tabAfter = await probe.evaluate(t=>chrome.tabs.get(t).then(x=>x.url).catch(e=>String(e)), target.tab);

  /* validity gate: a NEW focused window must dismiss that same popup */
  await probe.evaluate(() => chrome.windows.create({ url:'about:blank', focused:true }));
  await sleep(1500);
  R.survival.discAfterFocusSteal = await discFor(t1.pid);

  await ctx.close(); server.close();
  fs.writeFileSync(OUT, JSON.stringify(R, null, 2));

  console.log('\n========= REAL POPUP PERF (headful ' + DISP + ', n=' + N + ') =========');
  for (const k of Object.keys(R.variants)){
    const v = R.variants[k];
    const f = (n,s) => `  ${n.padEnd(26)} ${s ? `p50=${String(s.p50).padEnd(7)} p90=${String(s.p90).padEnd(7)} min=${s.min}` : 'skipped'}`;
    console.log(`\n${v.label}   samples=${v.samples} box=${v.box && v.box.w+'x'+v.box.h}`);
    console.log(f('ipc total', v.ipcMs));
    console.log(f('  tabs.query', v.tabsQueryMs));
    console.log(f('  windows.getCurrent', v.winGetMs));
    console.log(f('script -> rows painted', v.scriptToPaintMs));
    console.log(f('doc start -> rows painted', v.docToPaintMs));
  }
  console.log('\n--- 0-1 survival (pid ' + t1.pid + ') ---');
  console.log('  applied url      :', R.survival.applied[0]);
  console.log('  navigations      :', R.survival.navs.filter(u=>u.includes('spike=applied')).length ? 'committed' : 'NONE');
  console.log('  tab url after    :', R.survival.tabAfter);
  console.log('  disconnect after apply        :', JSON.stringify(R.survival.discAfterApply));
  console.log('  disconnect after focus steal  :', JSON.stringify(R.survival.discAfterFocusSteal));
  const gate = R.survival.discAfterFocusSteal.length > 0;
  const survived = R.survival.applied.length>0 && R.survival.navs.some(u=>u.includes('spike=applied'))
                   && R.survival.discAfterApply.length === 0;
  console.log('  VALIDITY GATE    :', gate ? 'PASS (focus dismissal is real here)' : 'FAIL (focus semantics not exercised)');
  console.log('  VERDICT          :', !gate ? 'INCONCLUSIVE' : survived ? 'SURVIVES navigation' : 'DIES on navigation');
  console.log('\njson ->', OUT);
  console.log('=====================================================\n');
})().catch(e=>{console.error('FAILED:',e);process.exit(1);});
