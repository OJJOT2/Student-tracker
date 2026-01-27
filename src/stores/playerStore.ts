import { create } from 'zustand'
import type { Session, VideoProgress, TimestampMark } from '../types/session'

// Video transform state
interface VideoTransform {
    x: number      // horizontal pan (pixels)
    y: number      // vertical pan (pixels)
    scale: number  // zoom level (1 = 100%)
}

interface PlayerState {
    // Current session being played
    currentSession: Session | null

    // Current video being played
    currentVideoIndex: number
    currentVideoFile: string | null

    // Player state
    isPlaying: boolean
    currentTime: number
    duration: number

    // Marks for current video
    marks: TimestampMark[]

    // Notes visibility
    showNotes: boolean

    // Video transform
    transform: VideoTransform

    // Actions
    setSession: (session: Session, videoIndex?: number) => void
    setCurrentVideo: (index: number) => void
    playNext: () => void
    playPrevious: () => void
    updateVideoProgress: (videoFile: string, progress: Partial<VideoProgress>) => void
    closePlayer: () => void

    // Mark actions
    addMark: (mark: TimestampMark) => void
    updateMark: (id: string, updates: Partial<TimestampMark>) => void
    deleteMark: (id: string) => void
    setMarks: (marks: TimestampMark[]) => void

    // Notes actions
    toggleNotes: () => void

    // Transform actions
    moveFrame: (dx: number, dy: number) => void
    zoomFrame: (delta: number) => void
    resetTransform: () => void
}

const DEFAULT_TRANSFORM: VideoTransform = { x: 0, y: 0, scale: 1 }

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentSession: null,
    currentVideoIndex: 0,
    currentVideoFile: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    marks: [],
    showNotes: false,
    transform: { ...DEFAULT_TRANSFORM },

    setSession: (session, videoIndex = 0) => {
        const videoFile = session.videoFiles[videoIndex] || null
        // Filter marks for the current video
        const videoMarks = session.marks?.filter(m => m.videoFile === videoFile) || []
        set({
            currentSession: session,
            currentVideoIndex: videoIndex,
            currentVideoFile: videoFile,
            currentTime: videoFile ? (session.videos[videoFile]?.lastPosition || 0) : 0,
            marks: videoMarks,
            transform: { ...DEFAULT_TRANSFORM }
        })
    },

    setCurrentVideo: (index) => {
        const { currentSession } = get()
        if (!currentSession) return

        const videoFile = currentSession.videoFiles[index]
        if (!videoFile) return

        // Filter marks for the new video
        const videoMarks = currentSession.marks?.filter(m => m.videoFile === videoFile) || []

        set({
            currentVideoIndex: index,
            currentVideoFile: videoFile,
            currentTime: currentSession.videos[videoFile]?.lastPosition || 0,
            marks: videoMarks,
            transform: { ...DEFAULT_TRANSFORM }
        })
    },

    playNext: () => {
        const { currentSession, currentVideoIndex } = get()
        if (!currentSession) return

        const nextIndex = currentVideoIndex + 1
        if (nextIndex < currentSession.videoFiles.length) {
            get().setCurrentVideo(nextIndex)
        }
    },

    playPrevious: () => {
        const { currentVideoIndex } = get()
        if (currentVideoIndex > 0) {
            get().setCurrentVideo(currentVideoIndex - 1)
        }
    },

    updateVideoProgress: (videoFile, progress) => {
        const { currentSession } = get()
        if (!currentSession) return

        const updatedSession = {
            ...currentSession,
            videos: {
                ...currentSession.videos,
                [videoFile]: {
                    ...currentSession.videos[videoFile],
                    ...progress
                }
            }
        }

        set({ currentSession: updatedSession })
    },

    closePlayer: () => {
        set({
            currentSession: null,
            currentVideoIndex: 0,
            currentVideoFile: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            marks: [],
            showNotes: false,
            transform: { ...DEFAULT_TRANSFORM }
        })
    },

    // Mark actions
    addMark: (mark) => {
        const { marks, currentSession, currentVideoFile } = get()
        if (!currentSession || !currentVideoFile) return

        const newMarks = [...marks, mark]
        const allMarks = [
            ...(currentSession.marks?.filter(m => m.videoFile !== currentVideoFile) || []),
            ...newMarks
        ]

        set({
            marks: newMarks,
            currentSession: { ...currentSession, marks: allMarks }
        })
    },

    updateMark: (id, updates) => {
        const { marks, currentSession, currentVideoFile } = get()
        if (!currentSession || !currentVideoFile) return

        const newMarks = marks.map(m => m.id === id ? { ...m, ...updates } : m)
        const allMarks = [
            ...(currentSession.marks?.filter(m => m.videoFile !== currentVideoFile) || []),
            ...newMarks
        ]

        set({
            marks: newMarks,
            currentSession: { ...currentSession, marks: allMarks }
        })
    },

    deleteMark: (id) => {
        const { marks, currentSession, currentVideoFile } = get()
        if (!currentSession || !currentVideoFile) return

        const newMarks = marks.filter(m => m.id !== id)
        const allMarks = [
            ...(currentSession.marks?.filter(m => m.videoFile !== currentVideoFile) || []),
            ...newMarks
        ]

        set({
            marks: newMarks,
            currentSession: { ...currentSession, marks: allMarks }
        })
    },

    setMarks: (marks) => {
        set({ marks })
    },

    // Notes actions
    toggleNotes: () => {
        set(state => ({ showNotes: !state.showNotes }))
    },

    // Transform actions
    moveFrame: (dx, dy) => {
        set(state => ({
            transform: {
                ...state.transform,
                x: state.transform.x + dx,
                y: state.transform.y + dy
            }
        }))
    },

    zoomFrame: (delta) => {
        set(state => ({
            transform: {
                ...state.transform,
                scale: Math.max(0.5, Math.min(3, state.transform.scale + delta))
            }
        }))
    },

    resetTransform: () => {
        set({ transform: { ...DEFAULT_TRANSFORM } })
    }
}))
