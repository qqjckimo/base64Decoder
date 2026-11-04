'use strict';
/* Gesture trigger. The driver passes the target tab id + url EXPLICITLY so the
   test can never accidentally aim at the trigger page itself. */
const out = document.getElementById('out');
const say = o => { out.textContent = JSON.stringify(o, null, 2); window.__triggerResult = o; };
const P = new URLSearchParams(location.search);

async function go(){
  const win = Number(P.get('win'));
  const tabId = Number(P.get('tab'));
  const tab = await chrome.tabs.get(tabId);
  if (!/^https?:/.test(tab.url || '')) throw new Error('target tab is not http: ' + tab.url);
  const popup = (P.get('popup') || 'popup.html')
    .replace('__URL__', encodeURIComponent(tab.url))
    .replace('__TAB__', String(tab.id));
  await chrome.action.setPopup({ popup });
  await chrome.action.openPopup({ windowId: win });
  const [activeInWin] = await chrome.tabs.query({ active: true, windowId: win });
  return { windowId: win, targetTabId: tab.id, targetUrl: tab.url,
           activeInWindow: activeInWin && { id: activeInWin.id, url: activeInWin.url }, popup };
}
document.getElementById('seed-open').addEventListener('click', async () => {
  try { say({ ok: true, ...(await go()) }); } catch (e) { say({ ok: false, error: String(e) }); }
});
