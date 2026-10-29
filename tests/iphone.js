// The iPhone web app (docs/app/index.html; Android shares the same phone screens).
const { begin, check, sleep, until, launch, press, drag, shot } = require('./lib');

module.exports = async function iphone(url) {
  begin('iPhone');
  const { b, p, errs } = await launch('iPhone 14 Pro');
  try {
    await p.goto(url);
    check('iPhone: the opening plays through', await until(p, () => typeof MODE === 'string' && !window.LU_INTRO_ON, null, 25000));
    check('iPhone: opens on Lu', await p.evaluate(() => MODE === 'lu'));
    await sleep(1000);

    let e = await press(p, '#pseg b[data-m="radio"]', 'touch');
    check('iPhone: the radio button switches to radio', !e && await until(p, () => MODE === 'radio', null, 6000), e || await p.evaluate(() => MODE));
    check('iPhone: the world loads', await until(p, () => PLS.filter((x) => x.cc).length === 20, null, 20000), await p.evaluate(() => PLS.length));
    await sleep(1500);

    // the World face: tap a country with a finger
    await p.evaluate(() => goFace('LIBRARY')); await sleep(1500);
    const tile = await p.evaluate(() => { const f = document.getElementById(FACE[front()].el); const t = [...f.querySelectorAll('[data-act^="pl:"]')].map((el) => [el, +el.dataset.act.split(':')[1]]).find(([, n]) => n !== P.pl && PLS[n] && !PLS[n].fav && PLS[n].songs.length); if (!t) return null; const r = t[0].getBoundingClientRect(); return { n: t[1], x: r.x + r.width / 2, y: r.y + r.height / 2 } });
    if (check('iPhone: the World face shows countries', !!tile)) {
      await p.touchscreen.tap(tile.x, tile.y); await sleep(1200);
      const pl = await p.evaluate(() => P.pl);
      check('iPhone: tapping a country plays it', pl === tile.n, { pl, want: tile.n });
    }

    // a finger drag down the World list scrolls it and leaves the cube where it is
    await p.evaluate(() => goFace('LIBRARY')); await sleep(1500);
    const f0 = await p.evaluate(() => [front(), libOff]);
    const box = await p.evaluate(() => { const f = document.getElementById(FACE[front()].el), l = f.querySelector('.lib'); const r = (l || f).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.75 } });
    {
      const s = await p.context().newCDPSession(p);
      const tp = (type, yy) => s.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: box.x, y: yy }] });
      await tp('touchStart', box.y); for (let k = 1; k <= 12; k++) { await tp('touchMove', box.y - 15 * k); await sleep(16); } await tp('touchEnd'); await s.detach();
    }
    await sleep(800);
    const f1 = await p.evaluate(() => [front(), libOff]);
    check('iPhone: dragging the World list scrolls it', f1[1] !== f0[1], { before: f0, after: f1 });
    check('iPhone: ...without turning the cube', f1[0] === f0[0], { before: f0, after: f1 });

    // sideways: the cube shrinks to fit and the wheel/globe underneath goes away
    await p.setViewportSize({ width: 852, height: 393 }); await sleep(1800);
    const land = await p.evaluate(() => { const r = document.getElementById(FACE[front()].el).getBoundingClientRect(), pb = document.getElementById('pbot'); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight, bot: pb ? getComputedStyle(pb).display : 'none' } });
    check('iPhone sideways: the cube fits the screen', land.top >= -2 && land.bottom <= land.h + 2, land);
    check('iPhone sideways: the bottom wheel is hidden', land.bot === 'none', land);
    await shot(p, 'iphone-sideways');
    await p.setViewportSize({ width: 393, height: 852 }); await sleep(1800);
    check('iPhone upright again: the bottom wheel is back', await p.evaluate(() => getComputedStyle(document.getElementById('pbot')).display !== 'none'));
  } catch (err) {
    check('iPhone: ran without crashing the test', false, String(err).slice(0, 300));
  }
  await shot(p, 'iphone-end');
  check('iPhone: no errors on the page', errs.length === 0, errs.slice(0, 5));
  await b.close();
};
