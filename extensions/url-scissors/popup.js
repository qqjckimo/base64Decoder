'use strict';
/* URL Scissors - spike build.
   Real render path (so measurements mean something) plus spike telemetry. */

const T_SCRIPT = performance.now();
const M = { timeOrigin: performance.timeOrigin, scriptStart: T_SCRIPT };

const Q = new URLSearchParams(location.search);
const PRE_URL     = Q.get('u');                      // spike only
const AUTOAPPLY   = Q.get('autoapply') === '1';      // spike only
const APPLY_DELAY = Number(Q.get('delay') || 400);
const AUTOCLOSE   = Q.has('autoclose') ? Number(Q.get('autoclose')) : null;
const MUTATE      = Q.get('mutate');

/* ---------- sizing ------------------------------------------------------
   Chrome sizes the popup to the document and hard-caps it at 800x600, so the
   document itself is where "min size, but never past the browser window" has
   to be expressed. Computed BEFORE the first render: one paint, no resize
   jolt. The ~4ms this costs is affordable - measured open cost is ~47ms and
   our whole render is ~1ms of it. */
const MIN_W = 360, MIN_H = 320, PREF_W = 480, CAP_W = 800, CAP_H = 600;
const CHROME_V_RESERVE = 112;                        // toolbar + tabstrip
const clamp = (lo, v, hi) => Math.max(lo, Math.min(v, hi));

function applySizing(win){
  const availW = (win && win.width  ? win.width  : CAP_W) - 24;
  const availH = (win && win.height ? win.height : CAP_H) - CHROME_V_RESERVE;
  const w    = clamp(MIN_W, Math.min(PREF_W, availW), CAP_W);
  const maxh = clamp(MIN_H, Math.min(availH, CAP_H), CAP_H);
  const s = document.documentElement.style;
  s.setProperty('--w', w + 'px');
  s.setProperty('--maxh', maxh + 'px');
  M.sizing = { windowW: win && win.width, windowH: win && win.height, w, maxh };
}

/* ---------- fidelity-preserving URL model -------------------------------
   Keys/values stay RAW (percent-encoded). Round-tripping through
   URLSearchParams would normalise `?a` vs `?a=`, rewrite + / %20 and re-encode
   untouched params - unacceptable in a debugging tool. */
function parseUrl(raw){
  raw = raw || '';
  const h = raw.indexOf('#');
  const hash  = h >= 0 ? raw.slice(h) : '';
  const noH   = h >= 0 ? raw.slice(0, h) : raw;
  const q     = noH.indexOf('?');
  const head  = q >= 0 ? noH.slice(0, q) : noH;
  const query = q >= 0 ? noH.slice(q + 1) : '';
  const params = query === '' ? [] : query.split('&').map(seg => {
    const eq = seg.indexOf('=');
    return eq < 0 ? { k: seg, v: null } : { k: seg.slice(0, eq), v: seg.slice(eq + 1) };
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

const elRows = document.getElementById('rows');
const elBase = document.getElementById('base');
const elPrev = document.getElementById('preview');
const elCnt  = document.getElementById('count');
const elPerf = document.getElementById('perf');
const TPL    = document.getElementById('row-tpl');

/* ---------- render: template clone -> one fragment -> one append ---------- */
function render(){
  if (!model.params.length){
    const d = document.createElement('div');
    d.className = 'empty'; d.textContent = '這個網址沒有 query 參數';
    elRows.replaceChildren(d);
  } else {
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
  }
  elBase.value = model.head + model.hash;
  sync();
}
function sync(){
  elPrev.textContent = serialize(model);
  elCnt.textContent = model.params.length + ' 個參數';
}

/* ---------- event delegation: one listener per type, not 3xN ---------- */
elRows.addEventListener('input', e => {
  const row = e.target.closest('.row'); if (!row) return;
  const p = model.params[+row.dataset.i]; if (!p) return;
  if (e.target.classList.contains('k')) p.k = e.target.value; else p.v = e.target.value;
  dirty = true; sync();                       // no debounce: it is one text node
});
elRows.addEventListener('click', e => {
  const btn = e.target.closest('.del'); if (!btn) return;
  model.params.splice(+btn.closest('.row').dataset.i, 1);
  dirty = true; render();
});
elBase.addEventListener('input', () => {
  const m = parseUrl(elBase.value);
  model.head = m.head; model.hash = m.hash; dirty = true; sync();
});
document.getElementById('add').addEventListener('click', () => {
  model.params.push({ k: '', v: '' }); dirty = true; render();
  const last = elRows.lastElementChild;
  if (last && last.querySelector) { const k = last.querySelector('.k'); if (k){ k.focus(); k.scrollIntoView({ block:'nearest' }); } }
});
document.getElementById('apply').addEventListener('click', doApply);
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doApply(); }
});

