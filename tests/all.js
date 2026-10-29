// Lu Cube tap tests: really taps, clicks and drags through the PC, iPad and iPhone versions.
//   node tests/all.js [pc|ipad|iphone ...]
// Expects the PC test server on :8820 (python3 tests/pc_server.py 8820) and the built web app
// (docs/app) served on :8811. tests/run.sh does all of that for you.
const { results } = require('./lib');
const PC = process.env.LU_PC || 'http://127.0.0.1:8820/';
const WEB = process.env.LU_WEB || 'http://127.0.0.1:8811/';
const pick = process.argv.slice(2);
const want = (n) => !pick.length || pick.includes(n);

(async () => {
  if (want('pc')) await require('./pc')(PC);
  if (want('ipad')) await require('./ipad')(WEB + 'ipad.html');
  if (want('iphone')) await require('./iphone')(WEB + 'index.html');
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length} passed, ${bad.length} failed`);
  bad.forEach((r) => console.log(`  FAILED  ${r.name}`));
  process.exit(bad.length ? 1 : 0);
})();
