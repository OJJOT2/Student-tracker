"use strict";
const electron = require("electron");
const api = {
  // Directory operations
  selectDirectory: () => electron.ipcRenderer.invoke("dir:select"),
  scanDirectory: (path) => electron.ipcRenderer.invoke("dir:scan", path),
  // Session metadata
  loadSessionMetadata: (sessionPath) => electron.ipcRenderer.invoke("session:read", sessionPath),
  saveSessionMetadata: (sessionPath, metadata) => electron.ipcRenderer.invoke("session:write", sessionPath, metadata),
  // Media
  getMediaPath: (filePath) => electron.ipcRenderer.invoke("media:path", filePath)
};
electron.contextBridge.exposeInMainWorld("api", api);
