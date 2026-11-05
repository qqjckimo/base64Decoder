'use strict';
/* URL Scissors bench.
 *
 *   node bench/run.js open     [N=30]   open latency, P75, delta over floor
 *   node bench/run.js runtime  [N=3]    input -> next paint, P75, delta over floor
 *   node bench/run.js func              end-to-end behaviour checks (302, alt, draft, focus)
 *
 * Needs an X display with a window manager (see bench/README.md).
 *
 * Methodology: three extensions are loaded into ONE browser and driven with
 * real X key presses, interleaved, so drift hits all of them equally:
 *   product  - the real popup (+ bench hook)
 *   floorA   - a popup of the same size that does nothing
 *   floorB   - identical to floorA: the A/A control. |floorA - floorB| is the
 *              measurement noise; a budget smaller than it is meaningless.
 * Budgets are P75(product) - P75(floor), with a bootstrap 95% CI.
 */
const L = require('./lib');
const fs = require('fs'), os = require('os'), path = require('path');

const scenario = process.argv[2] || 'open';
const N = Number(process.argv[3] || (scenario === 'open' ? 30 : 3));
const OUT = process.env.BENCH_OUT || path.join(os.tmpdir(), `us-bench-${scenario}.json`);

const VARIANTS = [
  { label: 'product', kind: 'product', key: 'Alt+Shift+U', x: 'alt+shift+u' },
  { label: 'floorA',  kind: 'floor',   key: 'Alt+Shift+J', x: 'alt+shift+j' },
  { label: 'floorB',  kind: 'floor',   key: 'Alt+Shift+K', x: 'alt+shift+k' },
];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function setup(mode, variants = VARIANTS) {
  const env = await L.startServer();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'us-builds-'));
  const builds = variants.map(v => ({ ...v, ...L.build(root, { label: v.label, mode, port: env.port, kind: v.kind, key: v.key }) }));
  const { ctx, prof } = await L.launch(builds);
  const page = ctx.pages()[0] || await ctx.newPage();
  await L.sleep(800);
  return { ...env, builds, ctx, prof, page, win: L.browserWindow() };
}

// Cold = no popup process alive. `base` is the count with no popup open (a
// keepalive variant holds one process permanently).
async function waitNoExtProcess(prof, base = 0, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (L.extensionProcesses(prof).length <= base) return true; await L.sleep(20); }
  return false;
}

