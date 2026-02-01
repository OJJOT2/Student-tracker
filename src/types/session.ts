// Session Status
export type SessionStatus = 'untouched' | 'started' | 'completed'

// Folder Tree Node
export interface FolderNode {
    type: 'session' | 'category'
    path: string
    name: string
    children?: FolderNode[]
    session?: SessionSummary
}

// Session summary (from tree scan)
export interface SessionSummary {
    id: string
    videos: string[]
    pdfs: string[]
    status: SessionStatus
    progress: number
    totalWatchTime: number
    lastAccessedAt: string
    completedAt?: string | null
    customName?: string | null
    description?: string
}

// Full session metadata (from session.meta.json)
export interface SessionMetadata {
    id: string
    originalPath: string
    customName: string | null
    description: string
    notes: string
    tags: string[]
    status: SessionStatus
    videos: Record<string, VideoProgress>
    marks: TimestampMark[]
    totalWatchTime: number
    sessionsCount: number
    createdAt: string
    lastAccessedAt: string
    completedAt: string | null
    completedManually?: boolean
}

// Video progress tracking
export interface VideoProgress {
    watchTime: number
    duration?: number
    lastPosition: number
    completed: boolean
    playCount: number
}

// Timestamp marks for video
export interface TimestampMark {
    id: string
    videoFile: string
    timestamp: number
    label: string
    color: string
    createdAt: string
}

// Combined session data for UI
export interface Session extends SessionMetadata {
    path: string
    videoFiles: string[]
    pdfFiles: string[]
    progress: number
}
