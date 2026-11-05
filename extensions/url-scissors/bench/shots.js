'use strict';
/* Screenshots of the REAL popup bubble (X root capture, cropped), light + dark.
 *   node bench/shots.js <outDir>
 */
const L = require('./lib');
const { execSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const OUTDIR = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'us-shots'));
fs.mkdirSync(OUTDIR, { recursive: true });

async function session(dark) {
  const env = await L.startServer();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'us-builds-'));
  const b = { ...L.build(root, { label: 'product', mode: 'func', port: env.port, kind: 'product', key: 'Alt+Shift+U' }), pinned: true };
  const { ctx } = await L.launch([b], { dark });
  const page = ctx.pages()[0] || await ctx.newPage();
  const win = L.browserWindow();
  L.calibrateKey();
  const O = `http://127.0.0.1:${env.port}`;
  const last = () => env.inbox.state[env.inbox.state.length - 1];
  const open = async () => { L.activate(win); await L.sleep(300); L.key('alt+shift+u'); await L.sleep(900); return last(); };
  const shot = (name, st) => {
    const full = path.join(os.tmpdir(), `us-full-${name}.png`);
    execSync(`import -window root -display ${L.DISPLAY} ${full}`);
    const [x, y] = st.screen, [w, h] = st.box, m = 14;
    const out = path.join(OUTDIR, `${name}${dark ? '-dark' : ''}.png`);
    execSync(`convert ${full} -crop ${w + 2 * m}x${h + 2 * m}+${Math.max(0, x - m)}+${Math.max(0, y - m)} +repage ${out}`);
    fs.unlinkSync(full);
    return out;
  };
  const files = [];

  await page.goto(`${O}/s?utm_source=newsletter&q=hello%20world&path=a%2Fb&flag&lang=zh-TW&id=12345`); await L.sleep(900);
  let st = await open();
  files.push(shot('01-open', st));
  L.key('Escape'); await L.sleep(400);

  await page.goto(`${O}/r?go=x&k=1`); await L.sleep(900);
  await open();
  L.key('ctrl+a'); L.type('same', 40); await L.sleep(150); L.key('Return');
  await L.sleep(1500);
  st = last();
  files.push(shot('02-after-redirect', st));
  if (st.at_ && st.at_.altSum) { L.click(st.screen[0] + st.at_.altSum[0], st.screen[1] + st.at_.altSum[1]); await L.sleep(500); }
  files.push(shot('03-redirect-expanded', last()));
  L.key('Escape'); await L.sleep(400);

  await page.goto(`${O}/r?go=x&k=1`); await L.sleep(900);
  await open();
  L.key('ctrl+a'); L.type('cross', 40); await L.sleep(150); L.key('Return');
  await L.sleep(1800);
  files.push(shot('04-cross-origin-unreadable', last()));
  L.key('Escape'); await L.sleep(300);

  await ctx.close(); env.srv.close();
  return files;
}

(async () => {
  const files = [...await session(false), ...await session(true)];
  console.log(files.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
