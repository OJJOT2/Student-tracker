import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { parseFile } from 'music-metadata'

// Types
interface SessionMetadata {
    id: string
    originalPath: string
    customName: string | null
    description: string
    notes: string
    tags: string[]
    status: 'untouched' | 'started' | 'completed'
    videos: Record<string, {
        watchTime: number
        lastPosition: number
        completed: boolean
        playCount: number
        duration?: number
    }>
    marks: Array<{
        id: string
        videoFile: string
        timestamp: number
        label: string
        color: string
        createdAt: string
    }>
    totalWatchTime: number
    sessionsCount: number
    createdAt: string
    lastAccessedAt: string
    completedAt: string | null
}

interface FolderNode {
    type: 'session' | 'category'
    path: string
    name: string
    children?: FolderNode[]
    session?: {
        id: string
        videos: string[]
        pdfs: string[]
        status: 'untouched' | 'started' | 'completed'
        progress: number
        totalWatchTime: number
        lastAccessedAt: string
        completedAt: string | null
        customName: string | null
        description: string
    }
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true // Enable webview for Browser Mode
        },
        titleBarStyle: 'hiddenInset',
        show: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../src/icon.png')
    })

    mainWindow.setMenu(null)

    // Register custom protocol for local files
    protocol.registerFileProtocol('media', (request, callback) => {
        const filePath = decodeURIComponent(request.url.replace('media://', ''))
        callback({ path: filePath })
    })

    if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show()
    })
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// ============= IPC HANDLERS =============

// Select directory dialog
ipcMain.handle('dir:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
        title: 'Select Study Folder'
    })

    if (result.canceled) return null
    return result.filePaths[0]
})

// Scan directory for sessions
ipcMain.handle('dir:scan', async (_, dirPath: string, deepScan: boolean = false): Promise<FolderNode> => {
    console.log('Scanning directory:', dirPath, deepScan ? '(Deep Scan)' : '')
    try {
        const result = await scanDirectory(dirPath, deepScan)
        console.log('Scan result: success')
        return result
    } catch (err) {
        console.error('Scan error:', err)
        throw err
    }
})

// Create directory
ipcMain.handle('dir:create', async (_, dirPath: string) => {
    try {
        await fs.mkdir(dirPath, { recursive: true })
        return true
    } catch (err) {
        console.error('Failed to create directory:', err)
        throw err
    }
})

// Load session metadata
ipcMain.handle('session:read', async (_, sessionPath: string): Promise<SessionMetadata | null> => {
    const metaPath = path.join(sessionPath, 'session.meta.json')
    try {
        const content = await fs.readFile(metaPath, 'utf-8')
        return JSON.parse(content)
    } catch {
        return null
    }
})

// Save session metadata
ipcMain.handle('session:write', async (_, sessionPath: string, metadata: SessionMetadata) => {
    const metaPath = path.join(sessionPath, 'session.meta.json')
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2))
    return true
})

// Get file path for media protocol
ipcMain.handle('media:path', async (_, filePath: string) => {
    return `media://${encodeURIComponent(filePath)}`
})

// Read file as buffer (for PDFs)
ipcMain.handle('file:read', async (_, filePath: string) => {
    try {
        const buffer = await fs.readFile(filePath)
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    } catch (err) {
        console.error('Failed to read file:', filePath, err)
        throw err
    }
})

// Write file from buffer (for saving PDFs)
ipcMain.handle('file:write', async (_, filePath: string, data: ArrayBuffer) => {
    try {
        await fs.writeFile(filePath, Buffer.from(data))
        return true
    } catch (err) {
        console.error('Failed to write file:', filePath, err)
        throw err
    }
})

// Toggle Focus Mode (Always on Top / Kiosk)
ipcMain.handle('app:focus-mode', async (_, enabled: boolean) => {
    if (!mainWindow) return

    // On Windows, setFullScreen alone might suffice for kiosk-like feel
    // But setAlwaysOnTop ensures it stays there

    if (enabled) {
        mainWindow.setFullScreen(true)
        mainWindow.setAlwaysOnTop(true, 'screen-saver') // 'screen-saver' level is very high
    } else {
        mainWindow.setAlwaysOnTop(false)
        mainWindow.setFullScreen(false)
    }
    return true
})

// ============= DIRECTORY SCANNER =============

