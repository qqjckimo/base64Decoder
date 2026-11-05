'use strict';
/* Bench-only. Injected BEFORE popup.js in a temporary build; never shipped.
   Reports to the bench's local HTTP server with sendBeacon, so no extension
   page has to stay open (that would keep the extension process warm and make
   cold opens impossible to measure). */
(() => {
  const EP = 'http://127.0.0.1:' + __BENCH_PORT__;
  const LABEL = __BENCH_LABEL__;
  const MODE = __BENCH_MODE__;                      // 'perf' | 'func'
  const send = (p, o) => { try { navigator.sendBeacon(EP + p, JSON.stringify(o)); } catch {} };
  const afterPaint = cb => requestAnimationFrame(() => setTimeout(cb, 0));
  const root = document.documentElement;

  /* ---- open: document start -> first paint that contains the rows ---- */
  const rep = { label: LABEL, timeOrigin: performance.timeOrigin, screen: [screenX, screenY] };
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries())
      if (e.name === 'first-contentful-paint') rep.fcp = e.startTime; })
      .observe({ type: 'paint', buffered: true });
  } catch {}
  addEventListener('load', () => { rep.load = performance.now(); });
  const ready = () => afterPaint(() => {
    rep.readyPainted = performance.now();
    rep.readyEpoch = performance.timeOrigin + rep.readyPainted;
    rep.marks = {};
    for (const m of performance.getEntriesByType('mark')) rep.marks[m.name] = m.startTime;
    rep.box = [document.body.offsetWidth, document.body.offsetHeight];
    const c = el => { if (!el) return null; const r = el.getBoundingClientRect();
      return [Math.round(screenX + r.left + r.width / 2), Math.round(screenY + r.top + r.height / 2)]; };
    send('/open', rep);
    // Chrome positions and shows the popup window only AFTER this first paint,
    // so screenX/screenY are not final yet here. Report click targets later.
    setTimeout(() => send('/pos', { label: LABEL, timeOrigin: performance.timeOrigin, screen: [screenX, screenY],
      add: c(document.getElementById('add')), del0: c(document.querySelector('#rows .del')) }), 400);
  });
  if (root.hasAttribute('data-ready')) ready();
  else new MutationObserver((_, o) => { if (root.hasAttribute('data-ready')) { o.disconnect(); ready(); } })
         .observe(root, { attributes: true, attributeFilter: ['data-ready'] });

  /* ---- runtime: input event timestamp -> after the next paint ---- */
  // Flushed when input goes idle, NOT on pagehide: the popup's process is torn
  // down ~10ms after it closes (measured), too soon for a beacon to leave.
  const lat = [];
  let ft = 0;
  const flush = () => { clearTimeout(ft); if (lat.length) send('/runtime', { label: LABEL, lat: lat.splice(0) }); };
  const push = s => { lat.push(s); clearTimeout(ft); ft = setTimeout(flush, 250); };
  addEventListener('keydown', e => { const ts = e.timeStamp;
    afterPaint(() => push(['key', performance.now() - ts])); }, true);
  addEventListener('click', e => { const ts = e.timeStamp;
    const t = e.target.closest('button'); const id = t ? (t.id || t.className) : 'other';
    afterPaint(() => push(['click:' + id, performance.now() - ts])); }, true);
  addEventListener('pagehide', flush);

  /* ---- func mode: state snapshots so e2e checks can assert what is on screen ---- */
  if (MODE !== 'func') return;
  const $ = id => document.getElementById(id);
  const rect = el => { if (!el) return null; const r = el.getBoundingClientRect();
    return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; };
  let t = 0;
  const snap = () => { clearTimeout(t); t = setTimeout(() => {
    const a = document.activeElement, alt = $('alt'), note = $('note');
    send('/state', {
      label: LABEL, at: Date.now(), screen: [screenX, screenY],
      preview: $('preview') && $('preview').textContent,
      base: $('base') && $('base').value,
      rows: [...document.querySelectorAll('#rows .row')].map(r =>
        [r.children[0].value, r.children[1].value, r.children[1].classList.contains('raw')]),
      alt: alt && !alt.hidden ? { kind: alt.dataset.kind, open: alt.open,
             label: $('alt-kind').textContent, url: $('alt-url').value } : null,
      note: note && !note.hidden ? note.textContent : null,
      focus: a && a !== document.body ? { id: a.id, cls: a.className,
             row: a.parentElement && a.parentElement.dataset.i, val: a.value } : null,
      changed: root.classList.contains('changed'),
      at_: { add: rect($('add')), apply: rect($('apply')), del0: rect(document.querySelector('#rows .del')),
             altSum: rect(document.querySelector('#alt summary')), altUrl: rect($('alt-url')) },
      box: [document.body.offsetWidth, document.body.offsetHeight],
    });
  }, 60); };
  new MutationObserver(snap).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  addEventListener('focusin', snap); addEventListener('input', snap);
})();
