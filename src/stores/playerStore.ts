import { create } from 'zustand'
import type { Session, VideoProgress } from '../types/session'

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

    // Actions
    setSession: (session: Session, videoIndex?: number) => void
    setCurrentVideo: (index: number) => void
    playNext: () => void
    playPrevious: () => void
    updateVideoProgress: (videoFile: string, progress: Partial<VideoProgress>) => void
    closePlayer: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentSession: null,
    currentVideoIndex: 0,
    currentVideoFile: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,

    setSession: (session, videoIndex = 0) => {
        const videoFile = session.videoFiles[videoIndex] || null
        set({
            currentSession: session,
            currentVideoIndex: videoIndex,
            currentVideoFile: videoFile,
            currentTime: videoFile ? (session.videos[videoFile]?.lastPosition || 0) : 0
        })
    },

    setCurrentVideo: (index) => {
        const { currentSession } = get()
        if (!currentSession) return

        const videoFile = currentSession.videoFiles[index]
        if (!videoFile) return

        set({
            currentVideoIndex: index,
            currentVideoFile: videoFile,
            currentTime: currentSession.videos[videoFile]?.lastPosition || 0
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
            duration: 0
        })
    }
}))
