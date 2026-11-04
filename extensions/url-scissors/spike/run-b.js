'use strict';
/* 0-1 with valid controls. Chrome REFUSES a second openPopup() while one is
   open, so every case must start from a dismissed state.
   Order matters: T1 (the real question) runs first, on a clean browser. */
const { chromium } = require('playwright');
const http = require('http'); const path = require('path');
const os = require('os'); const fs = require('fs');

const EXT = path.resolve(__dirname, '..');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'spike-b.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>t</title><body>' + req.url);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const PORT = server.address().port;
  const TEST_URL = `http://127.0.0.1:${PORT}/page?a=1&b=2`;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spike-b-'));
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: false, executablePath: '/opt/pw-browsers/chromium',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu',
           `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const ID = new URL(sw.url()).host;
  const extUrl = p => `chrome-extension://${ID}/${p}`;

  const probe = await ctx.newPage(); await probe.goto(extUrl('results.html'));
  const homeWin = await probe.evaluate(() => chrome.windows.getCurrent().then(w => w.id));
  const trig = await ctx.newPage(); await trig.goto('about:blank');

  const clear = () => probe.evaluate(async () => {
    const all = await chrome.storage.local.get(null);
    await chrome.storage.local.remove(Object.keys(all).filter(k => k.startsWith('log:')));
  });
  const log = () => probe.evaluate(async () => {
    const all = await chrome.storage.local.get(null);
    return Object.keys(all).filter(k => k.startsWith('log:')).sort().map(k => all[k]);
  });
  // Dismiss any open popup by focusing another window (what a user click-away does).
  const dismiss = async () => {
    await probe.evaluate(w => chrome.windows.update(w, { focused: true }), homeWin);
    await sleep(700);
  };

  const win = await probe.evaluate(u =>
    chrome.windows.create({ url: u, focused: true, type: 'normal' })
      .then(w => ({ id: w.id, tabs: w.tabs.map(t => t.id) })), TEST_URL);
  await sleep(1200);
  const seen = await probe.evaluate(w =>
    chrome.tabs.query({ active: true, windowId: w }).then(([t]) => ({ id: t.id, url: t.url })), win.id);

  const fire = async popupPath => {
    await trig.goto(extUrl('trigger.html?win=' + win.id + '&tab=' + seen.id +
                           '&popup=' + encodeURIComponent(popupPath)));
    await probe.evaluate(w => chrome.windows.update(w, { focused: true }), win.id);
    await sleep(300);
    await trig.click('#seed-open');
    await trig.waitForFunction(() => window.__triggerResult, null, { timeout: 8000 }).catch(() => {});
    return trig.evaluate(() => window.__triggerResult).catch(() => null);
  };

  const R = { testUrl: TEST_URL, window: win, target: seen, cases: {} };
  const run = async (name, popupPath, waitMs, after) => {
    await dismiss(); await clear();
    const trigger = await fire(popupPath);
    await sleep(waitMs);
    const mid = await log();
    const extra = after ? await after() : null;
    R.cases[name] = { trigger, log: mid, extra };
  };

  // ---- T1: the real question. Apply a DIFFERENT url to a real http tab.
  await run('T1', 'popup.html?u=__URL__&tab=__TAB__&autoapply=1&delay=600&mutate=applied', 4000,
    () => probe.evaluate(t => chrome.tabs.get(t).then(x => x.url).catch(e => String(e)), seen.id));

  // ---- C2': is the popup still alive right now, and does an external dismissal register?
  R.cases.T1.afterDismiss = await (async () => {
    await dismiss();
    const l = await log();
    return l.filter(e => e.type === 'popup-disconnect')
            .map(e => ({ aliveMs: e.aliveMs, msAfterApply: e.msAfterApply, lastPhase: e.lastPhase }));
  })();

  // ---- C1: instrument validity, popup closes itself
  await run('C1', 'popup.html?u=__URL__&tab=__TAB__&autoclose=600', 2500);

  await ctx.close(); server.close();
  fs.writeFileSync(OUT, JSON.stringify(R, null, 2));

  const sum = c => {
    const l = R.cases[c].log || [];
    return {
      openOk: R.cases[c].trigger && R.cases[c].trigger.ok,
      openErr: R.cases[c].trigger && R.cases[c].trigger.error,
      targetSeenByTrigger: R.cases[c].trigger && R.cases[c].trigger.targetUrl,
      connects: l.filter(e => e.type === 'popup-connect').length,
      applies: l.filter(e => e.type === 'popup-msg' && e.phase === 'pre-apply').map(e => e.url),
      navs: l.filter(e => e.type === 'tab-updated' && e.url).map(e => e.url),
      disconnects: l.filter(e => e.type === 'popup-disconnect')
                    .map(e => ({ aliveMs: e.aliveMs, msAfterApply: e.msAfterApply, lastPhase: e.lastPhase })),
    };
  };
  console.log('\n============ 0-1 WITH VALID CONTROLS ============');
  console.log('target window', win.id, 'tab', seen.id, seen.url);
  console.log('\nT1 (apply real http navigation):', JSON.stringify(sum('T1'), null, 1));
  console.log('T1 tab url after apply:', R.cases.T1.extra);
  console.log('T1 disconnects after external dismiss:', JSON.stringify(R.cases.T1.afterDismiss));
  console.log('\nC1 (control, popup self-closes):', JSON.stringify(sum('C1'), null, 1));
  console.log('\njson ->', OUT);
  console.log('=================================================\n');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
