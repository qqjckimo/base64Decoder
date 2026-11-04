'use strict';
/* URL Scissors - spike build.
   Purpose: be the REAL render path so the numbers mean something, while
   reporting enough telemetry to answer spike questions 0-1 / 0-2 / 0-3. */

const T_SCRIPT = performance.now();          // script start, relative to timeOrigin
const M = { timeOrigin: performance.timeOrigin, scriptStart: T_SCRIPT };

const Q = new URLSearchParams(location.search);
const PRE_URL   = Q.get('u');                // pre-seeded URL (setPopup trick)
const AUTOAPPLY = Q.get('autoapply') === '1';
const APPLY_DELAY = Number(Q.get('delay') || 400);
const FORCE_SLOW  = Q.get('slow') === '1';   // ignore ?u= to measure the query path
const AUTOCLOSE   = Q.has('autoclose') ? Number(Q.get('autoclose')) : null; // negative control
const MUTATE      = Q.get('mutate');         // force the applied URL to differ

/* ---------- fidelity-preserving URL model -------------------------------
   Keys/values are kept RAW (still percent-encoded). Round-tripping through
   URLSearchParams would normalise `?a` vs `?a=`, rewrite + / %20 and
   re-encode untouched params - unacceptable for a debugging tool. */
function parseUrl(raw){
  const h = raw.indexOf('#');
  const hash  = h >= 0 ? raw.slice(h) : '';
  const noH   = h >= 0 ? raw.slice(0, h) : raw;
  const q     = noH.indexOf('?');
  const head  = q >= 0 ? noH.slice(0, q) : noH;
  const query = q >= 0 ? noH.slice(q + 1) : '';
  const params = query === '' ? [] : query.split('&').map(seg => {
    const eq = seg.indexOf('=');
    return eq < 0 ? { k: seg, v: null }                 // `?a` keeps no '='
                  : { k: seg.slice(0, eq), v: seg.slice(eq + 1) };
  });
  return { head, params, hash };
}
function serialize(m){
  const q = m.params
    .filter(p => p.k !== '' || p.v !== null)
    .map(p => p.v === null ? p.k : p.k + '=' + p.v)
    .join('&');
  return m.head + (q ? '?' + q : '') + m.hash;
}

/* ---------- state ---------- */
let model = { head: '', params: [], hash: '' };
let targetTabId = Q.has('tab') ? Number(Q.get('tab')) : null;
let dirty = false;

const elRows    = document.getElementById('rows');
const elBase    = document.getElementById('base');
const elPreview = document.getElementById('preview');
const elPerf    = document.getElementById('perf');
const TPL       = document.getElementById('row-tpl');

/* ---------- render: one template clone per row, one fragment, one append ---------- */
function render(){
  const frag = document.createDocumentFragment();
  for (let i = 0; i < model.params.length; i++){
    const p = model.params[i];
    const node = TPL.content.firstElementChild.cloneNode(true);
    node.dataset.i = i;
    node.querySelector('.k').value = p.k;
    node.querySelector('.v').value = p.v === null ? '' : p.v;
    frag.appendChild(node);
  }
  elRows.replaceChildren(frag);
  elBase.value = model.head + model.hash;
  updatePreview();
}
function updatePreview(){ elPreview.textContent = serialize(model); }

/* ---------- event delegation: one listener per event type, not 4xN ---------- */
elRows.addEventListener('input', e => {
  const row = e.target.closest('.row'); if (!row) return;
  const p = model.params[+row.dataset.i]; if (!p) return;
  if (e.target.classList.contains('k')) p.k = e.target.value;
  else p.v = e.target.value;
  dirty = true;
  updatePreview();                      // no debounce: it is one text node
});
elRows.addEventListener('click', e => {
  const btn = e.target.closest('.del'); if (!btn) return;
  model.params.splice(+btn.closest('.row').dataset.i, 1);
  dirty = true; render();
});
elBase.addEventListener('input', () => {
  const m = parseUrl(elBase.value);
  model.head = m.head; model.hash = m.hash;
  dirty = true; updatePreview();
});
document.getElementById('add').addEventListener('click', () => {
  model.params.push({ k: '', v: '' }); dirty = true; render();
  const last = elRows.lastElementChild; if (last) last.querySelector('.k').focus();
});
document.getElementById('apply').addEventListener('click', doApply);

