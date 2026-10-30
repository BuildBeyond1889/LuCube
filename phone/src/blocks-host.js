// Lu Blocks inside the Android app. The lyrics face's LU BLOCKS button unfolds the cube's six faces out
// across the screen, the mode-switch shimmer sweeps over them and leaves the game behind it (www/blocks.html).
// The game's red square, or the phone's back button, plays the same thing in reverse. The music keeps playing.
(() => {
  const FLY = 620, SWEEP = 1250, STAGGER = 45;
  let state = 'closed', layer = null, frame = null, pushed = false;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const faces = () => [...document.querySelectorAll('.f')].filter((f) => /^F_/.test(f.id));
  const frontRect = () => { const el = document.getElementById(FACE[front()].el); return (el || faces()[0]).getBoundingClientRect(); };

  // six squares laid out over the screen: two across, three down (three across, two down when the phone is sideways)
  function slots() {
    const W = innerWidth, H = innerHeight, land = W > H, cols = land ? 3 : 2, rows = land ? 2 : 3, g = 10;
    const s = Math.floor(Math.min((W - g * (cols + 1)) / cols, (H - g * (rows + 1)) / rows));
    const x0 = (W - (cols * s + (cols - 1) * g)) / 2, y0 = (H - (rows * s + (rows - 1) * g)) / 2;
    return Array.from({ length: 6 }, (_, k) => ({ x: x0 + (k % cols) * (s + g), y: y0 + Math.floor(k / cols) * (s + g), s }));
  }

  // flat copies of the cube's faces, as they look right now
  function tiles(at) {
    const front0 = FACE[front()].el, list = faces().sort((a, b) => (a.id === front0 ? 1 : 0) - (b.id === front0 ? 1 : 0));
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;will-change:clip-path';
    const out = list.map((f, k) => {
      const t = document.createElement('div'), size = f.offsetWidth || 300;
      t.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;transform-origin:0 0;overflow:hidden;border:3px solid #111;box-sizing:border-box;background:${f.style.background || getComputedStyle(f).backgroundColor};box-shadow:0 6px 0 #111;will-change:transform`;
      t.innerHTML = f.innerHTML; t.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      t.querySelectorAll('[data-act]').forEach((e) => e.removeAttribute('data-act'));
      box.appendChild(t);
      return { t, size, k };
    });
    layer.appendChild(box);
    place(out, at, 0);
    return { box, out };
  }
  const place = (out, at, u) => out.forEach(({ t, size, k }) => {
    const a = at(k, 0), b = at(k, 1), d = Math.min(1, Math.max(0, (u * (FLY + 5 * STAGGER) - k * STAGGER) / FLY)), e = ease(d);
    const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e, s = a.s + (b.s - a.s) * e;
    t.style.transform = `translate(${x}px,${y}px) scale(${s / size})`;
  });
  const line = () => {
    const l = document.createElement('div');
    l.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;z-index:3;pointer-events:none;background:#fff;box-shadow:0 0 6px 1px #fff,0 0 16px 4px rgba(255,194,26,.9),0 0 38px 10px rgba(255,122,26,.45)';
    layer.appendChild(l); return l;
  };
  const run = (ms, fn) => new Promise((res) => { const t0 = performance.now(); const st = (now) => { const u = Math.min(1, (now - t0) / ms); fn(u); if (u < 1) requestAnimationFrame(st); else res(); }; requestAnimationFrame(st); });

  async function open() {
    if (state !== 'closed' || (typeof WIPING !== 'undefined' && WIPING)) return;
    state = 'opening';
    const fr = frontRect(), sl = slots();
    layer = document.createElement('div'); layer.id = 'lublocks';
    layer.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(18,20,25,0);touch-action:none';
    document.body.appendChild(layer);
    // the game loads underneath while the faces fly out
    frame = document.createElement('iframe');
    frame.src = 'blocks.html?embed=1'; frame.title = 'Lu Blocks';
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#121419;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box';
    layer.appendChild(frame);
    const { box, out } = tiles((k, end) => (end ? sl[k] : { x: fr.left, y: fr.top, s: fr.width }));
    await run(FLY + 5 * STAGGER, (u) => { place(out, (k, end) => (end ? sl[k] : { x: fr.left, y: fr.top, s: fr.width }), u); layer.style.background = `rgba(18,20,25,${0.96 * u})`; });
    await new Promise((r) => setTimeout(r, 120));
    // the shimmer: the faces wipe away left to right and the game is behind them
    frame.style.visibility = 'visible';
    const l = line();
    await run(SWEEP, (u) => { const x = ease(u) * 100; box.style.clipPath = `inset(0 0 0 ${x}%)`; l.style.left = x + '%'; l.style.opacity = u > 0.92 ? (1 - u) / 0.08 : 1; });
    box.remove(); l.remove();
    layer.style.background = '#121419';
    state = 'open';
    try { history.pushState({ lublocks: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }

  async function close() {
    if (state !== 'open') return;
    state = 'closing';
    const fr = frontRect(), sl = slots();
    const { box, out } = tiles((k) => sl[k]);
    // the shimmer runs back right to left, bringing the faces back over the game
    box.style.clipPath = 'inset(0 0 0 100%)';
    const l = line();
    await run(SWEEP, (u) => { const x = 100 - ease(u) * 100; box.style.clipPath = `inset(0 0 0 ${x}%)`; l.style.left = x + '%'; l.style.opacity = u > 0.92 ? (1 - u) / 0.08 : 1; });
    l.remove(); frame.remove(); frame = null;
    await new Promise((r) => setTimeout(r, 100));
    // and they fold back into the cube
    await run(FLY + 5 * STAGGER, (u) => { place(out, (k, end) => (end ? { x: fr.left, y: fr.top, s: fr.width } : sl[k]), u); layer.style.background = `rgba(18,20,25,${0.96 * (1 - u)})`; });
    layer.remove(); layer = null;
    state = 'closed';
  }

  // the game's red square asks to close; so does the phone's back button (the game added a step to the history)
  addEventListener('message', (e) => { if (e.data === 'lublocks:close') { if (pushed) { pushed = false; history.back(); } else close(); } });
  addEventListener('popstate', () => { if (state === 'open') { pushed = false; close(); } });

  const _act = act;
  act = function (a) { if (a === 'blocks') { open(); return; } return _act.apply(this, arguments); };
  window.luBlocks = { open, close, get state() { return state; } };
})();
