// Lu Blocks inside the Android app. The lyrics face's LU BLOCKS button sends the mode-switch shimmer across
// the whole screen and leaves the game behind it (www/blocks.html). The game's red square, or the phone's back
// button, runs the shimmer back the other way. The music keeps playing.
(() => {
  const SWEEP = 1250;
  let state = 'closed', layer = null, frame = null, pushed = false;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  const line = () => {
    const l = document.createElement('div');
    l.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;z-index:3;pointer-events:none;background:#fff;box-shadow:0 0 6px 1px #fff,0 0 16px 4px rgba(255,194,26,.9),0 0 38px 10px rgba(255,122,26,.45)';
    layer.appendChild(l); return l;
  };
  const run = (ms, fn) => new Promise((res) => { const t0 = performance.now(); const st = (now) => { const u = Math.min(1, (now - t0) / ms); fn(u); if (u < 1) requestAnimationFrame(st); else res(); }; requestAnimationFrame(st); });

  // the game sits over the cube, and the shimmer line sweeps across the screen uncovering it: left to right in, right to left out
  const reveal = (x) => { frame.style.clipPath = `inset(0 ${100 - x}% 0 0)`; };
  async function open() {
    if (state !== 'closed' || (typeof WIPING !== 'undefined' && WIPING)) return;
    state = 'opening';
    layer = document.createElement('div'); layer.id = 'lublocks';
    layer.style.cssText = 'position:fixed;inset:0;z-index:9000;touch-action:none';
    document.body.appendChild(layer);
    frame = document.createElement('iframe');
    frame.src = 'blocks.html?embed=1'; frame.title = 'Lu Blocks';
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#121419;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box;will-change:clip-path';
    reveal(0);
    layer.appendChild(frame);
    await new Promise((r) => { frame.addEventListener('load', r, { once: true }); setTimeout(r, 900); });
    const l = line();
    await run(SWEEP, (u) => { const x = ease(u) * 100; reveal(x); l.style.left = x + '%'; l.style.opacity = u > 0.92 ? (1 - u) / 0.08 : 1; });
    l.remove(); frame.style.clipPath = 'none';
    state = 'open';
    try { history.pushState({ lublocks: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }

  async function close() {
    if (state !== 'open') return;
    state = 'closing';
    const l = line();
    await run(SWEEP, (u) => { const x = 100 - ease(u) * 100; reveal(x); l.style.left = x + '%'; l.style.opacity = u > 0.92 ? (1 - u) / 0.08 : 1; });
    layer.remove(); layer = null; frame = null;
    state = 'closed';
  }

  // the game's red square asks to close; so does the phone's back button (the game added a step to the history)
  addEventListener('message', (e) => { if (e.data === 'lublocks:close') { if (pushed) { pushed = false; history.back(); } else close(); } });
  addEventListener('popstate', () => { if (state === 'open') { pushed = false; close(); } });

  const _act = act;
  act = function (a) { if (a === 'blocks') { open(); return; } return _act.apply(this, arguments); };
  window.luBlocks = { open, close, get state() { return state; } };
})();
