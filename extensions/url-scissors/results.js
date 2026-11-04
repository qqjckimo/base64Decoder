'use strict';
async function draw(){
  const all = await chrome.storage.local.get(null);
  const rows = Object.keys(all).filter(k => k.startsWith('log:')).sort().map(k => all[k]);
  window.__spikeLog = rows;
  const cols = ['sinceBoot','type','phase','lastPhase','aliveMs','msAfterApply','status','url','error','marks'];
  document.getElementById('t').innerHTML =
    '<table><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr>' +
    rows.map(r => '<tr>' + cols.map(c => {
      let v = r[c];
      if (v && typeof v === 'object') v = JSON.stringify(v);
      return '<td>' + (v === undefined || v === null ? '' : String(v).slice(0, 220)) + '</td>';
    }).join('') + '</tr>').join('') + '</table>';
}
document.getElementById('reset').addEventListener('click', async () => {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter(k => k.startsWith('log:')));
  draw();
});
draw();
