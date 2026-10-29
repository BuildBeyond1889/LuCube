// The PC: the page the desktop cube runs, served by musiccube.py (tests/pc_server.py).
const { begin, check, sleep, until, launch, press, shot } = require('./lib');
const { radioWindow, luWindow, openWindow } = require('./window');

module.exports = async function pc(base) {
  begin('PC');
  const { b, p, errs } = await launch(null);
  try {
    await p.goto(base);
    check('PC: opens with your library', await until(p, () => MODE === 'lu' && PLS.length === 2, null, 10000), await p.evaluate(() => [MODE, PLS.length]));

    let e = await press(p, 'text=Switch to radio', 'mouse');
    check('PC: Switch to radio', !e && await until(p, () => MODE === 'radio' && PLS.filter((x) => x.cc).length === 20, null, 10000), e || await p.evaluate(() => [MODE, PLS.length]));

    // hover the corner for the wheel, then drag a station disc out into the room: the cube comes out
    await p.mouse.move(1450, 120); await p.mouse.move(1570, 30, { steps: 8 }); await sleep(1200);
    await p.mouse.move(1458, 140, { steps: 5 }); await sleep(300);
    await p.mouse.down(); await p.mouse.move(1300, 250, { steps: 10 }); await p.mouse.move(800, 450, { steps: 20 }); await p.mouse.up();
    check('PC: dragging out of the wheel brings out the cube', await until(p, () => cubeOn, null, 4000));
    await sleep(1500);
    await shot(p, 'pc-cube');

    e = await openWindow(p, 'mouse');
    check('PC: the yellow square unfolds the cube', !e, e);
    if (!e) await radioWindow(p, 'mouse', 'PC radio window', false);

    // and Lu mode's window
    await p.evaluate(() => switchMode()); await sleep(2500);
    e = await openWindow(p, 'mouse');
    check('PC: unfolds in Lu mode too', !e, e);
    if (!e) await luWindow(p, 'mouse', 'PC Lu window');
  } catch (err) {
    check('PC: ran without crashing the test', false, String(err).slice(0, 300));
  }
  await shot(p, 'pc-end');
  check('PC: no errors on the page', errs.length === 0, errs.slice(0, 5));
  await b.close();
};
