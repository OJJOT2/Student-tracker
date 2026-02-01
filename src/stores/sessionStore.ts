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
    toggleVideoCompletion: (sessionPath: string, videoName: string, completed: boolean) => Promise<void>
    ignoredPaths: string[]
    ignoreSession: (path: string) => void
    unignoreSession: (path: string) => void
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

                if (folderTree && sessionNode && sessionNode.session) {
                    sessionNode.session.lastAccessedAt = metadata.lastAccessedAt
                    set({ folderTree: { ...folderTree } })
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
        const { selectedSession, selectedSessionPath, folderTree } = get()
        if (!selectedSession || !selectedSessionPath) return

        // 1. Prepare updated session
        const updated = { ...selectedSession, ...updates } as Session

        // Apply Logic Rules:
        // 1. Mark as Done Previously (Manual Completion)
        if (updated.completedManually) {
            updated.status = 'completed'
            updated.progress = 100
            updated.completedAt = updated.completedAt || new Date().toISOString()
        } else {
            // 2. Auto-complete if > 95%
            const newProgress = calculateProgress(updated)
            if (newProgress >= 95 && updated.status !== 'completed') {
                updated.status = 'completed'
                updated.completedAt = new Date().toISOString()
            }
            updated.progress = newProgress
        }

        // 3. > 5 mins rule
        if (updated.totalWatchTime > 300 && updated.status === 'untouched') {
            updated.status = 'started'
        }

        // 2. Optimistic Update (Prevent Race Conditions)
        // We update the store immediately so subsequent calls read the fresh data
        set({ selectedSession: updated })

        // 3. Update Sync to Backend (Fire and Forget or Await)
        try {
            await window.api.saveSessionMetadata(selectedSessionPath, updated)
        } catch (err) {
            console.error('Failed to save session metadata:', err)
            // Optionally revert here, but for now we prioritize UI responsiveness and consistency
        }

        // 4. Update tree node to keep Dashboard in sync (using fresh data)
        if (folderTree) {
            const sessionNode = findSessionNode(folderTree, selectedSessionPath)
            if (sessionNode && sessionNode.session) {
                sessionNode.session = {
                    ...sessionNode.session,
                    progress: calculateProgress(updated),
                    totalWatchTime: updated.totalWatchTime,
                    status: updated.status,
                    videos: Object.keys(updated.videos),
                    lastAccessedAt: updated.lastAccessedAt
                }
                set({ folderTree: { ...folderTree } })
            }
        }
    },

    // Toggle video completion status
    toggleVideoCompletion: async (sessionPath: string, videoName: string, completed: boolean) => {
        const { selectedSession } = get()

        // Use selectedSession if it matches, otherwise we'd need to load the metadata first
        // For now, simpler to assume we are working on selectedSession or valid path is handled

        // This helper retrieves current metadata from store or file
        let currentMetadata: SessionMetadata | null = null
        if (selectedSession && selectedSession.path === sessionPath) {
            currentMetadata = selectedSession
        } else {
            currentMetadata = await window.api.loadSessionMetadata(sessionPath)
        }

        if (!currentMetadata) return

        // Update specific video status
        const currentVideoData = currentMetadata.videos[videoName] || {
            completed: false,
            lastPosition: 0,
            duration: 0,
            watchTime: 0
        }

        const updatedVideos = {
            ...currentMetadata.videos,
            [videoName]: {
                ...currentVideoData,
                completed
            }
        }

        // Just update metadata
        // We need to re-use updateSessionMetadata but it relies on `selectedSession` state.
        // So we update the `selectedSession` first.

        const updatedSession = { ...currentMetadata, videos: updatedVideos }

        // Calculate new progress
        calculateProgress(updatedSession)

        // Check status updates
        let newStatus = updatedSession.status
        const videoCount = Object.keys(updatedSession.videos).length
        const completedCount = Object.values(updatedVideos).filter(v => v.completed).length

        if (completedCount === videoCount && videoCount > 0) {
            newStatus = 'completed'
        } else if (completedCount > 0) {
            newStatus = 'started'
        }

        // Call updateSessionMetadata with the changes
        // Using existing action which handles store updates and persistence
        get().updateSessionMetadata({
            videos: updatedVideos,
            status: newStatus
        })
    },

    // Session Ignore Feature
    ignoredPaths: JSON.parse(localStorage.getItem('ignored-sessions') || '[]'),

    ignoreSession: (path: string) => {
        const { ignoredPaths } = get()
        if (!ignoredPaths.includes(path)) {
            const newIgnored = [...ignoredPaths, path]
            set({ ignoredPaths: newIgnored })
            localStorage.setItem('ignored-sessions', JSON.stringify(newIgnored))

            // Also clear selection if ignored
            if (get().selectedSessionPath === path) {
                get().clearSelection()
            }
        }
    },

    unignoreSession: (path: string) => {
        const { ignoredPaths } = get()
        const newIgnored = ignoredPaths.filter(p => p !== path)
        set({ ignoredPaths: newIgnored })
        localStorage.setItem('ignored-sessions', JSON.stringify(newIgnored))
    }
}))

// Helper to calculate progress percent
function calculateProgress(session: SessionMetadata): number {
    if (session.completedManually) return 100

    const videoProgress = Object.values(session.videos)
    if (videoProgress.length === 0) return 0

    // Try time-based calculation if duration is available for all videos
    const totalDuration = videoProgress.reduce((acc, v) => acc + (v.duration || 0), 0)
    const totalWatchTime = videoProgress.reduce((acc, v) => acc + (v.watchTime || 0), 0)

    if (totalDuration > 0 && videoProgress.every(v => v.duration !== undefined)) {
        return Math.min(100, Math.round((totalWatchTime / totalDuration) * 100))
    }

    const completedCount = videoProgress.filter(v => v.completed).length
    return Math.round((completedCount / videoProgress.length) * 100)
}

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
                videoFiles: Array.isArray(node.session.videos) ? node.session.videos : [],
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

    // Prepare daily stats (last 14 days)
    const dailyStats: Record<string, number> = {}
    const now = new Date()
    for (let i = 0; i < 14; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        dailyStats[d.toLocaleDateString()] = 0
    }

    allSessions.forEach(session => {
        if (session.status === 'completed' && session.completedAt) {
            const date = new Date(session.completedAt).toLocaleDateString()
            if (dailyStats[date] !== undefined) {
                dailyStats[date]++
            }
        }
    })

    const sessionsFinishedPerDay = Object.keys(dailyStats).map(date => ({
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count: dailyStats[date]
    })).reverse()


    const totalWatchTime = allSessions.reduce((acc, s) => acc + (s.totalWatchTime || 0), 0)
    const completedSessions = allSessions.filter(s => s.status === 'completed').length
    const inProgressSessions = allSessions.filter(s => s.status === 'started').length // Assuming 'started' is the status for in-progress

    return {
        totalSessions: allSessions.length,
        totalWatchTime,
        completedSessions,
        inProgressSessions,
        recentSessions: recentSessions.slice(0, 5), // Top 5
        sessionsFinishedPerDay,
        startedSessions: allSessions.filter(s => s.status === 'started'),
        allSessions // For Calendar
    }
}
