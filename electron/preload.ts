import { contextBridge, ipcRenderer } from 'electron'

// Types exposed to renderer
export interface SessionMetadata {
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

export interface FolderNode {
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
    }
}

const api = {
    // Directory operations
    selectDirectory: (): Promise<string | null> =>
        ipcRenderer.invoke('dir:select'),

    scanDirectory: (path: string, deepScan?: boolean): Promise<FolderNode> =>
        ipcRenderer.invoke('dir:scan', path, deepScan),

    createDirectory: (path: string): Promise<boolean> =>
        ipcRenderer.invoke('dir:create', path),

    // Session metadata
    loadSessionMetadata: (sessionPath: string): Promise<SessionMetadata | null> =>
        ipcRenderer.invoke('session:read', sessionPath),

    saveSessionMetadata: (sessionPath: string, metadata: SessionMetadata): Promise<boolean> =>
        ipcRenderer.invoke('session:write', sessionPath, metadata),

    // Media
    getMediaPath: (filePath: string): Promise<string> =>
        ipcRenderer.invoke('media:path', filePath),

    // File reading (for PDFs)
    readFile: (filePath: string): Promise<ArrayBuffer> =>
        ipcRenderer.invoke('file:read', filePath),

    // File writing (for saving PDFs)
    writeFile: (filePath: string, data: ArrayBuffer): Promise<boolean> =>
        ipcRenderer.invoke('file:write', filePath, data),

    // Focus Mode
    setFocusMode: (enabled: boolean): Promise<boolean> =>
        ipcRenderer.invoke('app:focus-mode', enabled)
}

contextBridge.exposeInMainWorld('api', api)

// Type declaration for renderer
declare global {
    interface Window {
        api: typeof api
    }
}
