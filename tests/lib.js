// Shared bits for Lu Cube's tap tests: a browser with the radio directory and the streams faked,
// real mouse presses / finger taps / drags, and a pass-fail list.
const path = require('path');
const fs = require('fs');
const { chromium, devices } = require('playwright');

const FX = path.join(__dirname, 'fixtures');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
let suite = '';

function begin(name) { suite = name; console.log(`\n== ${name}`); }
function check(name, ok, info) {
  results.push({ suite, name, ok: !!ok, info });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && info !== undefined ? '   -> ' + JSON.stringify(info) : ''}`);
  return !!ok;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// wait until fn() (run in the page) is truthy; returns its last value
async function until(p, fn, arg, ms = 8000) {
  const t0 = Date.now(); let v;
  while (Date.now() - t0 < ms) { v = await p.evaluate(fn, arg).catch(() => undefined); if (v) return v; await sleep(150); }
  return v;
}

async function launch(device, opts = {}) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(device ? { ...devices[device] } : { viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  // nothing leaves the machine: the radio directory and the streams come from tests/fixtures
  await p.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => {
    const u = r.request().url();
    if (/radio-browser\.info/.test(u)) return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, path: path.join(FX, /\/countries/.test(u) ? 'countries.json' : 'stations.json') });
    if (/example\.com/.test(u) && !/status-json|7\.html|currentsong|stats/.test(u)) return r.fulfill({ contentType: 'audio/mpeg', headers: { 'access-control-allow-origin': '*' }, path: path.join(FX, 'song.mp3') });
    return r.abort();
  });
  await p.route(/\/api\/radio\/play/, (r) => r.fulfill({ contentType: 'audio/mpeg', path: path.join(FX, 'song.mp3') }));
  return { b, ctx, p, errs };
}

// press an element the way a person would: 'mouse' = a real click (down, short hold, up),
// 'touch' = a finger tap. Fails the check if something else is sitting on top of it.
async function press(p, sel, how, nth = 0, through = false) {
  const loc = p.locator(sel).nth(nth);
  await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
  const bb = await loc.boundingBox({ timeout: 3000 }).catch(() => null);
  if (!bb) return `no ${sel}`;
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  const top = await loc.evaluate((t, [x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && (e === t || t.contains(e))) }, [x, y]);
  if (!top && !through) return `${sel} is covered`;
  if (how === 'touch') await p.touchscreen.tap(x, y);
  else { await p.mouse.move(x, y, { steps: 4 }); await sleep(250); await p.mouse.down(); await sleep(90); await p.mouse.up(); }
  return '';
}

// a drag (mouse or one finger): from the middle of sel, dy pixels up (negative) or down
async function drag(p, sel, dy, how) {
  const bb = await p.locator(sel).first().boundingBox();
  if (!bb) return `no ${sel}`;
  const x = bb.x + bb.width / 2, y = bb.y + bb.height * (dy < 0 ? 0.8 : 0.2);
  if (how === 'touch') {
    const s = await p.context().newCDPSession(p);
    const tp = (type, yy) => s.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: yy }] });
    await tp('touchStart', y);
    for (let k = 1; k <= 12; k++) { await tp('touchMove', y + (dy * k) / 12); await sleep(16); }
    await tp('touchEnd'); await s.detach();
  } else {
    await p.mouse.move(x, y); await p.mouse.down();
    for (let k = 1; k <= 12; k++) { await p.mouse.move(x, y + (dy * k) / 12); await sleep(16); }
    await p.mouse.up();
  }
  await sleep(400);
  return '';
}

async function shot(p, name) { try { await p.screenshot({ path: path.join(OUT, name + '.png') }); } catch (e) {} }

module.exports = { FX, OUT, results, begin, check, sleep, until, launch, press, drag, shot };
