'use strict';
/* Spike service worker.
   Discipline under test: every listener registered synchronously at top level,
   minimal top-level work, and the popup NEVER needs this worker to render. */

const BOOT = Date.now();
let seq = 0;

/* Race-free append: one storage key per entry (no read-modify-write). */
function log(entry){
  entry.at = entry.at || Date.now();
  entry.sinceBoot = entry.at - BOOT;
  const k = 'log:' + String(entry.at).padStart(14, '0') + ':' + String(seq++).padStart(4, '0');
  chrome.storage.local.set({ [k]: entry });
}
log({ type: 'sw-boot' });

/* ---- spike 0-1: popup liveness via long-lived port ---- */
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'popup-alive') return;
  const openedAt = Date.now();
  let lastPhase = 'opened';
  let applyAt = null;
  log({ type: 'popup-connect' });

  port.onMessage.addListener(m => {
    lastPhase = m.type;
    if (m.type === 'pre-apply') applyAt = Date.now();
    log({ type: 'popup-msg', phase: m.type, url: m.url, applyDispatchMs: m.applyDispatchMs });
  });

  port.onDisconnect.addListener(() => {
    log({
      type: 'popup-disconnect',
      lastPhase,
      aliveMs: Date.now() - openedAt,
      msAfterApply: applyAt ? Date.now() - applyAt : null
    });
  });
});

/* ---- navigation timeline, so a disconnect can be placed relative to it ---- */
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status || info.url)
    log({ type: 'tab-updated', tabId, status: info.status, url: info.url });
});

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (!msg) return false;
  if (msg.type === 'marks'){ log({ type: 'popup-marks', marks: msg.marks }); return false; }
  if (msg.type === 'reset'){
    chrome.storage.local.get(null).then(all => {
      const del = Object.keys(all).filter(k => k.startsWith('log:'));
      chrome.storage.local.remove(del).then(() => { seq = 0; respond({ ok: true, removed: del.length }); });
    });
    return true;                       // async respond
  }
  if (msg.type === 'setPopupSeed'){
    /* the ?u= trick, exercised so we can measure what it actually buys */
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      const u = tab && tab.url ? tab.url : '';
      const popup = 'popup.html?u=' + encodeURIComponent(u) +
                    (msg.autoapply ? '&autoapply=1&delay=' + (msg.delay || 400) : '') +
                    (tab ? '&tab=' + tab.id : '');
      chrome.action.setPopup({ popup }).then(() => {
        log({ type: 'seed-set', popup });
        respond({ ok: true, popup, tabId: tab && tab.id, url: u });
      });
    });
    return true;
  }
  if (msg.type === 'openPopup'){
    chrome.action.openPopup()
      .then(() => { log({ type: 'open-popup-ok' }); respond({ ok: true }); })
      .catch(e => { log({ type: 'open-popup-fail', error: String(e) }); respond({ ok: false, error: String(e) }); });
    return true;
  }
  return false;
});