async function scanDirectory(dirPath: string, deepScan: boolean = false): Promise<FolderNode> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    const files = entries.filter(e => e.isFile())
    const dirs = entries.filter(e => e.isDirectory())

    const mp4Files = files
        .filter(f => f.name.toLowerCase().endsWith('.mp4'))
        .map(f => f.name)
    const pdfFiles = files
        .filter(f => f.name.toLowerCase().endsWith('.pdf'))
        .map(f => f.name)

    // Session detection: has MP4 files
    if (mp4Files.length > 0) {
        const metadata = await loadOrCreateMetadata(dirPath, mp4Files, deepScan)

        // Calculate progress
        let progress = 0
        const videoProgress = Object.values(metadata.videos)

        let totalTimeWatched = 0
        let totalDuration = 0
        let hasDuration = false

        for (const v of videoProgress) {
            if (v.duration && v.duration > 0) {
                hasDuration = true
                totalDuration += v.duration
                // If completed, count full duration, otherwise last position
                const effectiveWatch = v.completed ? v.duration : (v.lastPosition || 0)
                totalTimeWatched += effectiveWatch
            }
        }

        if (hasDuration && totalDuration > 0) {
            progress = Math.min(100, Math.round((totalTimeWatched / totalDuration) * 100))
        } else {
            // Fallback to count
            const completedCount = videoProgress.filter(v => v.completed).length
            progress = mp4Files.length > 0
                ? Math.round((completedCount / mp4Files.length) * 100)
                : 0
        }

        return {
            type: 'session',
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
        }
    }

    // Category: recurse into subdirectories
    const children: FolderNode[] = []
    for (const dir of dirs) {
        if (dir.name.startsWith('.')) continue // Skip hidden

        const childNode = await scanDirectory(path.join(dirPath, dir.name), deepScan)
        // Only include non-empty categories or sessions
        if (childNode.type === 'session' || (childNode.children && childNode.children.length > 0)) {
            children.push(childNode)
        }
    }

    return {
        type: 'category',
        path: dirPath,
        name: path.basename(dirPath),
        children
    }
}

async function loadOrCreateMetadata(sessionPath: string, mp4Files: string[], deepScan: boolean): Promise<SessionMetadata> {
    const metaPath = path.join(sessionPath, 'session.meta.json')
    let saveNeeded = false

    try {
        const content = await fs.readFile(metaPath, 'utf-8')
        const metadata = JSON.parse(content) as SessionMetadata

        // Ensure all video files are tracked
        for (const file of mp4Files) {
            let fileChanged = false
            if (!metadata.videos[file]) {
                metadata.videos[file] = {
                    watchTime: 0,
                    lastPosition: 0,
                    completed: false,
                    playCount: 0,
                    duration: 0
                }
                fileChanged = true
                saveNeeded = true
            }

            // Check if duration is missing (and we want to fill it)
            // If playCount > 0 or we have watchTime, maybe we already have it? 
            // Better to check if duration is falsy.
            if ((fileChanged || deepScan) && !metadata.videos[file].duration) {
                try {
                    const filePath = path.join(sessionPath, file)
                    const meta = await parseFile(filePath)
                    if (meta.format.duration) {
                        metadata.videos[file].duration = meta.format.duration
                        saveNeeded = true
                    }
                } catch (e) {
                    console.error(`Failed to parse duration for ${file}:`, e)
                }
            }
        }

        if (deepScan && saveNeeded) {
            await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2))
        }

        return metadata
    } catch {
        // Create new metadata
        const metadata: SessionMetadata = {
            id: crypto.randomUUID(),
            originalPath: sessionPath,
            customName: null,
            description: '',
            notes: '',
            tags: [],
            status: 'untouched',
            videos: {},
            marks: [],
            totalWatchTime: 0,
            sessionsCount: 0,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            completedAt: null
        }

        // Initialize video progress
        for (const file of mp4Files) {
            let duration = 0
            try {
                const filePath = path.join(sessionPath, file)
                const meta = await parseFile(filePath)
                duration = meta.format.duration || 0
            } catch (e) {
                console.error(`Failed to parse duration for ${file} (init):`, e)
            }

            metadata.videos[file] = {
                watchTime: 0,
                lastPosition: 0,
                completed: false,
                playCount: 0,
                duration
            }
        }

        // Save to disk
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2))

        return metadata
    }
}