/* ================================ open ================================ */
async function open() {
  const extra = (process.env.BENCH_VARIANTS || '').split(',').filter(Boolean);
  const variants = [...VARIANTS];
  if (extra.includes('keepalive')) variants.push({ label: 'keepalive', kind: 'keepalive', key: 'Alt+Shift+L', x: 'alt+shift+l' });
  if (extra.includes('pinned')) {
    variants.push({ label: 'productPinned', kind: 'product', key: 'Alt+Shift+Y', x: 'alt+shift+y', pinned: true });
    variants.push({ label: 'floorPinned',   kind: 'floor',   key: 'Alt+Shift+O', x: 'alt+shift+o', pinned: true });
  }
  if (extra.includes('keepalivePinned'))
    variants.push({ label: 'keepalivePinned', kind: 'keepalive', key: 'Alt+Shift+L', x: 'alt+shift+l', pinned: true });
  const E = await setup('perf', variants);
  // 7 params: a realistic tracking-heavy URL.
  await E.page.goto(`http://127.0.0.1:${E.port}/s?utm_source=news&utm_medium=email&utm_campaign=fall&q=hello%20world&lang=zh-TW&flag&id=12345`);
  await L.sleep(1200);
  const base = L.extensionProcesses(E.prof).length;
  console.log('xdotool spawn overhead (median):', L.calibrateKey().toFixed(1), 'ms');
  console.log('extension processes with no popup open:', base);

  const samples = [];
  // one discarded warm-up round: the very first open after browser start also
  // pays one-off costs (disk cache, first extension load) that users hit once
  for (let round = -1; round < N; round++) {
    for (const v of shuffle([...E.builds])) {
      const cold = await waitNoExtProcess(E.prof, base);
      L.activate(E.win);
      await L.sleep(250);
      const tIn = L.key(v.x);
      const r = await L.waitFor(E.inbox.open, o => o.label === v.label && o.timeOrigin > tIn - 50, 8000);
      await L.sleep(200);
      L.key('Escape');
      if (!r || round < 0) continue;
      const m = r.marks || {};
      samples.push({
        label: v.label, cold,
        total: r.readyEpoch - tIn,                         // key press -> rows painted
        inputToDoc: r.timeOrigin - tIn,                    // Chrome: accelerator -> popup document start
        docToBoot: m['us:boot'],                           // HTML parse + script fetch/compile
        apiBind: m['us:api:storage'] != null ? m['us:api:storage'] - m['us:api'] : null,
        bindTabs: m['us:api:tabs'] != null ? m['us:api:tabs'] - m['us:api'] : null,
        bindWindows: m['us:api:windows'] != null ? m['us:api:windows'] - m['us:api:tabs'] : null,
        bindStorage: m['us:api:storage'] != null ? m['us:api:storage'] - m['us:api:windows'] : null,
        ipc: m['us:ipc'] != null ? m['us:ipc'] - m['us:api:storage'] : null,
        ipcTabs: m['us:ipc:tabs'] != null ? m['us:ipc:tabs'] - m['us:api:storage'] : null,
        ipcWindows: m['us:ipc:windows'] != null ? m['us:ipc:windows'] - m['us:api:storage'] : null,
        ipcStorage: m['us:ipc:storage'] != null ? m['us:ipc:storage'] - m['us:api:storage'] : null,
        render: m['us:render'] != null && m['us:ipc'] != null ? m['us:render'] - m['us:ipc'] : null,
        renderToPaint: r.readyPainted - (m['us:render'] || 0),
        docToPaint: r.readyPainted,
        load: r.load, renderedAfterLoad: r.load != null && m['us:render'] > r.load,
        box: r.box,
      });
    }
  }
  await E.ctx.close(); E.srv.close();

  const by = l => samples.filter(s => s.label === l);
  const col = (l, k) => by(l).map(s => s[k]).filter(v => v != null);
  const res = { n: N, samples, summary: {} };
  const labels = variants.map(v => v.label);
  for (const l of labels) {
    res.summary[l] = {};
    for (const k of ['total', 'inputToDoc', 'docToBoot', 'apiBind', 'ipc', 'ipcTabs', 'ipcWindows', 'ipcStorage', 'render', 'renderToPaint', 'docToPaint'])
      if (col(l, k).length) res.summary[l][k] = L.stats(col(l, k));
    res.summary[l].coldShare = by(l).filter(s => s.cold).length + '/' + by(l).length;
    res.summary[l].renderedAfterLoad = by(l).filter(s => s.renderedAfterLoad).length + '/' + by(l).length;
  }
  res.deltaProductFloor = L.p75DeltaCI(col('product', 'total'), [...col('floorA', 'total'), ...col('floorB', 'total')]);
  res.noiseAA = L.p75DeltaCI(col('floorA', 'total'), col('floorB', 'total'));
  fs.writeFileSync(OUT, JSON.stringify(res, null, 2));

  const f = s => s ? `p50 ${String(s.p50).padStart(6)}  p75 ${String(s.p75).padStart(6)}  p90 ${String(s.p90).padStart(6)}` : '';
  console.log(`\n================ OPEN  (key press -> rows painted, N=${N} per variant) ================`);
  for (const l of labels) {
    const S = res.summary[l];
    console.log(`\n${l}   cold=${S.coldShare}  renderedAfterLoad=${S.renderedAfterLoad}`);
    for (const k of Object.keys(S)) if (S[k] && S[k].p75 != null) console.log(`  ${k.padEnd(14)} ${f(S[k])}`);
  }
  const d = res.deltaProductFloor, a = res.noiseAA;
  console.log(`\nP75 product - floor : ${d.delta}ms   95% CI [${d.lo}, ${d.hi}]`);
  console.log(`P75 floorA - floorB : ${a.delta}ms   95% CI [${a.lo}, ${a.hi}]   <- A/A noise`);
  if (labels.includes('productPinned')) {
    const p = L.p75DeltaCI(col('productPinned', 'total'), col('product', 'total'));
    const fp = L.p75DeltaCI(col('productPinned', 'total'), col('floorPinned', 'total'));
    Object.assign(res, { pinnedVsUnpinned: p, pinnedProductVsPinnedFloor: fp });
    console.log(`P75 productPinned - product     : ${p.delta}ms   95% CI [${p.lo}, ${p.hi}]`);
    console.log(`P75 productPinned - floorPinned : ${fp.delta}ms   95% CI [${fp.lo}, ${fp.hi}]`);
    fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
  }
  if (labels.includes('keepalivePinned')) {
    const k = L.p75DeltaCI(col('keepalivePinned', 'total'), col('productPinned', 'total'));
    res.keepalivePinnedVsPinned = k;
    console.log(`P75 keepalivePinned - productPinned : ${k.delta}ms   95% CI [${k.lo}, ${k.hi}]`);
    fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
  }
  if (labels.includes('keepalive')) {
    const k = L.p75DeltaCI(col('keepalive', 'total'), col('product', 'total'));
    res.keepaliveVsProduct = k;
    console.log(`P75 keepalive - product : ${k.delta}ms   95% CI [${k.lo}, ${k.hi}]`);
    fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
  }
  console.log(`\njson -> ${OUT}\n`);
}

