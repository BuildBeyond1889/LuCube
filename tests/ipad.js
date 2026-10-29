// The iPad web app (docs/app/ipad.html), tested with a finger and with a mouse/trackpad.
const { begin, check, sleep, until, launch, press, shot } = require('./lib');
const { radioWindow, openWindow } = require('./window');

module.exports = async function ipad(url) {
  begin('iPad');
  const { b, p, errs } = await launch('iPad Mini landscape');
  try {
    await p.goto(url);
    check('iPad: starts up', await until(p, () => typeof MODE === 'string' && !window.LU_INTRO_ON && PLS.length > 0, null, 25000), await p.evaluate(() => [typeof MODE, window.LU_INTRO_ON]));

    if (await p.evaluate(() => MODE !== 'radio')) {
      const e = await press(p, '#swp', 'touch');
      check('iPad: the switch button (bottom right) switches to radio', !e && await until(p, () => MODE === 'radio', null, 6000), e || await p.evaluate(() => MODE));
    }
    check('iPad: the world loads', await until(p, () => PLS.filter((x) => x.cc).length === 20, null, 15000), await p.evaluate(() => PLS.length));

    // the switch button in the bottom right, both ways
    for (const want of ['lu', 'radio']) {
      await sleep(1500);
      const e = await press(p, '#swp', 'touch');
      check(`iPad: the switch button goes to ${want === 'lu' ? 'Lu' : 'radio'}`, !e && await until(p, (w) => MODE === w, want, 6000), e || await p.evaluate(() => MODE));
    }
    await sleep(2000);
    await p.evaluate(() => window.luCubeOut && window.luCubeOut()); await sleep(2500);
    check('iPad: the cube is out and on screen', await p.evaluate(() => { const r = document.getElementById(FACE[front()].el).getBoundingClientRect(); return cubeOn && r.width > 150 && r.x >= 0 && r.right <= innerWidth + 1 }));

    // a finger first, then a trackpad/mouse (the Magic Keyboard), each through the whole window
    for (const how of ['touch', 'mouse']) {
      const e = await openWindow(p, how);
      check(`iPad (${how}): the yellow square unfolds the cube`, !e, e);
      if (e) continue;
      check(`iPad (${how}): the window fills the screen`, await p.evaluate(() => { const r = document.querySelector('.mxw').getBoundingClientRect(); return r.width >= innerWidth - 4 && r.height >= innerHeight - 4 }));
      await radioWindow(p, how, `iPad window (${how})`, true);
      await sleep(1500);
    }

    // turned upright: the unfolded window re-fits the screen
    const e = await openWindow(p, 'touch');
    if (!e) {
      await p.setViewportSize({ width: 768, height: 1024 }); await sleep(1800);
      check('iPad: turned upright, the window re-fits the screen', await p.evaluate(() => { const r = document.querySelector('.mxw').getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.width >= innerWidth - 4 }), await p.evaluate(() => { const r = document.querySelector('.mxw').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width), innerWidth] }));
      await shot(p, 'ipad-upright-window');
      await press(p, '.mxw [data-act="mxclose"]', 'touch'); await sleep(1500);
    }
  } catch (err) {
    check('iPad: ran without crashing the test', false, String(err).slice(0, 300));
  }
  await shot(p, 'ipad-end');
  check('iPad: no errors on the page', errs.length === 0, errs.slice(0, 5));
  await b.close();
};
