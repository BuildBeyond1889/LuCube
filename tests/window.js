// The unfolded window (the cube flattened into a display): every part a person touches.
// Shared by the PC and the iPad; `how` is 'mouse' or 'touch'.
const { check, sleep, until, press, drag, shot } = require('./lib');

const st = (p) => p.evaluate(() => ({ pl: P.pl, idx: P.idx, mode: MODE, mxs: MXS, head: (document.querySelector('.mxw .mxh1') || {}).textContent || '' }));

async function radioWindow(p, how, tag, whole) {
  const T = (s) => `${tag}: ${s}`;
  check(T('window is open'), await until(p, () => MXS === 2 && !!document.querySelector('.mxw .mxrow')), await st(p));

  // a country tile
  const pick = await p.evaluate(() => { const t = [...document.querySelectorAll('.mxw .mxtile')].map((e, i) => [i, +e.dataset.act.split(':')[1]]).find(([, n]) => n !== P.pl && PLS[n] && !PLS[n].fav && PLS[n].songs.length); return t });
  let e = await press(p, '.mxw .mxtile', how, pick[0]); await sleep(700);
  let s = await st(p);
  check(T('tapping a country tile plays that country'), !e && s.pl === pick[1] && /CHANNELS/.test(s.head), e || s);

  // a channel
  e = await press(p, '.mxw .mxrow', how, 2); await sleep(700);
  const s2 = await st(p);
  check(T('tapping a channel plays it'), !e && s2.pl === s.pl && s2.idx === 2, e || s2);

  // next
  e = await press(p, '.mxw [data-act="next"]', how); await sleep(700);
  const s3 = await st(p);
  check(T('next goes to the next channel'), !e && s3.idx === 3, e || s3);

  // dragging the country tiles scrolls them and plays nothing
  const lib0 = await p.evaluate(() => mxLib);
  await drag(p, '.mxw .mxlw', -260, how);
  const lib1 = await p.evaluate(() => mxLib), s4 = await st(p);
  check(T('dragging the countries scrolls them'), lib1 !== lib0 && s4.pl === s3.pl && s4.idx === s3.idx, { lib0, lib1, s4 });

  // a genre
  const g0 = await p.evaluate(() => RGI);
  e = await press(p, '.mxw [data-act^="gen:"]', how, 1); await sleep(900);
  const g1 = await p.evaluate(() => RGI);
  check(T('tapping a genre switches to it'), !e && g1 !== g0, e || { g0, g1 });
  e = await press(p, '.mxw [data-act^="gen:"]', how, 0); await sleep(900);

  // favourites: star the station, open the list, play from it, go back
  e = await press(p, '.mxw [data-act="fav"]', how); await sleep(800);
  check(T('the star saves the station'), !e && await p.evaluate(() => !!(PLS[0] && PLS[0].fav && PLS[0].songs.length === 1)), e);
  e = await press(p, '.mxw .mxfavs', how); await sleep(700);
  s = await st(p);
  check(T('the Favourites button shows your saved stations'), !e && /FAVOURITES · 1/.test(s.head) && await p.evaluate(() => document.querySelectorAll('.mxw .mxrow').length === 1), e || s);
  e = await press(p, '.mxw .mxrow', how, 0); await sleep(700);
  s = await st(p);
  check(T('tapping a favourite plays it'), !e && s.pl === 0, e || s);
  e = await press(p, '.mxw .mxfavs', how); await sleep(700);
  s = await st(p);
  check(T('the Favourites button goes back to the channels'), !e && /CHANNELS/.test(s.head), e || s);
  e = await press(p, '.mxw [data-act="fav"]', how); await sleep(600); // un-star, so the next run starts clean

  // pong: tapping the court joins in
  e = await press(p, '.mxw [data-act="mxpong"]', how); await sleep(300);
  check(T('tapping Pong joins the game'), !e && await p.evaluate(() => !!(mxPg && mxPg.joined)), e);

  await visualiser(p, how, tag, whole);
  await shot(p, tag.replace(/\W+/g, '-') + '-window');

  e = await press(p, '.mxw [data-act="mxclose"]', how);
  check(T('the close square folds it back into the cube'), !e && await until(p, () => MXS === 0, null, 6000), e || await st(p));
}

// whole=true: the iPad's visualiser takes the whole screen; false: the PC's fills just the window's box
async function visualiser(p, how, tag, whole) {
  const box = await p.evaluate(() => { const r = document.querySelector('.mxw').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } });
  let e = await press(p, '.mxw [data-act="mxvizfs"]', how); await sleep(500);
  const full = await p.evaluate(() => { const v = document.getElementById('vizfs'); if (!v) return null; const r = v.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight } });
  const want = whole ? { w: full && full.vw, h: full && full.vh } : box;
  check(`${tag}: tapping the visualiser fills ${whole ? 'the whole screen' : 'the window'}`, !e && full && Math.abs(full.w - want.w) <= 4 && Math.abs(full.h - want.h) <= 4, e || { full, want });
  if (full) { e = await press(p, '#vizfs', how); await sleep(500); }
  check(`${tag}: another tap brings the window back`, !e && await p.evaluate(() => !document.getElementById('vizfs')), e);
  return full;
}

async function luWindow(p, how, tag) {
  const T = (s) => `${tag}: ${s}`;
  check(T('window is open'), await until(p, () => MXS === 2 && !!document.querySelector('.mxw .mxrow')), await st(p));
  let e = await press(p, '.mxw .mxrow', how, 1); await sleep(700);
  const s = await st(p);
  check(T('tapping a song plays it'), !e && s.idx === 1, e || s);
  check(T('no Caught list in Lu mode'), await p.evaluate(() => !/CAUGHT/.test(document.querySelector('.mxw').textContent)));
  e = await press(p, '.mxw [data-act="mxclose"]', how);
  check(T('the close square folds it back'), !e && await until(p, () => MXS === 0, null, 6000), e);
}

// open the window from the cube's own yellow square (whichever face is in front)
async function openWindow(p, how) {
  await sleep(600);
  // the cube's faces sit under a touch layer that works out which face you hit, so press the square
  // on the face turned towards you straight through that layer
  const n = await p.evaluate(() => { const L = [...document.querySelectorAll('.f [data-act="max"]')], f = document.getElementById(FACE[front()].el); return L.findIndex((el) => f && f.contains(el)) });
  if (n < 0) return 'no yellow square in view';
  const e = await press(p, '.f [data-act="max"]', how, n, true);
  if (e) return e;
  return (await until(p, () => MXS === 2, null, 12000)) ? '' : 'window did not open';
}

module.exports = { radioWindow, luWindow, openWindow, visualiser, st };
