"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
async function parseFile(_filePath, _options = {}) {
  throw new Error("This function require a Node engine. To load Web API File objects use parseBlob instead.");
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
      // Enable webview for Browser Mode
    },
    titleBarStyle: "hiddenInset",
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../src/icon.png")
  });
  mainWindow.setMenu(null);
  electron.protocol.registerFileProtocol("media", (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace("media://", ""));
    callback({ path: filePath });
  });
  if (process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.handle("dir:select", async () => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Study Folder"
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});
electron.ipcMain.handle("dir:scan", async (_, dirPath, deepScan = false) => {
  console.log("Scanning directory:", dirPath, deepScan ? "(Deep Scan)" : "");
  try {
    const result = await scanDirectory(dirPath, deepScan);
    console.log("Scan result: success");
    return result;
  } catch (err) {
    console.error("Scan error:", err);
    throw err;
  }
});
electron.ipcMain.handle("dir:create", async (_, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (err) {
    console.error("Failed to create directory:", err);
    throw err;
  }
});
electron.ipcMain.handle("session:read", async (_, sessionPath) => {
  const metaPath = path.join(sessionPath, "session.meta.json");
  try {
    const content = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
});
electron.ipcMain.handle("session:write", async (_, sessionPath, metadata) => {
  const metaPath = path.join(sessionPath, "session.meta.json");
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
  return true;
});
electron.ipcMain.handle("media:path", async (_, filePath) => {
  return `media://${encodeURIComponent(filePath)}`;
});
electron.ipcMain.handle("file:read", async (_, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (err) {
    console.error("Failed to read file:", filePath, err);
    throw err;
  }
});
electron.ipcMain.handle("file:write", async (_, filePath, data) => {
  try {
    await fs.writeFile(filePath, Buffer.from(data));
    return true;
  } catch (err) {
    console.error("Failed to write file:", filePath, err);
    throw err;
  }
});
electron.ipcMain.handle("app:focus-mode", async (_, enabled) => {
  if (!mainWindow) return;
  if (enabled) {
    mainWindow.setFullScreen(true);
    mainWindow.setAlwaysOnTop(true, "screen-saver");
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
  }
  return true;
});
async function scanDirectory(dirPath, deepScan = false) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile());
  const dirs = entries.filter((e) => e.isDirectory());
  const mp4Files = files.filter((f) => f.name.toLowerCase().endsWith(".mp4")).map((f) => f.name);
  const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith(".pdf")).map((f) => f.name);
  if (mp4Files.length > 0) {
    const metadata = await loadOrCreateMetadata(dirPath, mp4Files, deepScan);
    let progress = 0;
    const videoProgress = Object.values(metadata.videos);
    let totalTimeWatched = 0;
    let totalDuration = 0;
    let hasDuration = false;
    for (const v of videoProgress) {
      if (v.duration && v.duration > 0) {
        hasDuration = true;
        totalDuration += v.duration;
        const effectiveWatch = v.completed ? v.duration : v.lastPosition || 0;
        totalTimeWatched += effectiveWatch;
      }
    }
    if (hasDuration && totalDuration > 0) {
      progress = Math.min(100, Math.round(totalTimeWatched / totalDuration * 100));
    } else {
      const completedCount = videoProgress.filter((v) => v.completed).length;
      progress = mp4Files.length > 0 ? Math.round(completedCount / mp4Files.length * 100) : 0;
    }
    return {
      type: "session",
      path: dirPath,
      name: metadata.customName || path.basename(dirPath),
      session: {
        id: metadata.id,
        videos: mp4Files,
        pdfs: pdfFiles,
        status: metadata.status,
        progress,
        totalWatchTime: metadata.totalWatchTime,
        lastAccessedAt: metadata.lastAccessedAt,
        completedAt: metadata.completedAt,
        customName: metadata.customName,
        description: metadata.description
      }
    };
  }
  const children = [];
  for (const dir of dirs) {
    if (dir.name.startsWith(".")) continue;
    const childNode = await scanDirectory(path.join(dirPath, dir.name), deepScan);
    if (childNode.type === "session" || childNode.children && childNode.children.length > 0) {
      children.push(childNode);
    }
  }
  return {
    type: "category",
    path: dirPath,
    name: path.basename(dirPath),
    children
  };
}
async function loadOrCreateMetadata(sessionPath, mp4Files, deepScan) {
  const metaPath = path.join(sessionPath, "session.meta.json");
  let saveNeeded = false;
  try {
    const content = await fs.readFile(metaPath, "utf-8");
    const metadata = JSON.parse(content);
    for (const file of mp4Files) {
      let fileChanged = false;
      if (!metadata.videos[file]) {
        metadata.videos[file] = {
          watchTime: 0,
          lastPosition: 0,
          completed: false,
          playCount: 0,
          duration: 0
        };
        fileChanged = true;
        saveNeeded = true;
      }
      if ((fileChanged || deepScan) && !metadata.videos[file].duration) {
        try {
          const filePath = path.join(sessionPath, file);
          const meta = await parseFile(filePath);
          if (meta.format.duration) {
            metadata.videos[file].duration = meta.format.duration;
            saveNeeded = true;
          }
        } catch (e) {
          console.error(`Failed to parse duration for ${file}:`, e);
        }
      }
    }
    if (deepScan && saveNeeded) {
      await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
    }
    return metadata;
  } catch {
    const metadata = {
      id: crypto.randomUUID(),
      originalPath: sessionPath,
      customName: null,
      description: "",
      notes: "",
      tags: [],
      status: "untouched",
      videos: {},
      marks: [],
      totalWatchTime: 0,
      sessionsCount: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastAccessedAt: (/* @__PURE__ */ new Date()).toISOString(),
      completedAt: null
    };
    for (const file of mp4Files) {
      let duration = 0;
      try {
        const filePath = path.join(sessionPath, file);
        const meta = await parseFile(filePath);
        duration = meta.format.duration || 0;
      } catch (e) {
        console.error(`Failed to parse duration for ${file} (init):`, e);
      }
      metadata.videos[file] = {
        watchTime: 0,
        lastPosition: 0,
        completed: false,
        playCount: 0,
        duration
      };
    }
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
    return metadata;
  }
}
