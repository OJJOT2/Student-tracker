"use strict";
const electron = require("electron");
const api = {
  // Directory operations
  selectDirectory: () => electron.ipcRenderer.invoke("dir:select"),
  scanDirectory: (path, deepScan) => electron.ipcRenderer.invoke("dir:scan", path, deepScan),
  createDirectory: (path) => electron.ipcRenderer.invoke("dir:create", path),
  // Session metadata
  loadSessionMetadata: (sessionPath) => electron.ipcRenderer.invoke("session:read", sessionPath),
  saveSessionMetadata: (sessionPath, metadata) => electron.ipcRenderer.invoke("session:write", sessionPath, metadata),
  // Media
  getMediaPath: (filePath) => electron.ipcRenderer.invoke("media:path", filePath),
  // File reading (for PDFs)
  readFile: (filePath) => electron.ipcRenderer.invoke("file:read", filePath),
  // File writing (for saving PDFs)
  writeFile: (filePath, data) => electron.ipcRenderer.invoke("file:write", filePath, data),
  // Focus Mode
  setFocusMode: (enabled) => electron.ipcRenderer.invoke("app:focus-mode", enabled)
};
electron.contextBridge.exposeInMainWorld("api", api);