/* ---------- apply: tabs.update first, nothing awaited before it ---------- */
function doApply(){
  if (MUTATE) model.params.push({ k: 'spike', v: MUTATE });
  const url = serialize(model);
  const t = performance.now();
  try { port && port.postMessage({ type:'pre-apply', url, at: Date.now() }); } catch(_){}
  if (targetTabId != null) chrome.tabs.update(targetTabId, { url });
  else chrome.tabs.query({ active:true, currentWindow:true })
        .then(([tab]) => tab && chrome.tabs.update(tab.id, { url }));
  M.applyDispatchMs = performance.now() - t;
  try { port && port.postMessage({ type:'post-apply', at: Date.now(), applyDispatchMs: M.applyDispatchMs }); } catch(_){}
  dirty = false;
}

/* ---------- spike 0-1 probe: SW-side onDisconnect == this document died ---------- */
let port = null;
try {
  const PID = (Q.get('pid') || Math.random().toString(36).slice(2, 8));
  M.pid = PID;
  port = chrome.runtime.connect({ name:'popup-alive:' + PID });
  port.postMessage({ type:'opened', pid: PID, at: Date.now(), href: location.href });
} catch (e) { M.portError = String(e); }

try {
  new PerformanceObserver(l => { for (const e of l.getEntries())
    if (e.name === 'first-contentful-paint') M.fcp = e.startTime; }).observe({ type:'paint', buffered:true });
} catch(_){}

function finishMeasure(path){
  M.path = path;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    M.rowsPainted = performance.now();
    M.scriptToPaintMs = M.rowsPainted - M.scriptStart;
    M.paramCount = model.params.length;
    M.bodyRect = { w: document.body.offsetWidth, h: document.body.offsetHeight };
    window.__spikeMarks = M;
    elPerf.textContent =
      `path=${M.path}  params=${M.paramCount}  box=${M.bodyRect.w}x${M.bodyRect.h}\n` +
      `script->rows ${M.scriptToPaintMs.toFixed(2)}ms  fcp ${(M.fcp ?? -1).toFixed(2)}ms\n` +
      `ipc ${M.ipcMs != null ? M.ipcMs.toFixed(2)+'ms' : 'n/a'} (tabs ${M.tabsQueryMs!=null?M.tabsQueryMs.toFixed(1):'-'} win ${M.winGetMs!=null?M.winGetMs.toFixed(1):'-'})  maxh ${M.sizing && M.sizing.maxh}`;
    try { chrome.runtime.sendMessage({ type:'marks', marks: M }); } catch(_){}
  }));
}

(async function boot(){
  /* One concurrent IPC batch, then one render. Sizing must be known before
     the first paint or the popup window visibly resizes afterwards. */
  const t0 = performance.now();
  const SKIP_TABS = !!PRE_URL;                 // ?u= removes the tabs IPC
  const SKIP_WIN  = Q.has('size');             // ?size=WxH removes the windows IPC
  const pTabs = SKIP_TABS ? Promise.resolve([])
      : chrome.tabs.query({ active:true, currentWindow:true })
          .then(r => { M.tabsQueryMs = performance.now() - t0; return r; }).catch(() => []);
  const pWin = SKIP_WIN ? Promise.resolve(null)
      : chrome.windows.getCurrent()
          .then(r => { M.winGetMs = performance.now() - t0; return r; }).catch(() => null);
  const [tabs, win] = await Promise.all([pTabs, pWin]);
  M.ipcMs = performance.now() - t0;
  M.skipped = { tabs: SKIP_TABS, win: SKIP_WIN };

  const tab = tabs && tabs[0];
  if (tab && targetTabId == null) targetTabId = tab.id;
  if (Q.has('size')){
    const [sw_, sh_] = Q.get('size').split('x').map(Number);
    applySizing({ width: sw_, height: sh_ });
  } else applySizing(win);
  model = parseUrl(PRE_URL || (tab && tab.url) || '');
  render();
  finishMeasure(PRE_URL ? 'pre-seeded' : 'query');

  const first = elRows.querySelector('.v') || elBase;
  if (first) first.focus();                    // ready to type on open

  if (AUTOAPPLY) setTimeout(doApply, APPLY_DELAY);
  if (AUTOCLOSE != null) setTimeout(() => window.close(), AUTOCLOSE);
})();
