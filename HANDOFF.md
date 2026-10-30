# Lu Cube: handoff for the next Claude

Everything a fresh session needs to pick up Lu Cube where the last one stopped: what it is, how it's built and
shipped, where each piece lives, what's been done, the traps that have already bitten, how the owner likes to
work, and what's still open. Read this first, then the code.

---

## 1. What Lu Cube is

A 3D cube music player plus a world radio, by **BuildBeyond1889** (repo: `github.com/BuildBeyond1889/LuCube`, public).

- **Lu mode** plays your own music library: playlists, lyrics (.lrc), visualiser, sleep timer, crossfade, shuffle.
- **Radio mode** plays roughly 50,000 live stations from radio-browser.info, by country, with a spinning globe,
  a "passport" of countries visited, a wake-up alarm, favourite stations, and a "Song Catcher" (♥ "catch") list of
  songs heard on the radio.
- Six interactive cube faces, a corner "wheel", an **unfolded window** (the cube flattens into a full display with
  Pong, a depth visualiser, play panel, country tiles, Caught list), and a red square that **shatters** the cube.
- **Lu Blocks** (new): a six-faced block puzzle game on a cube, playable inside the Android app.

Design language: bold Lu Cube look. Blue title bars with red / yellow / orange squares, black 3px outlines, flat
primaries (yellow `#ffc21a`, orange `#ff7a1a`, red `#e0281a`, blue `#2f6be8`, green, purple, grey panels `#cfd6df`),
dark room background. Fonts: **Anton** (display), **Space Mono** (labels), **Inter** (body), all bundled locally
in `web/fonts`. The owner wants it "professional but light", with animations and graphics "as precise as possible".

## 2. Where each version runs

| Version | Source | How it's built | How the owner gets it |
|---|---|---|---|
| **PC** (Windows) | `web/index.html` served by `musiccube.py`; desktop overlay is Electron (`desktop/main.js`, `preload.js`, page loaded with `?desk=1`) | nothing to build | `Update Lu Cube.bat` (see §5) or a USB stick |
| **Android** app | `web/index.html` + `phone/src/*` → `phone/www` via `phone/build_www.py`; Capacitor (`com.buildbeyond.lucube`), Java in `phone/android/app/src/main/java/com/buildbeyond/lucube/` | GitHub Actions `android.yml` | the app's own **Update** button (downloads the newest APK from the `phone-latest` release) |
| **iPhone** web app | `phone/build_web.py` → `docs/app/index.html` (`web.js` replaces `native.js`; `sw.js` service worker) | run the script, commit `docs/` | GitHub Pages: `buildbeyond1889.github.io/LuCube/app` (Add to Home Screen) |
| **iPad** web app | same script → `docs/app/ipad.html` (adds `IPAD_CSS` / `IPAD_JS`) | same | same site, `ipad.html` |
| Website | `docs/index.html`, `docs/phone.html`, `docs/skins.html`, `docs/img/` | static | Pages |

The owner's PC install is **`D:\Lu Cube`** on "LuPC"; their pinned taskbar shortcut runs that copy. They test on an
**iPad mini 4** (iPadOS 15: no Wake Lock), an **Android phone**, and an **iPhone**.

## 3. Repo map

```
web/index.html          THE app. One big page (≈195 KB): cube, wheel, faces, radio, unfolded window, visualiser. Shared by every version.
web/fonts/              Anton, Inter, Space Mono (woff2 + OFL licences)
musiccube.py            PC server: library scan (/api/library), state (/api/state), radio relay (/api/radio/world|search|title|play),
                        Phone Sync server, --set-town, take_stick_stuff() (merges mystuff.json from a stick into state.json)
desktop/                Electron overlay (main.js: window, taskbar buttons, stick auto-update offer; preload.js exposes cubeDesk incl. minimize)
phone/build_www.py      Android page build (string swaps on web/index.html + phone/src). Also writes www/blocks.html (Lu Blocks)
phone/build_web.py      iPhone/iPad web-app build → docs/app
phone/src/native.js     Android bridge (NativeAudio, LuNativePlugin calls, spectrum polling)
phone/src/web.js        iPhone/iPad bridge (LuAudio facade, ICY title lookups, IndexedDB song library)
phone/src/phone.js      phone layer: top bar, mode segments (#pseg), dots, bottom wheel/globe, World face 9-per-face, updates, Phone Sync
phone/src/intro.js/.css the 9-second unskippable phone opening (origami cube, "LISTEN TO THE UNIVERSE", LU)
phone/src/blocks-host.js  Android only: LU BLOCKS button → full-screen shimmer → game iframe; red square / back button reverses
phone/android/          Capacitor Android project (LuTap.java = audio tap for the visualiser FFT; LuPlayerService; LuNativePlugin; alarm; widget)
blocks/game.html        Lu Blocks game source
blocks/rings.html       "How Rings Work" walkthrough source
blocks/make.py          composes game + walkthrough (sealed in a shadow DOM) → blocks/lu-blocks.html
tests/                  tap tests (Playwright): run.sh, all.js, lib.js, window.js, pc.js, ipad.js, iphone.js, pc_server.py, fixtures/
tools/mk_update.py      builds the single-file PC updater "Update Lu Cube.bat"
tools/update.ps1        the PowerShell the updater runs (finds every Lu Cube folder, closes it, swaps files, restarts)
stick/Install Lu Cube.bat   installer that lives on a USB stick
Make Lu Cube Stick.bat  makes the stick (pulls newest code from GitHub first, carries the owner's stuff)
*.bat, get_*.py         launchers, music/audiobook downloaders, Phone Sync, weather town, taskbar shortcut
.github/workflows/      android.yml (taps → APK → release), tests.yml (taps on every push)
docs/                   website + the iPhone/iPad web app (Pages serves /docs on main)
```

