'use strict';
const M = { timeOrigin: performance.timeOrigin, scriptStart: performance.now() };
try { new PerformanceObserver(l => { for (const e of l.getEntries())
  if (e.name === 'first-contentful-paint') M.fcp = e.startTime; }).observe({ type:'paint', buffered:true }); } catch(_){}
requestAnimationFrame(() => requestAnimationFrame(() => {
  M.rowsPainted = performance.now(); M.scriptToPaintMs = M.rowsPainted - M.scriptStart;
  window.__spikeMarks = M;
}));