/* ---------- apply: tabs.update is the FIRST thing, nothing awaited before it ---------- */
function doApply(){
  if (MUTATE) model.params.push({ k: 'spike', v: MUTATE });   // guarantee a real navigation
  const url = serialize(model);
  const t = performance.now();
  try { port && port.postMessage({ type: 'pre-apply', url, at: Date.now() }); } catch (_) {}
  if (targetTabId != null) chrome.tabs.update(targetTabId, { url });
  else chrome.tabs.query({ active: true, currentWindow: true })
            .then(([tab]) => tab && chrome.tabs.update(tab.id, { url }));
  M.applyDispatchMs = performance.now() - t;
  try { port && port.postMessage({ type: 'post-apply', at: Date.now(), applyDispatchMs: M.applyDispatchMs }); } catch (_) {}
  dirty = false;
}

/* ---------- 0-1 instrumentation: a long-lived port whose onDisconnect in the
             service worker is a reliable "this popup document died" signal ---------- */
let port = null;
try {
  port = chrome.runtime.connect({ name: 'popup-alive' });
  port.postMessage({ type: 'opened', at: Date.now(), href: location.href });
} catch (e) { M.portError = String(e); }

/* ---------- FCP ---------- */
try {
  new PerformanceObserver(list => {
    for (const e of list.getEntries())
      if (e.name === 'first-contentful-paint') M.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
} catch (_) {}

/* ---------- boot ---------- */
async function queryActiveUrl(){
  const t0 = performance.now();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  M.tabsQueryMs = performance.now() - t0;         // <- spike 0-3
  return tab;
}

function finishMeasure(path){
  M.path = path;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    M.rowsPainted = performance.now();
    M.scriptToPaintMs = M.rowsPainted - M.scriptStart;
    M.paramCount = model.params.length;
    window.__spikeMarks = M;                       // Playwright reads this
    elPerf.textContent =
      `path=${M.path}  params=${M.paramCount}\n` +
      `script->rows ${M.scriptToPaintMs.toFixed(2)}ms  fcp ${(M.fcp ?? -1).toFixed(2)}ms\n` +
      `tabs.query ${M.tabsQueryMs != null ? M.tabsQueryMs.toFixed(2) + 'ms' : 'n/a'}`;
    try { chrome.runtime.sendMessage({ type: 'marks', marks: M }); } catch (_) {}
  }));
}

(async function boot(){
  if (PRE_URL && !FORCE_SLOW){
    /* FAST PATH: render synchronously from location.search - no IPC before paint */
    model = parseUrl(PRE_URL);
    render();
    finishMeasure('pre-seeded');
    /* reconcile after paint; ?u= is best-effort, correctness comes from here */
    const tab = await queryActiveUrl();
    if (tab){
      if (targetTabId == null) targetTabId = tab.id;
      if (tab.url && tab.url !== PRE_URL && !dirty){ model = parseUrl(tab.url); render(); }
      M.preSeedWasStale = !!(tab.url && tab.url !== PRE_URL);
      window.__spikeMarks = M;
    }
  } else {
    /* SLOW PATH: must await the IPC roundtrip before anything can render */
    const tab = await queryActiveUrl();
    if (tab){ targetTabId = targetTabId ?? tab.id; model = parseUrl(tab.url || ''); }
    render();
    finishMeasure(FORCE_SLOW ? 'query-forced' : 'query');
  }

  if (AUTOAPPLY) setTimeout(doApply, APPLY_DELAY);
  if (AUTOCLOSE != null) setTimeout(() => window.close(), AUTOCLOSE);
})();
