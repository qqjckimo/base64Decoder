'use strict';
/* URL Scissors popup.
 *
 * One classic script on purpose: no modules, no bundler, no framework. The
 * spike measured the open cost as ~31ms of Chrome creating the popup document,
 * with our own work at ~1ms. The job of this file is to never add to that.
 *
 * Layout:
 *   1. Model  - pure URL parsing/encoding. No DOM, no chrome.*. Unit-tested in
 *               Node (test/model.test.js), exported at the bottom.
 *   2. UI     - runs only when a document exists.
 *
 * Perf marks (User Timing, visible in DevTools > Performance and read by the
 * bench harness): us:boot, us:ipc, us:render.
 */

/* =============================== 1. Model ================================ */
const Model = (() => {
  const HEX = '0123456789ABCDEF';

  // Percent-encode one code point. ASCII by hand (encodeURIComponent leaves
  // ' ( ) ! * ~ alone); everything else as uppercase UTF-8, which is what
  // Chrome itself produces, so canonical tab URLs round-trip.
  function pct(ch) {
    const c = ch.charCodeAt(0);
    if (ch.length === 1 && c < 0x80) return '%' + HEX[c >> 4] + HEX[c & 15];
    try { return encodeURIComponent(ch); } catch { return '%EF%BF%BD'; } // lone surrogate
  }

  // Minimal encoder for a query component typed in *decoded* form.
  // Escapes only what would break structure or what Chrome canonicalises:
  // controls, space, non-ASCII, " # < > ' and our own delimiters % & (+ = in keys).
  // '+' is deliberately left alone: it already means whatever it means in the URL.
  function enc(text, isKey) {
    let out = '';
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c <= 0x20 || c >= 0x7F || ch === '"' || ch === '#' || ch === '<' ||
          ch === '>' || ch === "'" || ch === '%' || ch === '&' || (isKey && ch === '=')) {
        out += pct(ch);
      } else out += ch;
    }
    return out;
  }

  // In raw mode the user types the URL bytes themselves; only protect structure.
  function protect(text, isKey) {
    let out = '';
    for (const ch of text) {
      out += (ch === '&' || ch === '#' || (isKey && ch === '=')) ? pct(ch) : ch;
    }
    return out;
  }

  function dec(raw) {
    try { return decodeURIComponent(raw); } catch { return null; }
  }

  // Show a field decoded ONLY when re-encoding the decoded text reproduces the
  // original bytes exactly. Then editing in decoded form can never silently
  // change the encoding of anything the user did not touch. Otherwise: raw.
  function display(raw, isKey) {
    if (raw === null) return { t: '', m: 'd' };
    const d = dec(raw);
    if (d !== null && enc(d, isKey) === raw) return { t: d, m: 'd' };
    return { t: raw, m: 'r' };
  }

  // Field text -> stored raw value. `orig` keeps `?flag` (no '=') from turning
  // into `?flag=` when the user types and then clears the value again.
  function fromInput(text, mode, isKey, orig) {
    if (!isKey && text === '' && orig === null) return null;
    return mode === 'd' ? enc(text, isKey) : protect(text, isKey);
  }

  // Fidelity-preserving split. Never round-trips through URLSearchParams, which
  // would normalise `?a` vs `?a=`, rewrite + / %20 and re-encode untouched params.
  function parse(raw) {
    raw = raw || '';
    const h = raw.indexOf('#');
    const hash = h >= 0 ? raw.slice(h) : '';
    const noH = h >= 0 ? raw.slice(0, h) : raw;
    const q = noH.indexOf('?');
    const head = q >= 0 ? noH.slice(0, q) : noH;
    const query = q >= 0 ? noH.slice(q + 1) : '';
    const params = query === '' ? [] : query.split('&').map(seg => {
      const eq = seg.indexOf('=');
      const k = eq < 0 ? seg : seg.slice(0, eq);
      const v = eq < 0 ? null : seg.slice(eq + 1);
      return { k, v, v0: v };
    });
    return { head, params, hash };
  }

  function serialize(m) {
    const q = m.params
      .filter(p => !(p.n && p.k === '' && !p.v))   // drop only brand-new empty rows
      .map(p => p.v === null ? p.k : p.k + '=' + p.v)
      .join('&');
    return m.head + (q ? '?' + q : '') + m.hash;
  }

  // Comparison key: Chrome canonicalises what it navigates to (e.g. a typed
  // space becomes %20), so compare canonical forms, never raw strings.
  function canon(u) {
    try { return new URL(u).href; } catch { return u || ''; }
  }

  return { enc, protect, dec, display, fromInput, parse, serialize, canon };
})();

if (typeof module === 'object' && module.exports) module.exports = Model;