/* ============================== runtime ==============================
   input event timestamp -> after the next paint, real X input, P75.
   Typing is compared against the floor (a bare <input>); clicks are absolute. */
async function runtime() {
  const vs = [
    { label: 'product', kind: 'product', key: 'Alt+Shift+U', x: 'alt+shift+u', pinned: true },
    { label: 'floorA',  kind: 'floor',   key: 'Alt+Shift+J', x: 'alt+shift+j', pinned: true },
  ];
  const E = await setup('perf', vs);
  // 16 params: the popup is already at its max height, so the footer (and the
  // "+" button) does not move as rows are added and clicks keep hitting it.
  await E.page.goto(`http://127.0.0.1:${E.port}/s?` + Array.from({ length: 16 }, (_, i) => `p${i}=value%20${i}`).join('&'));
  await L.sleep(1200);
  L.calibrateKey();
  const TEXT = 'the quick brown fox 0123456789';
  for (let r = 0; r < N; r++) {
    for (const v of shuffle([...E.builds])) {
      L.activate(E.win); await L.sleep(250);
      const t = L.key(v.x);
      const o = await L.waitFor(E.inbox.open, x => x.label === v.label && x.timeOrigin > t - 50, 8000);
      if (!o) continue;
      await L.sleep(250);
      L.type(TEXT, 70);                                 // ~14 keys/s, a fast typist
      await L.sleep(300);
      const pos = v.label === 'product' && await L.waitFor(E.inbox.pos, x => x.timeOrigin === o.timeOrigin, 2000);
      if (pos && pos.add) {
        for (let i = 0; i < 4; i++) { L.click(pos.add[0], pos.add[1]); await L.sleep(220); }
        for (let i = 0; i < 4; i++) { if (pos.del0) L.click(pos.del0[0], pos.del0[1]); await L.sleep(220); }
      }
      L.key('Escape');
      await L.sleep(400);
    }
  }
  await L.sleep(500);
  await E.ctx.close(); E.srv.close();

  const lat = l => E.inbox.runtime.filter(x => x.label === l).flatMap(x => x.lat);
  const pick = (l, k) => lat(l).filter(x => x[0] === k || (k.endsWith('*') && x[0].startsWith(k.slice(0, -1)))).map(x => x[1]);
  const res = {
    typing: { product: L.stats(pick('product', 'key')), floor: L.stats(pick('floorA', 'key')),
              delta: L.p75DeltaCI(pick('product', 'key'), pick('floorA', 'key')) },
    clickAdd: L.stats(pick('product', 'click:add')),
    clickDelete: L.stats(pick('product', 'click:del')),
  };
  fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
  const f = s => s && s.n ? `n=${String(s.n).padEnd(4)} p50 ${String(s.p50).padStart(5)}  p75 ${String(s.p75).padStart(5)}  p90 ${String(s.p90).padStart(5)}  max ${s.max}` : 'n=0';
  console.log(`\n============ RUNTIME (input -> next paint, real X input) ============`);
  console.log(`typing   product  ${f(res.typing.product)}`);
  console.log(`typing   floor    ${f(res.typing.floor)}`);
  console.log(`         P75 product - floor: ${res.typing.delta.delta}ms  95% CI [${res.typing.delta.lo}, ${res.typing.delta.hi}]`);
  console.log(`click    + 參數   ${f(res.clickAdd)}`);
  console.log(`click    ✕ 刪除   ${f(res.clickDelete)}`);
  console.log(`\njson -> ${OUT}\n`);
}

