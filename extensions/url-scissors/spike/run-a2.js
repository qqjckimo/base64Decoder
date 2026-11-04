'use strict';
/* 0-2 decomposition: how much of the open cost is OURS?
   blank.html  = document creation + paint floor, ~no code of ours
   popup.html  = the same, plus our CSS/JS/DOM for N params */
const { chromium } = require('playwright');
const path = require('path'); const os = require('os'); const fs = require('fs');
const EXT = path.resolve(__dirname, '..');
const ITER = Number(process.env.ITER || 20);

const stats = a => { const s=[...a].sort((x,y)=>x-y); const q=p=>s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];
  return { n:s.length, p50:+q(.5).toFixed(2), p90:+q(.9).toFixed(2), max:+s[s.length-1].toFixed(2) }; };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spike-a2-'));
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: false, executablePath: '/opt/pw-browsers/chromium',
    args: ['--headless=new','--no-sandbox','--disable-gpu',
           `--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker',{timeout:15000});
  const ID = new URL(sw.url()).host;

  const mkUrl = n => 'http://127.0.0.1:1/p?' +
    Array.from({length:n},(_,i)=>`param${i}=value%20${i}`).join('&');

  const measure = async (page_, label) => {
    const doc=[], fcp=[], s2p=[];
    for (let i=0;i<ITER;i++){
      const p = await ctx.newPage();
      await p.goto(`chrome-extension://${ID}/${page_}`);
      await p.waitForFunction(()=>window.__spikeMarks&&window.__spikeMarks.rowsPainted,null,{timeout:10000});
      const m = await p.evaluate(()=>window.__spikeMarks);
      doc.push(m.rowsPainted); s2p.push(m.scriptToPaintMs); if (m.fcp!=null) fcp.push(m.fcp);
      await p.close();
    }
    return { label, docStartToPainted: stats(doc), firstContentfulPaint: fcp.length?stats(fcp):null,
             scriptToPainted: stats(s2p) };
  };

  const out = [];
  out.push(await measure('blank.html', 'blank.html (document+paint floor)'));
  for (const n of [0, 7, 40]){
    out.push(await measure('popup.html?u=' + encodeURIComponent(mkUrl(n)), `popup.html, ${n} params`));
  }
  await ctx.close();

  console.log('\n======== 0-2 DECOMPOSITION (iter=' + ITER + ') ========');
  const floor = out[0].docStartToPainted.p50;
  for (const r of out){
    console.log(`\n${r.label}`);
    console.log(`  doc start -> painted   p50=${r.docStartToPainted.p50}  p90=${r.docStartToPainted.p90}`);
    console.log(`  script    -> painted   p50=${r.scriptToPainted.p50}  p90=${r.scriptToPainted.p90}`);
    console.log(`  FCP                    ${r.firstContentfulPaint?('p50='+r.firstContentfulPaint.p50):'n/a'}`);
    if (r !== out[0]) console.log(`  OUR MARGINAL COST      ~${(r.docStartToPainted.p50-floor).toFixed(2)}ms over the blank floor`);
  }
  console.log('\n===================================================\n');
})().catch(e=>{console.error('FAILED:',e);process.exit(1);});