/* ================================= 2. UI ================================= */
if (typeof document === 'object') (() => {
  performance.mark('us:boot');
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const elRows = $('rows'), elBase = $('base'), elPrev = $('preview'), elCnt = $('count');
  const elAlt = $('alt'), elAltKind = $('alt-kind'), elAltSum = $('alt-sum'), elAltUrl = $('alt-url');
  const elNote = $('note'), elApply = $('apply');
  const TPL = $('row-tpl').content.firstElementChild;

  /* ---- state ---- */
  let tabId = null;
  let current = '';                   // canonical URL the tab is at: what main shows
  let model = Model.parse('');
  let dirty = false;                  // main has edits not yet applied
  let pending = null;                 // { url } from apply until the load settles
  let alt = null;                     // { kind: 'redirect' | 'draft', url }
  let state = {};                     // per-tab chrome.storage.session record
  let readable = true;                // false once activeTab no longer covers the page
  const SKEY = () => 't:' + tabId;

  /* ---- sizing ------------------------------------------------------------
     Chrome sizes the popup to the document (hard cap 800x600). Min size here,
     never past the browser window beyond that. Computed BEFORE the first
     render so there is one paint and no visible resize afterwards. */
  const MIN_W = 360, MIN_H = 320, PREF_W = 480, CAP_W = 800, CAP_H = 600, V_RESERVE = 112;
  const clamp = (lo, v, hi) => Math.max(lo, Math.min(v, hi));
  function applySizing(win) {
    const aw = (win && win.width ? win.width : CAP_W) - 24;
    const ah = (win && win.height ? win.height : CAP_H) - V_RESERVE;
    root.style.setProperty('--w', clamp(MIN_W, Math.min(PREF_W, aw), CAP_W) + 'px');
    root.style.setProperty('--maxh', clamp(MIN_H, Math.min(ah, CAP_H), CAP_H) + 'px');
  }

  const RAW_TIP = '以原始編碼顯示：解碼後無法一字不差地還原，所以不解碼，避免改動你沒碰的部分';

  /* ---- rendering: template clone -> one fragment -> one append ---- */
  function renderRows() {
    if (!model.params.length) {
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = '這個網址沒有 query 參數 — 按「+ 參數」新增';
      elRows.replaceChildren(d);
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < model.params.length; i++) {
      const p = model.params[i];
      const n = TPL.cloneNode(true);
      n.dataset.i = i;
      const ki = n.firstElementChild, vi = ki.nextElementSibling;
      const kd = Model.display(p.k, true), vd = Model.display(p.v, false);
      p.km = kd.m; p.vm = vd.m;
      ki.value = kd.t; vi.value = vd.t;
      if (kd.m === 'r') { ki.classList.add('raw'); ki.title = RAW_TIP; }
      if (vd.m === 'r') { vi.classList.add('raw'); vi.title = RAW_TIP; }
      if (p.v === null) vi.placeholder = '（無值）';
      frag.appendChild(n);
    }
    elRows.replaceChildren(frag);
  }

  function sync() {
    const out = Model.serialize(model);
    elPrev.textContent = out;
    elCnt.textContent = model.params.length + ' 個參數';
    root.classList.toggle('changed', Model.canon(out) !== current);
  }

  function render() {
    elBase.value = model.head + model.hash;
    renderRows();
    sync();
  }

  // Replace the model without losing the user's place: focus and caret follow
  // the same param (matched by key + occurrence) across a re-render.
  function setModel(m) {
    const snap = snapshotFocus();
    model = m;
    render();
    restoreFocus(snap);
  }
  function snapshotFocus() {
    const a = document.activeElement;
    if (a === elBase) return { base: true, s: a.selectionStart, e: a.selectionEnd };
    if (!a || !elRows.contains(a)) return null;
    const i = +a.parentElement.dataset.i, p = model.params[i];
    if (!p) return null;
    let nth = 0;
    for (let j = 0; j < i; j++) if (model.params[j].k === p.k) nth++;
    return { k: p.k, nth, i, f: a.classList.contains('k') ? 0 : 1, s: a.selectionStart, e: a.selectionEnd };
  }
  function restoreFocus(s) {
    if (!s) return;
    let el = null;
    if (s.base) el = elBase;
    else {
      let nth = 0;
      for (let i = 0; i < model.params.length; i++) {
        if (model.params[i].k !== s.k) continue;
        if (nth++ === s.nth) { el = elRows.children[i].children[s.f]; break; }
      }
      // The param is gone (e.g. a redirect dropped it): stay at the same place
      // rather than dropping focus to <body>, which would cost the user a click.
      if (!el && model.params.length) {
        const row = elRows.children[Math.min(s.i, model.params.length - 1)];
        el = row && row.children[s.f];
      }
      if (!el) el = elBase;
    }
    if (!el) return;
    el.focus();
    const len = el.value.length;
    try { el.setSelectionRange(Math.min(s.s, len), Math.min(s.e, len)); } catch {}
  }

  /* ---- secondary area: the URL that is not the current one ---- */
  function renderAlt() {
    if (!alt) { elAlt.hidden = true; return; }
    elAlt.hidden = false;
    elAlt.dataset.kind = alt.kind;
    elAltKind.textContent = alt.kind === 'redirect' ? '已被轉址' : '未套用的編輯';
    elAltSum.textContent = alt.kind === 'redirect'
      ? '原本套用的網址（可編輯後從這裡重新出發）'
      : '關閉前沒有套用的修改';
    if (elAltUrl.value !== alt.url) elAltUrl.value = alt.url;
  }
  function setAlt(a) { alt = a; renderAlt(); }

  /* ---- notices ---- */
  let noteTimer = 0;
  function note(msg, sticky) {
    elNote.textContent = msg;
    elNote.hidden = !msg;
    clearTimeout(noteTimer);
    if (msg && !sticky) noteTimer = setTimeout(() => { elNote.hidden = true; }, 3500);
  }

  /* ---- persistence: per-tab, survives the popup closing (tab switch, click-away) ---- */
  function saveState(patch) {
    if (tabId == null) return;
    Object.assign(state, patch);
    chrome.storage.session.set({ [SKEY()]: state }).catch(() => {});
  }
  let draftTimer = 0;
  function saveDraftSoon() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, 250);
  }
  function saveDraftNow() {
    clearTimeout(draftTimer);
    if (dirty) saveState({ draft: Model.serialize(model), draftAt: Date.now() });
  }
  addEventListener('pagehide', saveDraftNow);

  /* ---- editing: one delegated listener per event type, not 3 x N ---- */
  function markDirty() {
    dirty = true;
    sync();                     // no debounce: one text node, cheaper than the timer
    saveDraftSoon();
  }
  elRows.addEventListener('input', e => {
    const t = e.target, p = model.params[+t.parentElement.dataset.i];
    if (!p) return;
    if (t.classList.contains('k')) p.k = Model.fromInput(t.value, p.km, true, p.k);
    else p.v = Model.fromInput(t.value, p.vm, false, p.v0);
    markDirty();
  });
  elRows.addEventListener('click', e => {
    const b = e.target.closest('.del');
    if (!b) return;
    const i = +b.parentElement.dataset.i;
    model.params.splice(i, 1);
    renderRows();
    markDirty();
    const next = elRows.children[Math.min(i, model.params.length - 1)];
    (next && next.children[1] && next.children[1].tagName === 'INPUT' ? next.children[1] : elBase).focus();
  });
  elBase.addEventListener('input', () => {
    const m = Model.parse(elBase.value);
    model.head = m.head;
    model.hash = m.hash;
    markDirty();
  });
  $('add').addEventListener('click', () => {
    model.params.push({ k: '', v: '', v0: '', n: true });
    renderRows();
    markDirty();
    const k = elRows.lastElementChild.firstElementChild;
    k.focus();
    k.scrollIntoView({ block: 'nearest' });
  });
  elApply.addEventListener('click', () => apply());

  // Enter applies. In the secondary textarea it applies that URL instead.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || e.shiftKey) return;
    if (e.target === elAltUrl) { e.preventDefault(); applyAlt(); return; }
    if (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey) { e.preventDefault(); apply(); }
  });

  $('alt-apply').addEventListener('click', applyAlt);
  $('alt-dismiss').addEventListener('click', () => {
    setAlt(null);
    saveState({ applied: null, landed: null, draft: null });
  });
  elAltUrl.addEventListener('input', () => { if (alt) alt.url = elAltUrl.value; });

  /* ---- apply: chrome.tabs.update is the first thing; nothing is awaited before it ---- */
  function apply(url) {
    if (tabId == null) return;
    url = url == null ? Model.serialize(model) : url;
    performance.mark('us:apply');
    chrome.tabs.update(tabId, { url }).catch(err => note('無法套用：' + (err && err.message || err), true));
    pending = { url };
    dirty = false;
    current = Model.canon(url);          // the omnibox shows the pending URL at once
    root.classList.remove('changed');
    setAlt(null);
    saveState({ applied: url, appliedAt: Date.now(), landed: null, lost: false, draft: null });
  }
  function applyAlt() {
    const url = elAltUrl.value.trim();
    if (!url) return;
    setModel(Model.parse(url));            // main is WYSIWYG: it shows what is applied
    apply(url);
  }

  /* ---- WYSIWYG: main always follows the tab's real URL ----
     activeTab survives same-origin navigation but NOT a cross-origin one
     (measured: bench func F4). Then main must not keep showing a URL the
     address bar no longer has: it says so, and the applied URL moves to the
     secondary area so the user can start again from it. */
  function setReadable(ok) {
    if (readable === ok) return;
    readable = ok;
    root.classList.toggle('unreadable', !ok);
    elBase.disabled = elApply.disabled = $('add').disabled = !ok;
    if (!ok) {
      elBase.value = '';
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = '目前頁面的網址無法讀取（已轉到其他網域）。重新開啟即可編輯它。';
      elRows.replaceChildren(d);
      elPrev.textContent = '';
      elCnt.textContent = '';
      note('');
    }
  }
  function onTabUpdated(id, info, tab) {
    if (id !== tabId) return;
    const u = tab && tab.url;
    if (u === undefined) {
      if (readable && (info.url !== undefined || info.status === 'complete')) {
        const applied = pending ? pending.url : Model.serialize(model);
        pending = null;
        setAlt({ kind: 'redirect', url: applied });
        saveState({ lost: true });
        setReadable(false);
        elAltUrl.focus();
      }
      return;
    }
    if (!readable) { setReadable(true); current = ''; }     // back on a readable page
    const cu = Model.canon(u);
    if (cu !== current) {
      if (dirty) {                          // page moved under unapplied edits: keep them
        setAlt({ kind: 'draft', url: Model.serialize(model) });
        saveState({ draft: alt.url, draftAt: Date.now() });
      }
      current = cu;
      dirty = false;
      setModel(Model.parse(u));
    }
    if (info.status === 'complete' && pending) {
      if (cu !== Model.canon(pending.url)) setAlt({ kind: 'redirect', url: pending.url });
      saveState({ landed: cu });
      pending = null;
    }
  }

  /* ---- boot: ONE concurrent IPC batch, then ONE render ---- */
  (async () => {
    // In a fresh process the first touch of each chrome.* namespace builds its
    // bindings synchronously; the marks separate that cost from the IPC itself.
    performance.mark('us:api');
    const T = chrome.tabs;            performance.mark('us:api:tabs');
    const W = chrome.windows;         performance.mark('us:api:windows');
    const S = chrome.storage.session; performance.mark('us:api:storage');
    const done = n => r => (performance.mark('us:ipc:' + n), r);
    const [tabs, win, sess] = await Promise.all([
      T.query({ active: true, currentWindow: true }).then(done('tabs'), () => []),
      W.getCurrent().then(done('windows'), () => null),
      S.get(null).then(done('storage'), () => ({})),
    ]);
    performance.mark('us:ipc');

    const tab = tabs && tabs[0];
    applySizing(win);
    if (tab) {
      tabId = tab.id;
      state = sess[SKEY()] || {};
    }
    const url = tab && tab.url;
    if (url === undefined) {
      elBase.value = '';
      note('無法讀取這個分頁的網址（瀏覽器內建頁面或未授權）。', true);
      elApply.disabled = true;
    } else {
      current = Model.canon(url);
      model = Model.parse(url);
      render();
      // Secondary area from the last session on this tab.
      const now = Date.now();
      if (state.applied && Model.canon(state.applied) !== current) {
        // No observed landing: the popup closed first (15s window), or access was
        // lost to a cross-origin redirect (60s: the user has to reopen to see it).
        const landedHere = state.landed ? state.landed === current
                                        : now - (state.appliedAt || 0) < (state.lost ? 60000 : 15000);
        if (landedHere) {
          alt = { kind: 'redirect', url: state.applied };
          if (!state.landed) saveState({ landed: current });
        }
      }
      if (state.draft && Model.canon(state.draft) !== current &&
          (state.draftAt || 0) >= (state.appliedAt || 0)) {
        alt = { kind: 'draft', url: state.draft };
      }
      renderAlt();
      chrome.tabs.onUpdated.addListener(onTabUpdated);
    }
    performance.mark('us:render');
    root.dataset.ready = '';

    // Off the critical path: an unpinned action makes Chrome animate the icon
    // out of the extensions menu before the popup can open (~250ms measured).
    // Swap the footer hint in place - same line box, no layout shift.
    setTimeout(() => {
      if (!chrome.action.getUserSettings) return;
      chrome.action.getUserSettings().then(u => {
        if (u && u.isOnToolbar === false) {
          const h = $('hint');
          h.classList.add('pin');
          h.textContent = '提示：把圖示釘選到工具列，開啟速度可快 4 倍以上';
        }
      }, () => {});
    }, 0);

    // Ready to type: caret at the end of the first value.
    const first = elRows.querySelector('input.v') || elBase;
    first.focus();
    const len = first.value.length;
    try { first.setSelectionRange(len, len); } catch {}
  })();
})();
