'use strict';
/* Spike driver. Answers as much of 0-1 / 0-2 / 0-3 as a headless container can,
   and reports precisely what it could NOT determine. */
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

const EXT = path.resolve(__dirname, '..');
const ITER = Number(process.env.ITER || 10);
const OUT = process.env.OUT || path.join(os.tmpdir(), 'spike-result.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const stats = a => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const q = p => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return { n: s.length, min: +s[0].toFixed(2), p50: +q(.5).toFixed(2),
           p90: +q(.9).toFixed(2), max: +s[s.length - 1].toFixed(2),
           mean: +(s.reduce((t, v) => t + v, 0) / s.length).toFixed(2) };
};

(async () => {
  /* ---- local http origin so no network is needed ---- */
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/redir')) {           // for the 302 case later
      res.writeHead(302, { Location: '/page?a=1&b=2&added=byserver' }); return res.end();
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>spike target</title><body>spike target ' + req.url);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const PORT = server.address().port;
  const TEST_URL = `http://127.0.0.1:${PORT}/page?utm_source=x&utm_medium=y&q=hello%20world&empty=&flag&id=12345&lang=zh-TW`;

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spike-profile-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,                               // new headless via args (extensions need it)
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu',
           `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });

  let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const EXT_ID = new URL(sw.url()).host;
  const extUrl = p => `chrome-extension://${EXT_ID}/${p}`;
  const report = { chrome: null, extId: EXT_ID, testUrl: TEST_URL, runA: {}, runB: {}, notes: [] };
  report.chrome = await (await ctx.newPage()).evaluate(() => navigator.userAgent)
    .then(ua => (ua.match(/Chrome\/[\d.]+/) || ['?'])[0]).catch(() => '?');

  const probe = await ctx.newPage();
  await probe.goto(extUrl('results.html'));
  const clearLog = () => probe.evaluate(async () => {
    const all = await chrome.storage.local.get(null);
    await chrome.storage.local.remove(Object.keys(all).filter(k => k.startsWith('log:')));
  });
  const readLog = () => probe.evaluate(async () => {
    const all = await chrome.storage.local.get(null);
    return Object.keys(all).filter(k => k.startsWith('log:')).sort().map(k => all[k]);
  });

  /* =====================================================================
     RUN A - spike 0-2 (our share) and 0-3 (tabs.query cost)
     Tab-hosted popup.html. NOT a real popup bubble: it excludes Chrome's
     popup-window cost, which is exactly the part we cannot control.
     ===================================================================== */
  const target = await ctx.newPage();
  await target.goto(TEST_URL);

  const collect = async (suffix, label) => {
    const scriptToPaint = [], fcp = [], tabsQuery = [], docToPaint = [];
    for (let i = 0; i < ITER; i++) {
      const p = await ctx.newPage();
      await p.goto(extUrl('popup.html' + suffix));
      await p.waitForFunction(() => window.__spikeMarks && window.__spikeMarks.rowsPainted, null, { timeout: 10000 });
      const m = await p.evaluate(() => window.__spikeMarks);
      scriptToPaint.push(m.scriptToPaintMs);
      if (m.fcp != null) fcp.push(m.fcp);
      if (m.tabsQueryMs != null) tabsQuery.push(m.tabsQueryMs);
      docToPaint.push(m.rowsPainted);               // relative to timeOrigin = doc start
      await p.close();
    }
    return { label, paramCount: 7,
             scriptToRowsPaintedMs: stats(scriptToPaint),
             docStartToRowsPaintedMs: stats(docToPaint),
             firstContentfulPaintMs: stats(fcp),
             tabsQueryMs: stats(tabsQuery) };
  };

  report.runA.preSeeded = await collect('?u=' + encodeURIComponent(TEST_URL), 'pre-seeded (?u=, sync render)');
  report.runA.viaQuery  = await collect('?slow=1&u=' + encodeURIComponent(TEST_URL), 'via chrome.tabs.query (await before render)');

  /* =====================================================================
     RUN B - spike 0-1: does the popup survive chrome.tabs.update()?
     ===================================================================== */
  await clearLog();
  const attempts = [];

  // B1: openPopup() from the service worker (no user gesture)
  try {
    const r = await sw.evaluate(async () => {
      try { await chrome.action.openPopup(); return { ok: true }; }
      catch (e) { return { ok: false, error: String(e) }; }
    });
    attempts.push({ how: 'service worker, no gesture', ...r });
  } catch (e) { attempts.push({ how: 'service worker, no gesture', ok: false, error: String(e) }); }

  // B2: openPopup({windowId}) from an extension page with a real click gesture.
  try {
    const win2 = await probe.evaluate(u => chrome.windows.create({ url: u, focused: true }).then(w => w.id), TEST_URL);
    await sleep(800);
    const trig = await ctx.newPage();
    await trig.goto(extUrl('trigger.html?win=' + win2));
    await trig.click('#seed-open');
    await trig.waitForFunction(() => window.__triggerResult, null, { timeout: 8000 }).catch(() => {});
    const res = await trig.evaluate(() => window.__triggerResult).catch(() => null);
    attempts.push({ how: 'extension page, real click gesture, windowId', ...(res || { ok: false, error: 'no result' }) });
    await sleep(3500);                              // let autoapply + navigation happen
  } catch (e) { attempts.push({ how: 'extension page, real click gesture, windowId', ok: false, error: String(e) }); }

  const log = await readLog();
  const connects = log.filter(e => e.type === 'popup-connect');
  const disconnects = log.filter(e => e.type === 'popup-disconnect');
  const applied = log.filter(e => e.type === 'popup-msg' && e.phase === 'pre-apply');

  let verdict;
  if (!connects.length) {
    verdict = 'INCONCLUSIVE - no real popup ever opened in this environment';
  } else if (!applied.length) {
    verdict = 'INCONCLUSIVE - popup opened but never reached the apply step';
  } else if (!disconnects.length) {
    verdict = 'SURVIVES - popup still connected after tabs.update()';
  } else {
    const d = disconnects[disconnects.length - 1];
    verdict = (d.msAfterApply != null && d.msAfterApply < 1500)
      ? `DIES - popup disconnected ${d.msAfterApply}ms after apply (lastPhase=${d.lastPhase})`
      : `SURVIVES apply, closed later (${d.msAfterApply}ms after apply, lastPhase=${d.lastPhase})`;
  }
  report.runB = { attempts, verdict, connects: connects.length, applies: applied.length,
                  disconnects: disconnects.map(d => ({ aliveMs: d.aliveMs, msAfterApply: d.msAfterApply, lastPhase: d.lastPhase })),
                  log };

  await ctx.close(); server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

  /* ---- console summary ---- */
  const L = (k, s) => s ? `${k.padEnd(30)} n=${String(s.n).padEnd(3)} p50=${String(s.p50).padEnd(8)} p90=${String(s.p90).padEnd(8)} max=${s.max}` : `${k.padEnd(30)} n/a`;
  console.log('\n================ SPIKE RESULT ================');
  console.log('chrome:', report.chrome, ' extId:', EXT_ID, ' iterations:', ITER);
  for (const key of ['preSeeded', 'viaQuery']) {
    const r = report.runA[key];
    console.log(`\n-- ${r.label}`);
    console.log(L('script -> rows painted (ms)', r.scriptToRowsPaintedMs));
    console.log(L('doc start -> rows painted', r.docStartToRowsPaintedMs));
    console.log(L('first-contentful-paint', r.firstContentfulPaintMs));
    console.log(L('chrome.tabs.query', r.tabsQueryMs));
  }
  console.log('\n-- 0-1 popup survival');
  for (const a of report.runB.attempts) console.log('   attempt:', a.how, '->', a.ok ? 'ok' : 'FAILED: ' + (a.error || '').slice(0, 160));
  console.log('   connects:', report.runB.connects, 'applies:', report.runB.applies, 'disconnects:', report.runB.disconnects.length);
  console.log('   VERDICT:', report.runB.verdict);
  console.log('\nfull json ->', OUT);
  console.log('==============================================\n');
})().catch(e => { console.error('SPIKE FAILED:', e); process.exit(1); });