/* ================================ func ================================
   End-to-end behaviour with real input. Each check reads what the popup
   actually shows (state beacons), never internal variables. */
async function func() {
  const vs = [{ label: 'product', kind: 'product', key: 'Alt+Shift+U', x: 'alt+shift+u', pinned: true }];
  const E = await setup('func', vs);
  const P = E.port, O = `http://127.0.0.1:${P}`;
  L.calibrateKey();
  const results = [];
  const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`); };
  const lastState = () => E.inbox.state[E.inbox.state.length - 1];
  const stateWhere = (pred, ms = 4000) => L.waitFor(E.inbox.state.slice().reverse(), pred, 10)
    .then(h => h || (async () => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = lastState(); if (s && pred(s)) return s; await L.sleep(40); } return lastState(); })());
  const openPopup = async () => {
    L.activate(E.win); await L.sleep(300);
    const n = E.inbox.state.length;
    L.key('alt+shift+u');
    const t0 = Date.now();
    while (Date.now() - t0 < 5000 && E.inbox.state.length === n) await L.sleep(30);
    await L.sleep(300);
    return lastState();
  };
  const scr = (st, k) => st && st.at_ && st.at_[k] ? [st.screen[0] + st.at_[k][0], st.screen[1] + st.at_[k][1]] : null;

  // F1 render: decoded vs raw, `?flag`, focus ready to type
  await E.page.goto(`${O}/s?q=hello%20world&x=%2F&flag&lang=zh-TW`); await L.sleep(900);
  let st = await openPopup();
  check('F1 opens with activeTab only (no tabs permission) and reads the URL', st && st.rows && st.rows.length === 4, st && JSON.stringify(st.rows));
  check('F1 decoded where lossless, raw (marked) where not', st && st.rows[0][1] === 'hello world' && st.rows[1][1] === '%2F' && st.rows[1][2] === true);
  check('F1 focus is in the first value, ready to type', st && st.focus && /\bv\b/.test(st.focus.cls) && st.focus.row === '0');
  L.key('Escape'); await L.sleep(500);

  // F2 apply -> same-origin 302: main follows the address bar, alt keeps the original
  await E.page.goto(`${O}/r?go=x&k=1`); await L.sleep(900);
  st = await openPopup();
  L.key('ctrl+a'); L.type('same', 40); await L.sleep(200);
  L.key('Return');
  st = await stateWhere(s => s.alt && s.alt.kind === 'redirect', 5000);
  check('F2 popup stays open after apply', !!st && Date.now() - st.at < 4000);
  check('F2 main shows the CURRENT (post-redirect) URL', st && /\/landed\?from=same&kept=1$/.test(st.preview), st && st.preview);
  check('F2 secondary shows the URL that was applied, labelled, collapsed',
        st && st.alt && /\/r\?go=same&k=1$/.test(st.alt.url) && st.alt.open === false && /轉址/.test(st.alt.label), st && JSON.stringify(st.alt));
  check('F2 focus did not fall to <body>', st && st.focus && st.focus.cls && st.focus.cls.includes('field'), st && JSON.stringify(st.focus));

  // F3 edit the secondary URL and apply it: navigation starts from the edited one
  const sum = scr(st, 'altSum');
  if (sum) { L.click(sum[0], sum[1]); await L.sleep(350); }
  st = lastState();
  const ta = scr(st, 'altUrl');
  if (ta) { L.click(ta[0], ta[1]); await L.sleep(200); }
  L.key('ctrl+a'); L.type(`${O}/r?go=same&k=2`, 8); await L.sleep(200);
  L.key('Return');
  st = await stateWhere(s => s.alt && /k=2$/.test(s.alt.url) && /landed/.test(s.preview), 5000);
  check('F3 applying the edited secondary URL navigates from it', st && st.alt && /\/r\?go=same&k=2$/.test(st.alt.url) && /\/landed\?from=same/.test(st.preview),
        st && `alt=${st.alt && st.alt.url} main=${st.preview}`);

  // F4 cross-origin redirect: what can activeTab still see?
  L.key('Escape'); await L.sleep(400);
  await E.page.goto(`${O}/r?go=x&k=1`); await L.sleep(900);
  st = await openPopup();
  L.key('ctrl+a'); L.type('cross', 40); await L.sleep(200); L.key('Return');
  await L.sleep(1800);
  st = lastState();
  const crossVisible = st && /localhost:\d+\/landed\?from=cross/.test(st.preview);
  check('F4 cross-origin redirect is handled', st && (crossVisible || st.alt), st && (crossVisible ? 'main=' + st.preview : 'unreadable, alt offered'));
  results.push({ name: 'F4 detail', crossOriginUrlVisible: crossVisible, note: st && st.note, alt: st && st.alt });
  check('F4 main does not pretend: no stale URL is left in the editor', st && (crossVisible || (st.preview === '' && st.rows.length === 0)), st && `preview="${st.preview}" rows=${st.rows.length}`);
  check('F4 the applied URL is offered in the secondary area', st && st.alt && /\/r\?go=cross&k=1$/.test(st.alt.url), st && JSON.stringify(st.alt));
  L.key('Escape'); await L.sleep(400);
  st = await openPopup();                                              // a new gesture re-grants activeTab
  check('F4 reopening reads the cross-origin landing URL, original still offered',
        st && /localhost:\d+\/landed\?from=cross/.test(st.preview) && st.alt && /go=cross/.test(st.alt.url), st && `main=${st.preview} alt=${st.alt && st.alt.url}`);

  // F5 unapplied edits survive the popup being closed by a tab switch
  L.key('Escape'); await L.sleep(400);
  await E.page.goto(`${O}/s?a=1&b=2`); await L.sleep(900);
  st = await openPopup();
  L.key('ctrl+a'); L.type('draft-value', 30); await L.sleep(600);     // > the 250ms draft debounce... and also pagehide
  L.activate(E.win); L.key('ctrl+t'); await L.sleep(700);              // new tab: popup closes
  L.key('ctrl+w'); await L.sleep(700);                                 // back to the original tab
  st = await openPopup();
  check('F5 main is WYSIWYG on reopen (current URL, not the draft)', st && /\/s\?a=1&b=2$/.test(st.preview), st && st.preview);
  check('F5 the unapplied draft is offered in the secondary area', st && st.alt && st.alt.kind === 'draft' && /a=draft-value/.test(st.alt.url), st && JSON.stringify(st.alt));
  L.key('Escape'); await L.sleep(300);

  await E.ctx.close(); E.srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  const fails = results.filter(r => r.ok === false).length;
  console.log(`\n${results.filter(r => r.ok === true).length} passed, ${fails} failed   json -> ${OUT}\n`);
  process.exitCode = fails ? 1 : 0;
}

module.exports = { setup, waitNoExtProcess, VARIANTS };
if (require.main === module) {
  const fn = { open, runtime, func }[scenario];
  if (!fn) { console.error('unknown scenario', scenario); process.exit(2); }
  fn().catch(e => { console.error(e); process.exit(1); });
}
