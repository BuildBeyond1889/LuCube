// The page only gets two things: say whether the pointer is over the wheel/cube (so clicks elsewhere reach your desktop), and quit.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("cubeDesk", { hit: (on) => ipcRenderer.send("hit", !!on), quit: () => ipcRenderer.send("quit"), minimize: () => ipcRenderer.send("minimize"), onDisplays: (cb) => ipcRenderer.on("displays", (e, list) => cb(list)), onFront: (cb) => ipcRenderer.on("front", () => cb()),
  np: (o) => ipcRenderer.send("np", o), onMedia: (cb) => ipcRenderer.on("media", (e, k) => cb(k)) });
