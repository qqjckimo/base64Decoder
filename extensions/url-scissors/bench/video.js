'use strict';
/* Ground truth for perceived open performance: record the X screen with
 * ffmpeg and analyse every frame. Answers what in-page timers cannot:
 *   - when does the popup become VISIBLE (not "when did the page paint")
 *   - does it appear in one step, or as an empty shell that then fills/grows
 *
 *   node bench/video.js [opens=6] [fps=100]
 *
 * The fixture page is painted a flat colour so any other pixel below the
 * toolbar belongs to the popup.
 */
const L = require('./lib');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const OPENS = Number(process.argv[2] || 6);
const FPS = Number(process.argv[3] || 100);
const OUT = process.env.BENCH_OUT || path.join(os.tmpdir(), 'us-bench-video.json');
const BG = [128, 128, 128];                                 // fixture page colour
const REG = { x: 540, y: 84, w: 560, h: 640 };              // below the toolbar, around the pinned icons

async function main() {
  const env = await L.startServer();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'us-builds-'));
  const vs = [
    { label: 'product', kind: 'product', key: 'Alt+Shift+U', x: 'alt+shift+u', pinned: true },
    { label: 'floor',   kind: 'floor',   key: 'Alt+Shift+J', x: 'alt+shift+j', pinned: true },
  ];
  const builds = vs.map(v => ({ ...v, ...L.build(root, { label: v.label, mode: 'perf', port: env.port, kind: v.kind, key: v.key }) }));
  const { ctx } = await L.launch(builds);
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(`http://127.0.0.1:${env.port}/s?utm_source=news&utm_medium=email&utm_campaign=fall&q=hello%20world&lang=zh-TW&flag&id=12345`);
  await page.addStyleTag({ content: `html,body{background:rgb(${BG}) !important;color:transparent !important}` });
  await L.sleep(1200);
  const win = L.browserWindow();
  L.calibrateKey();

  /* ---- capture + analyse live: showinfo prints each frame's wallclock pts on
         stderr; frames come out half-size grey on stdout and are reduced to
         {height, ink} immediately, so nothing large is buffered or written. ---- */
  const W = REG.w / 2, H = REG.h / 2, FS = W * H;
  const analyse = b => {
    let top = -1, bottom = -1, ink = 0;
    const cx = 150;                                       // full-res x=840: inside every pinned popup
    for (let y = 0; y < H; y++) if (Math.abs(b[y * W + cx] - BG[0]) > 6) { if (top < 0) top = y; bottom = y; }
    if (top >= 0) for (let y = top; y <= bottom; y++) for (let x = 20; x < 260; x += 2) if (b[y * W + x] < 200) ink++;
    return { h: top >= 0 ? (bottom - top + 1) * 2 : 0, ink };
  };
  const frames = [], ptsBy = new Map();
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-use_wallclock_as_timestamps', '1',
    '-f', 'x11grab', '-framerate', String(FPS), '-video_size', `${REG.w}x${REG.h}`, '-i', `${L.DISPLAY}+${REG.x},${REG.y}`,
    '-vf', 'showinfo,scale=iw/2:ih/2,format=gray', '-fps_mode', 'passthrough', '-copyts', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
    { env: { ...process.env, DISPLAY: L.DISPLAY } });
  let errBuf = '';
  ff.stderr.on('data', d => {
    errBuf += d;
    let i;
    while ((i = errBuf.indexOf('\n')) >= 0) {
      const line = errBuf.slice(0, i); errBuf = errBuf.slice(i + 1);
      // pts_time is printed as 1.79385e+09 (useless); pts is exact microseconds
      const m = /n:\s*(\d+)\s+pts:\s*(\d+)/.exec(line);
      if (m) ptsBy.set(+m[1], +m[2] / 1000);
    }
  });
  let acc = Buffer.alloc(0);
  ff.stdout.on('data', chunk => {
    acc = acc.length ? Buffer.concat([acc, chunk]) : chunk;
    while (acc.length >= FS) { frames.push(analyse(acc.subarray(0, FS))); acc = acc.subarray(FS); }
  });
  await L.sleep(1500);

  const presses = [];
  for (let i = 0; i < OPENS; i++) {
    for (const v of builds) {
      L.activate(win); await L.sleep(350);
      presses.push({ label: v.label, t: L.key(v.x) });
      await L.sleep(700);
      L.key('Escape');
      await L.sleep(500);
    }
  }
  await L.sleep(400);
  ff.kill('SIGINT');
  await new Promise(r => ff.on('exit', r));
  await ctx.close(); env.srv.close();
  frames.forEach((f, i) => { f.t = ptsBy.get(i); });
  const nFrames = frames.length;

  /* ---- per press: visible, complete, and every distinct height in between ---- */
  const results = presses.map(p => {
    const win_ = frames.filter(fr => fr.t >= p.t - 20 && fr.t <= p.t + 650);
    const vis = win_.find(fr => fr.h > 40);
    if (!vis) return { label: p.label, visible: null };
    const shown = win_.filter(fr => fr.t >= vis.t && fr.h > 40);
    const finalH = shown[shown.length - 1].h, finalInk = shown[shown.length - 1].ink;
    const complete = shown.find(fr => fr.h === finalH && fr.ink >= finalInk * 0.95);
    const heights = [...new Set(shown.map(fr => fr.h))];
    const framesBeforeComplete = shown.filter(fr => fr.t < complete.t).length;
    return { label: p.label, visible: vis.t - p.t, complete: complete.t - p.t,
             firstH: vis.h, finalH, heights, intermediateFrames: framesBeforeComplete };
  });
  const realFps = nFrames / ((frames[nFrames - 1].t - frames[0].t) / 1000);
  fs.writeFileSync(OUT, JSON.stringify({ fps: realFps, results }, null, 2));

  console.log(`\n=========== VIDEO (x11grab, effective ${realFps.toFixed(0)} fps, pinned) ===========`);
  for (const l of ['product', 'floor']) {
    const r = results.filter(x => x.label === l && x.visible != null);
    console.log(`\n${l}  (${r.length} opens)`);
    for (const x of r) console.log(`  visible ${x.visible.toFixed(0).padStart(4)}ms  complete ${x.complete.toFixed(0).padStart(4)}ms  ` +
      `heights ${JSON.stringify(x.heights)}  frames-before-complete ${x.intermediateFrames}`);
    if (r.length) {
      const v = L.stats(r.map(x => x.visible)), c = L.stats(r.map(x => x.complete));
      console.log(`  P75 visible ${v.p75}ms   P75 complete ${c.p75}ms   one-step opens ${r.filter(x => x.intermediateFrames === 0).length}/${r.length}`);
    }
  }
  console.log(`\njson -> ${OUT}\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
