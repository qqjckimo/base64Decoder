'use strict';
/* Bench infrastructure: temp builds with the hook injected, a local HTTP
   server (fixture pages + beacon sink), headful Chrome on an X display with a
   window manager, and REAL X input via xdotool. Real input matters twice:
   it is what a user does, and only a genuine action invocation grants
   activeTab (chrome.action.openPopup() from code does not). */
const { chromium } = require('playwright');
const { execFileSync, execSync } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SRC = path.resolve(__dirname, '../src');
const FIX = path.resolve(__dirname, 'fixtures');
const DISPLAY = process.env.BENCH_DISPLAY || ':99';
const CHROME = process.env.BENCH_CHROME || '/opt/pw-browsers/chromium';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => performance.timeOrigin + performance.now();      // epoch ms, sub-ms

/* ---------- stats ---------- */
function q(sorted, p) {                       // linear-interpolated quantile
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
function stats(a) {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  const r = v => Math.round(v * 10) / 10;
  return { n: s.length, p50: r(q(s, .5)), p75: r(q(s, .75)), p90: r(q(s, .9)), max: r(s[s.length - 1]) };
}
// Bootstrap a confidence interval for P75(a) - P75(b): is a delta real or noise?
function p75DeltaCI(a, b, iters = 2000) {
  const pick = x => x[(Math.random() * x.length) | 0];
  const p75 = x => q([...x].sort((m, n) => m - n), .75);
  const d = [];
  for (let i = 0; i < iters; i++) {
    const ra = a.map(() => pick(a)), rb = b.map(() => pick(b));
    d.push(p75(ra) - p75(rb));
  }
  d.sort((x, y) => x - y);
  const r = v => Math.round(v * 10) / 10;
  return { delta: r(p75(a) - p75(b)), lo: r(q(d, .025)), hi: r(q(d, .975)) };
}

/* ---------- extension id: unpacked id = sha256(abs path) -> a..p ---------- */
function extIdForPath(p) {
  const h = crypto.createHash('sha256').update(path.resolve(p)).digest('hex').slice(0, 32);
  return [...h].map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
}

/* ---------- temp builds ---------- */
function build(root, { label, mode, port, kind, key }) {
  const dir = path.join(root, label);
  fs.cpSync(SRC, dir, { recursive: true });
  const hook = fs.readFileSync(path.join(FIX, 'hook.js'), 'utf8')
    .replace('__BENCH_PORT__', String(port))
    .replace('__BENCH_LABEL__', JSON.stringify(label))
    .replace('__BENCH_MODE__', JSON.stringify(mode));
  fs.writeFileSync(path.join(dir, 'hook.js'), hook);
  if (kind === 'floor') {
    fs.copyFileSync(path.join(FIX, 'floor.html'), path.join(dir, 'popup.html'));
    fs.copyFileSync(path.join(FIX, 'floor.js'), path.join(dir, 'floor.js'));
  } else {
    const html = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
    if (!html.includes('<script src="popup.js"></script>')) throw new Error('popup.js tag not found');
    fs.writeFileSync(path.join(dir, 'popup.html'),
      html.replace('<script src="popup.js"></script>', '<script src="hook.js"></script>\n<script src="popup.js"></script>'));
  }
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  if (kind === 'keepalive') {
    // Experiment only: a service worker re-armed by an alarm every 30s keeps the
    // extension process alive, so the popup never has to start a new process.
    fs.writeFileSync(path.join(dir, 'keepalive.js'),
      "chrome.alarms.create('k',{periodInMinutes:0.5});chrome.alarms.onAlarm.addListener(()=>{});");
    man.background = { service_worker: 'keepalive.js' };
    man.permissions = [...man.permissions, 'alarms'];
  }
  man.name = 'bench:' + label;
  man.commands._execute_action.suggested_key.default = key;
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 2));
  return { label, dir, id: extIdForPath(dir), key, kind };
}

