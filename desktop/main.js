// Lu Cube desktop: a see-through layer over your whole screen. Only the sun wheel (in a corner) and the cube are visible;
// clicks anywhere else go straight through to whatever is underneath. It is NOT always on top: click any window and that
// window covers the cube like normal. Bring the cube back with Ctrl+Alt+M or its taskbar button.
const { app, BrowserWindow, ipcMain, screen, globalShortcut, shell, nativeImage, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const AUMID = "MusicCube.Desktop", ICON = path.join(__dirname, "musiccube.ico");
// "Make Taskbar Shortcut.bat" runs this with --make-shortcut: writes Start-menu and desktop shortcuts, then quits
if (process.argv.includes("--make-shortcut")) {
  app.whenReady().then(() => {
    const o = { target: process.execPath, args: '"' + __dirname + '"', cwd: path.resolve(__dirname, ".."), icon: ICON, iconIndex: 0, appUserModelId: AUMID, description: "Lu Cube" };
    const sm = path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "Lu Cube.lnk");
    shell.writeShortcutLink(sm, "replace", o);
    shell.writeShortcutLink(path.join(app.getPath("desktop"), "Lu Cube.lnk"), "replace", o);
    app.quit();
  });
}
const { spawn } = require("child_process");
let win = null, srv = null;
const root = path.resolve(__dirname, "..");
const stop = () => { try { srv && srv.kill(); } catch (e) {} };
function main() {
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (!app.requestSingleInstanceLock()) return app.quit();
app.whenReady().then(() => {
  // the same local player server as Lu Cube.bat (Python, no internet), started hidden
  srv = spawn(findPython(), [path.join(root, "musiccube.py"), "--no-window"], { cwd: root, windowsHide: true });
  let buf = "";
  srv.stdout.on("data", (d) => { buf += d; const m = buf.match(/http:\/\/127\.0\.0\.1:\d+\//); if (m && !win) open(m[0]); });
  srv.on("exit", () => app.quit());
});
}
// the stick's own Python first, then Anaconda, then whatever "python" is on the PATH
function findPython() {
  const c = [process.env.MC_PY, path.join(root, "python", "python.exe"), path.join(process.env.USERPROFILE || "", "anaconda3", "python.exe")];
  return c.find((p) => p && fs.existsSync(p)) || "python";
}
// one see-through layer over all your screens; the page gets each screen's rectangle so the wheel can dock on any edge
let pinD = null;
function layout() {
  let ds = screen.getAllDisplays(); const pid = screen.getPrimaryDisplay().id;
  // Windows can't stretch one see-through window across screens with different zoom (e.g. a laptop at 150% plus a
  // monitor at 100%): it comes out shrunk and shoved over. In that case Lu Cube lives on the main screen only.
  if (new Set(ds.map((d) => d.scaleFactor)).size > 1) {
    // pick one screen: the one you chose with Ctrl+Alt+Shift+M, otherwise the biggest external monitor, otherwise the main one
    const ext = ds.filter((d) => !d.internal).sort((a, b) => b.size.width * b.size.height - a.size.width * a.size.height);
    const pick = ds.find((d) => d.id === pinD) || ext[0] || ds.find((d) => d.id === pid) || ds[0];
    pinD = pick.id; ds = [pick];
  }
  const x0 = Math.min(...ds.map((d) => d.workArea.x)), y0 = Math.min(...ds.map((d) => d.workArea.y));
  const x1 = Math.max(...ds.map((d) => d.workArea.x + d.workArea.width)), y1 = Math.max(...ds.map((d) => d.workArea.y + d.workArea.height));
  return { bounds: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    list: ds.map((d) => ({ x: d.workArea.x - x0, y: d.workArea.y - y0, w: d.workArea.width, h: d.workArea.height, primary: d.id === pid })) };
}
function open(url) {
  const L = layout();
  win = new BrowserWindow({ ...L.bounds, transparent: true, frame: false, hasShadow: false, resizable: false, movable: false,
    alwaysOnTop: false, skipTaskbar: false, show: false, title: "Lu Cube", icon: ICON, backgroundColor: "#00000000", enableLargerThanScreen: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false } });
  const fit = (B) => { win.setBounds(B); for (const t of [120, 400, 1200]) setTimeout(() => win && win.setBounds(B), t); };
  fit(L.bounds); // set more than once: Windows rescales on the first move
  // stay hidden until it sits on the right screen, so you never see it jump there
  win.once("ready-to-show", () => { fit(layout().bounds); setTimeout(() => win && win.show(), 150); });
  setTimeout(() => win && !win.isVisible() && win.show(), 4000); // safety: show it anyway
  win.setIgnoreMouseEvents(true, { forward: true }); // see-through to clicks until the pointer is over the wheel or cube
  win.loadURL(url + "?desk=1#" + encodeURIComponent(JSON.stringify(L.list)));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; }); // Song Catcher links open in your browser
  win.on("closed", () => { stop(); app.quit(); });
  globalShortcut.register("CommandOrControl+Alt+M", front);
  // Ctrl+Alt+Shift+M: hop Lu Cube to your next screen (when your screens use different zoom it lives on one at a time)
  globalShortcut.register("CommandOrControl+Alt+Shift+M", () => { const ds = screen.getAllDisplays(), i = ds.findIndex((d) => d.id === pinD); pinD = ds[(i + 1) % ds.length].id; refit(); });
  // media keys (and Fn+F5/F6/F7-style laptop keys that send them), plus backups if your laptop's keys don't:
  // Ctrl+Alt+Space play/pause, Ctrl+Alt+N next, Ctrl+Alt+B back
  const media = (k) => () => win && win.webContents.send("media", k);
  for (const [key, k] of [["MediaPlayPause", "play"], ["MediaNextTrack", "next"], ["MediaPreviousTrack", "prev"],
    ["CommandOrControl+Alt+Space", "play"], ["CommandOrControl+Alt+N", "next"], ["CommandOrControl+Alt+B", "prev"]]) {
    try { globalShortcut.register(key, media(k)); } catch (err) {}
  }
  const refit = () => { if (!win) return; const N = layout(); fit(N.bounds); win.webContents.send("displays", N.list); };
  screen.on("display-added", refit); screen.on("display-removed", refit); screen.on("display-metrics-changed", refit);
}
// bring the cube and wheel back over your windows (Ctrl+Alt+M, or clicking it on the taskbar)
function front() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.moveTop(); win.focus();
  win.webContents.send("front");
  checkStick();
}
app.on("second-instance", front); // opening Lu Cube again while it's running just brings it forward
app.on("will-quit", () => globalShortcut.unregisterAll());
ipcMain.on("hit", (e, on) => { if (win) win.setIgnoreMouseEvents(!on, { forward: true }); });
// taskbar: hovering Lu Cube's button shows the cube (or the sun) and the song, with ⏮ ⏯ ⏭ buttons under it
const ico = (n) => nativeImage.createFromPath(path.join(__dirname, "icons", n + ".png"));
let lastPlaying = null;
ipcMain.on("np", (e, o) => {
  if (!win) return;
  win.setTitle(o.artist ? `${o.title} — ${o.artist}` : o.title || "Lu Cube");
  try { const [x, y, w, h] = o.rect; if (w > 0 && h > 0) win.setThumbnailClip({ x: Math.max(0, x), y: Math.max(0, y), width: Math.round(w), height: Math.round(h) }); } catch (err) {}
  if (o.playing !== lastPlaying) {
    lastPlaying = o.playing;
    const send = (k) => () => win && win.webContents.send("media", k);
    try { win.setThumbarButtons([
      { tooltip: "Previous", icon: ico("prev"), click: send("prev") },
      { tooltip: o.playing ? "Pause" : "Play", icon: ico(o.playing ? "pause" : "play"), click: send("play") },
      { tooltip: "Next", icon: ico("next"), click: send("next") }]); } catch (err) {}
  }
});
// a newer Lu Cube on a plugged-in stick? offer to update this computer's copy (your music and settings stay)
const asked = new Set();
async function checkStick() {
  if (!win) return;
  const local = await fs.promises.readFile(path.join(root, "version.txt"), "utf8").then((t) => t.trim()).catch(() => null);
  const home = process.env.USERPROFILE || "";
  const installed = local !== null || ["Lu Cube", "Music Cube"].some((n) => root.toLowerCase() === path.join(home, n).toLowerCase());
  if (!installed) return; // your own working copy never updates itself from a stick
  for (const L of "DEFGHIJKLMNOPQRSTUVWXYZ") for (const name of ["Lu Cube", "Music Cube"]) {
    const dir = L + ":\\" + name;
    if (dir.toLowerCase() === root.toLowerCase()) continue;
    const v = await fs.promises.readFile(path.join(dir, "version.txt"), "utf8").then((t) => t.trim()).catch(() => null);
    if (!v || !/^\d{14}$/.test(v) || v <= (local || "0") || asked.has(v)) continue;
    if (!fs.existsSync(L + ":\\Install Lu Cube.bat") && !fs.existsSync(L + ":\\Install Music Cube.bat")) continue;
    asked.add(v);
    const r = await dialog.showMessageBox({ type: "question", buttons: ["Update now", "Not now"], defaultId: 0, cancelId: 1, title: "Lu Cube",
      message: `There's a newer Lu Cube on the stick in ${L}:`, detail: "Update this computer's copy? Your music, favourites and settings stay as they are. Lu Cube restarts when it's done." });
    if (r.response !== 0) return;
    try {
      const skip = (p) => /\\(electron|python|Music|__pycache__)(\\|$)/i.test(p.slice(dir.length)) || /state\.json$/i.test(p);
      for (const f of await fs.promises.readdir(dir)) {
        const src = path.join(dir, f);
        if (skip(src)) continue;
        fs.cpSync(src, path.join(root, f), { recursive: true, force: true, filter: (p) => !skip(p) });
      }
    } catch (err) { dialog.showErrorBox("Lu Cube", "Couldn't finish the update: " + err.message); return; }
    for (const old of ["Music Cube.bat", "Music Cube Desktop.bat", "Make Music Cube Stick.bat"]) { try { if (fs.existsSync(path.join(root, "Lu Cube.bat"))) fs.unlinkSync(path.join(root, old)); } catch (err) {} }
    stop(); app.relaunch(); app.exit(0);
    return;
  }
}
setTimeout(() => { checkStick(); setInterval(checkStick, 60000); }, 5000);
ipcMain.on("quit", () => { stop(); app.quit(); });
ipcMain.on("minimize", () => { if (win) win.minimize(); }); // the unfolded window's yellow "−": down to the taskbar like any window
app.on("before-quit", stop);

if (!process.argv.includes("--make-shortcut")) main();
