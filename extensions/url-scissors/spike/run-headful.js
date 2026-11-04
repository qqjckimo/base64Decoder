'use strict';
/* 0-1 under REAL headful Chrome on an Xvfb display, so window focus semantics
   exist. Validity gate: control CF (focus another window -> popup must die)
   MUST pass, otherwise a "survives navigation" result means nothing.
   Also captures the real popup bubble via `import -window root`, which
   Playwright cannot screenshot. */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const http = require('http'); const path = require('path');
const os = require('os'); const fs = require('fs');

const EXT  = path.resolve(__dirname, '..');
const DISP = process.env.SPIKE_DISPLAY || ':99';
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'spike-shots');
const OUT  = process.env.OUT || path.join(os.tmpdir(), 'spike-headful.json');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => {
  try { execSync(`import -window root -display ${DISP} ${path.join(SHOTS, name + '.png')}`,
                 { stdio: 'pipe', timeout: 20000 }); return true; }
  catch (e) { return false; }
};

(async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>target</title><body style="font:14px system-ui">target page<br>' + req.url);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const PORT = server.address().port;
  const FEW  = `http://127.0.0.1:${PORT}/search?q=hello%20world&hl=zh-TW&num=20&safe=off`;
  const MANY = `http://127.0.0.1:${PORT}/many?` +
    Array.from({ length: 28 }, (_, i) => `param${i}=value%20${i}`).join('&');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spike-hf-'));
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: false,                                  // genuinely headful
    executablePath: '/opt/pw-browsers/chromium',
    env: { ...process.env, DISPLAY: DISP },
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1200,820', '--window-position=0,0',
           `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 20000 });
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
  const dis = l => l.filter(e => e.type === 'popup-disconnect')
                    .map(e => ({ aliveMs: e.aliveMs, msAfterApply: e.msAfterApply, lastPhase: e.lastPhase }));

  const R = { display: DISP, shots: SHOTS, cases: {} };

  const makeWindow = async (url, w, h) => {
    const info = await probe.evaluate(o =>
      chrome.windows.create({ url: o.url, focused: true, type: 'normal', width: o.w, height: o.h })
        .then(x => ({ id: x.id, width: x.width, height: x.height })), { url, w, h });
    await sleep(1600);
    const t = await probe.evaluate(i =>
      chrome.tabs.query({ active: true, windowId: i }).then(([x]) => ({ id: x.id, url: x.url })), info.id);
    return { win: info, tab: t };
  };
  const fire = async (win, tabId, popupPath) => {
    await trig.goto(extUrl('trigger.html?win=' + win + '&tab=' + tabId +
                           '&popup=' + encodeURIComponent(popupPath)));
    await sleep(200);
    await trig.click('#seed-open');          // trigger.js focuses the window itself
    await trig.waitForFunction(() => window.__triggerResult, null, { timeout: 10000 }).catch(() => {});
    return trig.evaluate(() => window.__triggerResult).catch(() => null);
  };

  /* ===== T1: real http navigation, normal-size window, few params ===== */
  const A = await makeWindow(FEW, 1200, 820);
  await clear();
  R.cases.T1 = { target: A.tab, trigger: await fire(A.win.id, A.tab.id, 'popup.html?tab=__TAB__') };
  await sleep(1400);
  R.cases.T1.shotOpen = shot('01-popup-open-few-params');
  R.cases.T1.logBeforeApply = dis(await log());

  // apply from the already-open popup by reopening with autoapply is not possible
  // (Chrome refuses a 2nd openPopup), so this popup was opened with autoapply off;
  // close it, then run a dedicated autoapply popup.
  await probe.evaluate(w => chrome.windows.update(w, { focused: true }), homeWin);
  await sleep(900);
  R.cases.T1.logAfterRefocus = dis(await log());
  R.cases.T1.focusDismissWorks = R.cases.T1.logAfterRefocus.length > 0;

  /* ===== CF gate + T2: apply with navigation ===== */
  await clear();
  R.cases.T2 = { trigger: await fire(A.win.id, A.tab.id,
                   'popup.html?tab=__TAB__&autoapply=1&delay=900&mutate=applied') };
  await sleep(800); R.cases.T2.shotBefore = shot('02-before-apply');
  await sleep(2600);
  R.cases.T2.shotAfter = shot('03-after-apply-navigated');
  R.cases.T2.log = await log();
  R.cases.T2.disconnects = dis(R.cases.T2.log);
  R.cases.T2.applies = R.cases.T2.log.filter(e => e.type === 'popup-msg' && e.phase === 'pre-apply').map(e => e.url);
  R.cases.T2.navs = R.cases.T2.log.filter(e => e.type === 'tab-updated' && e.url).map(e => e.url);
  R.cases.T2.tabAfter = await probe.evaluate(t =>
    chrome.tabs.get(t).then(x => x.url).catch(e => String(e)), A.tab.id);

  /* ===== sizing: many params (inner scroll) ===== */
  await probe.evaluate(w => chrome.windows.update(w, { focused: true }), homeWin); await sleep(900);
  await clear();
  const B = await makeWindow(MANY, 1200, 820);
  R.cases.SIZE_MANY = { trigger: await fire(B.win.id, B.tab.id, 'popup.html?tab=__TAB__') };
  await sleep(1400); R.cases.SIZE_MANY.shot = shot('04-many-params-inner-scroll');
  R.cases.SIZE_MANY.marks = (await log()).filter(e => e.type === 'popup-marks').map(e => e.marks && e.marks.sizing);
  R.cases.SIZE_MANY.box = (await log()).filter(e => e.type === 'popup-marks').map(e => e.marks && e.marks.bodyRect);

  /* ===== sizing: short browser window (must clamp, not overflow) ===== */
  await probe.evaluate(w => chrome.windows.update(w, { focused: true }), homeWin); await sleep(900);
  await clear();
  const C = await makeWindow(MANY, 760, 460);
  R.cases.SIZE_SMALL = { window: C.win, trigger: await fire(C.win.id, C.tab.id, 'popup.html?tab=__TAB__') };
  await sleep(1400); R.cases.SIZE_SMALL.shot = shot('05-small-window-clamped');
  const lg = await log();
  R.cases.SIZE_SMALL.marks = lg.filter(e => e.type === 'popup-marks').map(e => e.marks && e.marks.sizing);
  R.cases.SIZE_SMALL.box = lg.filter(e => e.type === 'popup-marks').map(e => e.marks && e.marks.bodyRect);

  await ctx.close(); server.close();
  fs.writeFileSync(OUT, JSON.stringify(R, null, 2));

  console.log('\n============ HEADFUL (Xvfb ' + DISP + ') ============');
  console.log('CF GATE  focus-away dismisses popup :', R.cases.T1.focusDismissWorks ? 'YES (focus semantics real)' : 'NO  (focus still fake -> T2 inconclusive)');
  console.log('         disconnect on refocus      :', JSON.stringify(R.cases.T1.logAfterRefocus));
  console.log('\nT2 apply -> navigation');
  console.log('   applied url :', R.cases.T2.applies[0]);
  console.log('   navigated   :', R.cases.T2.navs.filter(u => u.startsWith('http')));
  console.log('   tab after   :', R.cases.T2.tabAfter);
  console.log('   disconnects :', JSON.stringify(R.cases.T2.disconnects));
  const survived = R.cases.T2.applies.length > 0 &&
                   R.cases.T2.navs.some(u => u.includes('spike=applied')) &&
                   R.cases.T2.disconnects.length === 0;
  console.log('   VERDICT     :', survived ? 'SURVIVES navigation' : 'DIES or inconclusive');
  console.log('\nsizing  many params  :', JSON.stringify(R.cases.SIZE_MANY.marks), JSON.stringify(R.cases.SIZE_MANY.box));
  console.log('sizing  small window :', JSON.stringify(R.cases.SIZE_SMALL.marks), JSON.stringify(R.cases.SIZE_SMALL.box));
  console.log('\nshots ->', SHOTS);
  console.log('json  ->', OUT);
  console.log('====================================================\n');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