### Inside `web/index.html` (the names you'll keep meeting)

- State: `P` (`pl`, `idx`, `playing`, `has`), `PLS` (playlists; in radio mode one per country, `PLS[0]` is
  ★ FAVOURITES with `.fav`), `MODE` (`'lu'|'radio'`), `VIEWPL` (playlist being *viewed* without playing, used for
  favourites), `WORLD`, `PASS` (passport), `AL` (alarm), `RKEEP`, `cubeOn`, `shatter`, `WIPING`.
- Actions: `act('kind:value')`. Everything with `data-act` routes through it (`song:i`, `pl:i`, `gen:i`, `fav`,
  `catch`, `max`, `mode`, `next`…). Phone and Android layers **wrap** `act`, `renderFaces` etc. by reassigning the
  global.
- Faces: `FACE` (name → normal/up/element id: F_COVER, F_NOW, F_LYR, F_VIZ, F_LIB, F_PL), `front()`, `goFace()`,
  `upright()`, `luRenderFaces()` / `radRenderFaces()`, `TB()` (title bar), `SCR()` (scroll arrows).
- Pointer on the cube: a `#pad` layer over it; `actAt(x,y)` / `listAt` hit-test the **front face** by bounding
  rects (browsers can't hit-test turned 3D panels).
- Mode switch: `switchMode()` and its **shimmer**: snapshot overlays `.wipeOld` clipped by `inset(0 0 0 x%)` with a
  glowing `.wipeLn` line, 1250 ms ease-in-out. Lu Blocks reuses this look.
- Unfolded window: `maximize` → `mxBuild` → `mxRender` / `mxClick` / `mxScroll` / `mxFit` / `mxPlace` / `mxClose`
  / `mxShatter` / `mxPong` (endless) / `mxCaught` / `vizFS`. Globals `MXS` (2 = open), `MXFULL` (iPad = whole screen),
  `VIZTAP`, `mxList`, `mxLib`.
- Visualiser: `dSpectrum` + `dLevel` (auto gain, per-band levelling, spectral-flux kicks), FFT 1024, up to 16 kHz,
  `drawDepth()`. Android feeds a real FFT from `LuTap.java`; the iPhone/iPad get a stand-in animation.
- Inline comments in this file must be `/* */` on lines that continue. A `//` mid-line once broke the whole page.

## 4. Build, test, ship (the routine)

```bash
git clone https://github.com/BuildBeyond1889/LuCube && cd LuCube
python3 phone/build_web.py      # iPhone/iPad → docs/app (commit the result)
python3 phone/build_www.py      # Android page → phone/www (gitignored; CI builds it too)
python3 blocks/make.py          # Lu Blocks → blocks/lu-blocks.html (commit it)
cd tests && npm install && npx playwright install chromium && cd ..
tests/run.sh                    # all tap tests; or tests/run.sh pc / ipad / iphone
```

- **Run the tap tests before every push.** Pages (iPhone/iPad) goes live the moment you push and is *not* gated.
  The Android APK *is* gated: `android.yml` runs the `taps` job first. The tests use **real** mouse presses and finger
  taps (CDP touch events) because a fake tap once hid a pointer-capture bug.
- Android release: each build uploads `LuCube-<run>.apk` plus `LuCube.apk` to the `phone-latest` release, keeps the 3
  newest numbered APKs, and never deletes the release. The app downloads the numbered APK (3 retries, shows errors).
- Commit messages end with the attribution lines the session gives you (Co-Authored-By / Claude-Session).
- After pushing Android changes, wait for the run: `gh run list -w "Android app" -L 1`, then `gh run watch <id>`.

## 5. Getting changes onto the owner's PC

He wants **one file**, not zips. Build it and send it:

```bash
python3 tools/mk_update.py . tools/update.ps1 "Update Lu Cube.bat"
```

It embeds `web/index.html`, `desktop/main.js`, `desktop/preload.js`, `musiccube.py`, `get_audiobooks.py`,
`Make Lu Cube Stick.bat` and `stick/Install Lu Cube.bat`. Add more by extending `files` in `mk_update.py` and the
`$files` list in `update.ps1` (names in the bat can't have spaces; the 3rd element of a `$files` entry is the real name).

**USB stick:** `Make Lu Cube Stick.bat` downloads the repo zip from GitHub, updates the PC's own copy, copies
everything to the stick, writes `mystuff.json` (the whole `state.json` minus window position), and finally updates
itself. On another PC, `musiccube.py` folds `mystuff.json` into `state.json` on start (unions favourites and caught,
merges passport, takes settings/town/alarm) and renames it `mystuff.applied.json`. An installed copy offers to
update itself when a newer stick (by `version.txt`) is plugged in.

## 6. Lu Blocks (the game)

- Six 5×5 faces. You play only on the face toward you; spin the cube freely (360°, flick momentum, settles onto the
  nearest of the 24 orientations; data is remapped by the settled rotation). Yellow L-shaped corners also spin it.
- Place a block by dragging it from the tray (it waits, glowing; tap it to set it down, drag to move, tap away to put
  it back), **or** tap a tray block to pick it and tap the face to place it. There's no "Place it" button; the owner
  asked for it to be removed.
- A full row/column clears and its line becomes **charged** (solid yellow). Every line belongs to a **ring** through
  four faces. A ring charged on 3 faces **pulses** (all in step). Charging the 4th face makes it **blast**: every block
  in its 20 squares is cleared, +500 (2 rings at once = +2000). Line clears give 50·n², plus combo bonus.
- Game over only when no tray block fits on any face in any orientation. A naive bot played 140–980 moves, so games
  run long; ideas to add pressure are in §9.
- Help (yellow square) opens the **How Rings Work** walkthrough (7 animated steps; shown automatically the first time).
  In the app its bar has only a red close square with an X.
- **Android:** the lyrics face (Lu mode) has a yellow `▦ LU BLOCKS` pill next to `BACK TO PLAYER` (only when the
  library has songs). Tapping it sends the shimmer across the whole screen to reveal the game in an iframe
  (`blocks.html?embed=1`). In the game, red = back to Lu Cube, yellow = help, orange = new game. The phone's back
  button also closes it. Music keeps playing. **Not on PC/iPad/iPhone yet** (owner chose Android first).
- Claude artifacts (owner's, private): **Lu Blocks** `https://claude.ai/artifact/RtY81jy32mwvSQGVmS5RmU` and
  **How Rings Work** `https://claude.ai/artifact/PJEjuP768njcMk8X5kTeUF`. To update the Lu Blocks one, publish
  `blocks/lu-blocks.html`'s content to that URL.

## 7. What's been built (newest first, condensed)

**Oct 28–30**
- Lu Blocks prototype → Android integration (above); walkthrough demo; shimmer-only open/close; one red X on the
  walkthrough; proper "i" icon.
- Tap tests + CI gating; proven by reintroducing an old bug (6 checks failed).
- Stick pulls newest code from GitHub and carries all the owner's stuff.
- Unfolded window: pinned ★ FAVOURITES button (views favourites via `VIEWPL`, toggles back); fixed "nothing can be
  clicked" (pointer capture now only starts once a drag moves >8 px).
- Tap the unfolded visualiser to go full screen (iPad: whole screen + wake lock; PC: just the window's box).
- Visualiser overhaul (faster, auto-levelled, whole plane moves, real FFT on Android, stand-in spans full width).
- Unfolded radio: Live From box removed, Caught list fills up, local time/weather line, now-playing ticker, catch ♥,
  centred ★, country tile on the cover, red square shatters the flat panels, PC yellow square = "−" minimise.
- iPad: unfold fills the screen and re-fits on rotation (polled), corner handles by touch, switch button bottom-right
  (hint layer made click-through), smaller starting cube, Pong paddle by finger, title removed, search higher.
- Title-bar squares: full height on **PC and iPad**; small originals on **iPhone and Android**.
- Phones: globe turns to the chosen country, unskippable opening (Android locks portrait during it; iPhone re-lays
  out on turn), phones always open on Lu, sideways layout hides the wheel and fits the cube, finger-drag scrolling
  everywhere, bigger genre arrows, 9 countries per World face, iPhone globe lowered.
- iPhone/iPad: volume (songs via Web Audio gain; radio when CORS allows), more stations show titles (icecast, azura,
  radio.co, shoutcast, in-stream ICY), plain ⏮⏭ icons.
- Phone Sync: copies folder covers, leaves audiobooks on the PC and removes ones already synced. Android update
  reliability (numbered APKs, retries).
- Pong: endless (briefly ended at 7; owner wanted endless).

**Oct 24–26**: first release: wheel + cube, world radio, passport, website, Android app, phone opening animation,
LU logo with raised cube, Song Catcher, desktop multi-monitor fixes, Get Audiobooks (LibriVox), stick favourites.

`git log --oneline` has all 80+ commits with plain-English messages.

## 8. Traps already hit (don't repeat them)

- `pkill -f <pattern>` / `pgrep -f` in the sandbox matches its own shell and kills it (exit 144). Kill by PID from
  `ss -ltnp` or a saved PID instead.
- `//` comments in `web/index.html` mid-line: use `/* */`.
- Playwright `page.route` mocks bypass CORS, so to test real CORS/ICY behaviour, run small local servers.
- `setPointerCapture` on pointerdown retargets the `click` to the container → taps on tiles did nothing. Capture only
  after real movement.
- iOS needs size polling to catch rotation reliably.
- In the claude.ai artifact viewer, `window.claude.hot.ready()` starts the page *late*. Any first-frame render must not
  mark things as drawn (the Lu Blocks tray showed empty because of this).
- Charged-cell pulse animations restarting per cell drift out of phase. Sync them with a negative `animation-delay`
  from a shared clock.
- Robocopy `/XO` skipped newer code on sticks; code files now always overwrite.
- A running `.bat` must not overwrite itself mid-run. The stick maker replaces itself on its very last line.
- Android WebView: the back button follows history, so `history.pushState` when opening an overlay and close it on
  `popstate`.
- iPad mini 4 (iPadOS 15) has no Screen Wake Lock. The owner set Auto-Lock to Never instead.
- The repo/website "Pages" deploy is not gated by tests. Run `tests/run.sh` before pushing.

## 9. Open ideas and decisions waiting on the owner

- **Lu Blocks:** bring it to PC / iPad / iPhone; add pressure so six-face runs end (neglected faces fill with junk
  blocks; ring blasts pay power-ups like a 3×3 bomb or a fits-anywhere block; bigger pieces over time; a daily 60-piece
  cube). He said "keep the blast". Show the button with an empty library too.
- **Sync favourites/Caught across devices.** Plan: a private GitHub gist with a gist-only token (QR from the PC for
  iPhone/iPad), because the HTTPS web app can't talk to the PC's plain-http server. Awaiting his go-ahead.
- **Google Play Store:** he's considering selling for ~$4 (a tech contact suggested it). Needs a $25 account, 12 testers
  for 14 days (new personal accounts), a Play build without the self-updater and `REQUEST_INSTALL_PACKAGES`, the
  exact-alarm permission swapped (`USE_EXACT_ALARM` is for alarm-clock apps), an AAB, a privacy policy, and a store
  listing. Decision pending: $3.99 up front vs free with a $3.99 unlock. Note the radio-stream rights risk and check
  the name.
- Other suggestions on the table: lock-screen controls on iPhone/iPad (Media Session), skip dead stations
  automatically, a recently-played list in the unfolded window.
- Mac version: not yet. iPhone native app: needs $99/yr Apple account plus a Mac.

## 10. Working with the owner

- Direct, enthusiastic, swears casually ("fuck yeah" = happy). Short messages, often several changes at once, often
  with phone screenshots. Mirror his energy lightly; don't lecture.
- He tests on real devices right after you push and reports exactly what's off, so describe what changed and how
  to get it ("press Update in the app", "reload the web app", "run Update Lu Cube.bat").
- Show a **mockup first** for new visual features. Ask before big or ambiguous builds; otherwise just do it.
- Device-specific asks are deliberate (iPad ≠ PC ≠ iPhone ≠ Android). Change only the platform he names, and
  confirm which when unclear. Several reverts came from applying a change too widely.
- Never leave him a broken build: verify in Playwright with the matching device emulation, screenshot it, look
  at it, then push.