/* ---------- local server: fixture pages + beacon sink ---------- */
function startServer() {
  const inbox = { open: [], runtime: [], state: [], pos: [] };
  let PORT = 0;
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*' }); return res.end(); }
    if (req.method === 'POST') {
      let b = '';
      req.on('data', c => b += c);
      req.on('end', () => {
        try { const o = JSON.parse(b); o._recv = now(); (inbox[u.pathname.slice(1)] || []).push(o); } catch {}
        res.writeHead(204, { 'access-control-allow-origin': '*' }); res.end();
      });
      return;
    }
    // redirect fixtures: /r?go=same -> same-origin 302, /r?go=cross -> other origin 302
    if (u.pathname === '/r') {
      const go = u.searchParams.get('go');
      if (go === 'same') { res.writeHead(302, { location: '/landed?from=same&kept=1' }); return res.end(); }
      if (go === 'cross') { res.writeHead(302, { location: `http://localhost:${PORT}/landed?from=cross` }); return res.end(); }
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>${u.pathname}</title><body style="font:14px system-ui;margin:24px">fixture ${u.pathname}${u.search}`);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => { PORT = srv.address().port; r({ srv, port: PORT, inbox }); }));
}

/* ---------- X helpers ---------- */
const X = (...a) => execFileSync('xdotool', a, { env: { ...process.env, DISPLAY }, timeout: 10000 }).toString().trim();
function browserWindow() {
  for (const cls of ['chromium', 'Chromium', 'chrome', 'Google-chrome']) {
    try { const ids = X('search', '--onlyvisible', '--class', cls).split('\n').filter(Boolean); if (ids.length) return ids[0]; } catch {}
  }
  return null;
}
function activate(win) { try { X('windowactivate', '--sync', win); } catch {} }
// Key press time. `xdotool key` defaults to 12ms between key events, and the
// accelerator fires on the key-DOWN while xdotool is still sending key-ups, so
// "after xdotool returns" is ~20ms late. Use --delay 0 and timestamp BEFORE
// spawning, plus the measured spawn+connect overhead (calibrateKey()).
let KEY_OVERHEAD = 0;
function key(combo) { const t = now(); X('key', '--delay', '0', '--clearmodifiers', combo); return t + KEY_OVERHEAD; }
function calibrateKey(n = 15) {
  const d = [];
  for (let i = 0; i < n; i++) { const t = now(); X('getmouselocation'); d.push(now() - t); }
  d.sort((a, b) => a - b);
  KEY_OVERHEAD = d[(d.length / 2) | 0];         // median spawn + X connect + one round trip
  return KEY_OVERHEAD;
}
function type(text, delayMs = 60) { X('type', '--delay', String(delayMs), text); }
function click(x, y) {
  if (!(x >= 0 && y >= 0 && x < 1280 && y < 900)) throw new Error(`click outside the screen: ${x},${y}`);
  // no --sync: it waits for a motion event and hangs forever if the pointer is already there
  X('mousemove', String(x), String(y)); X('click', '1'); return now();
}

/* ---------- process state ----------
   Extension renderers carry --extension-process but NOT the extension id, so
   this counts extension processes of one browser profile. Cold/warm is then
   judged as "any extension process alive at the moment of the key press". */
function extensionProcesses(prof) {
  try {
    return execSync('ps -eo pid,args', { timeout: 5000 }).toString().split('\n')
      .filter(l => l.includes('--type=renderer') && l.includes('--extension-process') &&
                   (!prof || l.includes(prof)))
      .map(l => +l.trim().split(/\s+/)[0]);
  } catch { return []; }
}
function rendererLines() {
  return execSync('ps -eo pid,args', { timeout: 5000 }).toString().split('\n').filter(l => l.includes('--type=renderer'));
}

/* ---------- launch ---------- */
async function launch(builds, { dark = false, windowSize = '1200,820' } = {}) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'us-bench-prof-'));
  // Toolbar pinning lives in the profile prefs; seed it before Chrome starts.
  const pinned = builds.filter(b => b.pinned).map(b => b.id);
  if (pinned.length) {
    fs.mkdirSync(path.join(prof, 'Default'), { recursive: true });
    fs.writeFileSync(path.join(prof, 'Default', 'Preferences'),
      JSON.stringify({ extensions: { pinned_extensions: pinned } }));
  }
  const dirs = builds.map(b => b.dir).join(',');
  const args = ['--no-sandbox', '--disable-gpu', `--window-size=${windowSize}`, '--window-position=0,0',
                '--no-first-run', '--no-default-browser-check',
                `--disable-extensions-except=${dirs}`, `--load-extension=${dirs}`];
  if (dark) args.push('--force-dark-mode', '--blink-settings=preferredColorScheme=0');
  const ctx = await chromium.launchPersistentContext(prof, {
    headless: false, executablePath: CHROME, env: { ...process.env, DISPLAY }, args, viewport: null,
  });
  return { ctx, prof };
}

/* ---------- wait for a beacon ---------- */
async function waitFor(arr, pred, timeoutMs = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const hit = arr.find(pred);
    if (hit) return hit;
    await sleep(15);
  }
  return null;
}

module.exports = { SRC, DISPLAY, sleep, now, stats, p75DeltaCI, extIdForPath, build, startServer,
                   X, browserWindow, activate, key, calibrateKey, type, click, extensionProcesses, rendererLines,
                   launch, waitFor };
