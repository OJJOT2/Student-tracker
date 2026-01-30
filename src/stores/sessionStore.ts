import { create } from 'zustand'
import type { FolderNode, SessionMetadata, Session } from '../types/session'

const STORAGE_KEY = 'student-tracker-last-folder'

interface SessionStore {
    // State
    rootDirectory: string | null
    folderTree: FolderNode | null
    selectedSessionPath: string | null
    selectedSession: Session | null
    isLoading: boolean
    error: string | null

    // Actions
    init: () => Promise<void>
    selectDirectory: () => Promise<void>
    refreshTree: () => Promise<void>
    selectSession: (sessionPath: string) => Promise<void>
    clearSelection: () => void
    updateSessionMetadata: (metadata: Partial<SessionMetadata>) => Promise<void>
}

export const useSessionStore = create<SessionStore>((set, get) => ({
    // Initial state
    rootDirectory: null,
    folderTree: null,
    selectedSessionPath: null,
    selectedSession: null,
    isLoading: false,
    error: null,

    // Initialize store and load last folder
    init: async () => {
        try {
            const savedPath = localStorage.getItem(STORAGE_KEY)
            if (savedPath) {
                console.log('Restoring last folder:', savedPath)
                set({ rootDirectory: savedPath, isLoading: true, error: null })
                const tree = await window.api.scanDirectory(savedPath)
                console.log('Restored tree:', JSON.stringify(tree, null, 2))
                set({ folderTree: tree, isLoading: false })
            }
        } catch (err) {
            console.error('Error restoring last folder:', err)
            // Clear saved path if it failed (folder might have been moved/deleted)
            localStorage.removeItem(STORAGE_KEY)
            set({ rootDirectory: null, folderTree: null, isLoading: false })
        }
    },

    // Select root directory
    selectDirectory: async () => {
        try {
            const path = await window.api.selectDirectory()
            console.log('Selected path:', path)
            if (path) {
                set({ rootDirectory: path, isLoading: true, error: null })
                const tree = await window.api.scanDirectory(path)
                console.log('Scanned tree:', JSON.stringify(tree, null, 2))
                set({ folderTree: tree, isLoading: false })
                // Save to localStorage for persistence
                localStorage.setItem(STORAGE_KEY, path)
            }
        } catch (err) {
            console.error('Error scanning directory:', err)
            set({ error: String(err), isLoading: false })
        }
    },

    // Refresh the folder tree
    refreshTree: async () => {
        const { rootDirectory } = get()
        if (!rootDirectory) return

        set({ isLoading: true, error: null })
        try {
            const tree = await window.api.scanDirectory(rootDirectory)
            set({ folderTree: tree, isLoading: false })
        } catch (err) {
            set({ error: String(err), isLoading: false })
        }
    },

    // Select a session
    selectSession: async (sessionPath: string) => {
        set({ selectedSessionPath: sessionPath, isLoading: true })

        try {
            const metadata = await window.api.loadSessionMetadata(sessionPath)
            if (metadata) {
                // Update last accessed
                metadata.lastAccessedAt = new Date().toISOString()
                metadata.sessionsCount++
                await window.api.saveSessionMetadata(sessionPath, metadata)

                // Find video/pdf files from tree
                const { folderTree } = get()
                const sessionNode = findSessionNode(folderTree, sessionPath)

                const session: Session = {
                    ...metadata,
                    path: sessionPath,
                    videoFiles: sessionNode?.session?.videos || [],
                    pdfFiles: sessionNode?.session?.pdfs || [],
                    progress: sessionNode?.session?.progress || 0
                }

                set({ selectedSession: session, isLoading: false })
            }
        } catch (err) {
            set({ error: String(err), isLoading: false })
        }
    },

    // Clear selection
    clearSelection: () => {
        set({ selectedSessionPath: null, selectedSession: null })
    },

    // Update session metadata
    updateSessionMetadata: async (updates: Partial<SessionMetadata>) => {
        const { selectedSession, selectedSessionPath } = get()
        if (!selectedSession || !selectedSessionPath) return

        const updated = { ...selectedSession, ...updates }
        await window.api.saveSessionMetadata(selectedSessionPath, updated)
        set({ selectedSession: updated as Session })
    }
}))

// Helper to find session node in tree
function findSessionNode(node: FolderNode | null, path: string): FolderNode | null {
    if (!node) return null

    if (node.path === path && node.type === 'session') {
        return node
    }

    if (node.children) {
        for (const child of node.children) {
            const found = findSessionNode(child, path)
            if (found) return found
        }
    }

    return null
}

// ------------------------------------------------------------------
// Analytics Helpers (Stage 10)
// ------------------------------------------------------------------

export const getSessionAnalytics = () => {
    const { folderTree } = useSessionStore.getState()
    const allSessions: Session[] = []

    // Recursive helper to collect all sessions
    const collectSessions = (node: FolderNode) => {
        if (node.type === 'session' && node.session) {
            allSessions.push({
                ...node.session,
                path: node.path,
                videoFiles: node.session.videos ? Object.keys(node.session.videos) : [], // Reconstruct from metadata if needed, though session extraction logic in selectSession is better. 
                // However, for stats, we might relying on what's in the tree. 
                // The Session type in useSessionStore expects full Session object but tree has SessionMetadata.
                // We'll map minimally enough for stats.
                pdfFiles: [],
                progress: node.session.progress || 0
            } as any as Session)
        }
        if (node.children) {
            node.children.forEach(collectSessions)
        }
    }

    if (folderTree) {
        collectSessions(folderTree)
    }

    // Sort by last accessed
    const recentSessions = [...allSessions].sort((a, b) => {
        const timeA = new Date(a.lastAccessedAt || 0).getTime()
        const timeB = new Date(b.lastAccessedAt || 0).getTime()
        return timeB - timeA
    })

    const totalWatchTime = allSessions.reduce((acc, s) => acc + (s.totalWatchTime || 0), 0)
    const completedSessions = allSessions.filter(s => s.status === 'completed').length
    const inProgressSessions = allSessions.filter(s => s.status === 'started').length // Assuming 'started' is the status for in-progress

    return {
        totalSessions: allSessions.length,
        totalWatchTime,
        completedSessions,
        inProgressSessions,
        recentSessions: recentSessions.slice(0, 5) // Top 5
    }
}
