import { create } from 'zustand'
import type { FolderNode, SessionMetadata, Session } from '../types/session'

interface SessionStore {
    // State
    rootDirectory: string | null
    folderTree: FolderNode | null
    selectedSessionPath: string | null
    selectedSession: Session | null
    isLoading: boolean
    error: string | null

    // Actions
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
