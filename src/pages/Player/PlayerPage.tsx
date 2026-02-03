import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoPlayer } from '../../components/VideoPlayer/VideoPlayer'
import { usePlayerStore } from '../../stores/playerStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useGoalStore } from '../../stores/goalStore'
import type { TimestampMark } from '../../types/session'
import './PlayerPage.css'

export function PlayerPage() {
    const navigate = useNavigate()
    const {
        currentSession,
        currentVideoIndex,
        currentVideoFile,
        marks,
        setCurrentVideo,
        playNext,
        closePlayer,
        addMark,
        updateMark,
        deleteMark
    } = usePlayerStore()
    const { updateSessionMetadata } = useSessionStore()

    // Redirect if no session
    useEffect(() => {
        if (!currentSession) {
            navigate('/sessions')
        }
    }, [currentSession, navigate])

    if (!currentSession || !currentVideoFile) {
        return null
    }

    // Build video path using media protocol
    const videoPath = `media://${encodeURIComponent(currentSession.path + '/' + currentVideoFile)}`

    // Handle time updates - save position periodically
    const handleTimeUpdate = useCallback(async (currentTime: number, duration: number) => {
        // Save position every 5 seconds
        if (Math.floor(currentTime) % 5 === 0 && duration > 0) {
            const progress = currentSession.videos[currentVideoFile] || {
                watchTime: 0,
                lastPosition: 0,
                completed: false,
                playCount: 0
            }

            // Check if video is completed (90% watched)
            const isCompleted = currentTime / duration >= 0.9

            await updateSessionMetadata({
                videos: {
                    ...currentSession.videos,
                    [currentVideoFile]: {
                        ...progress,
                        lastPosition: currentTime,
                        duration: duration,
                        completed: isCompleted || progress.completed
                    }
                }
            })
        }
    }, [currentSession, currentVideoFile, updateSessionMetadata])

    // Handle video end
    const handleEnded = useCallback(async () => {
        const progress = currentSession.videos[currentVideoFile] || {
            watchTime: 0,
            lastPosition: 0,
            completed: false,
            playCount: 0
        }

        // Mark as completed and increment play count
        await updateSessionMetadata({
            videos: {
                ...currentSession.videos,
                [currentVideoFile]: {
                    ...progress,
                    completed: true,
                    playCount: progress.playCount + 1,
                    lastPosition: 0
                }
            }
        })

        // Auto-play next video if available
        if (currentVideoIndex < currentSession.videoFiles.length - 1) {
            playNext()
        }
    }, [currentSession, currentVideoFile, currentVideoIndex, updateSessionMetadata, playNext])

    // Handle watch time tracking
    const handleProgress = useCallback(async (watchedTime: number) => {
        if (watchedTime > 0) {
            await updateSessionMetadata({
                totalWatchTime: currentSession.totalWatchTime + watchedTime
            })
            // Update goals
            useGoalStore.getState().addStudyTime(watchedTime)
        }
    }, [currentSession, updateSessionMetadata])

    // Handle adding a mark
    const handleAddMark = useCallback((mark: TimestampMark) => {
        addMark(mark)
    }, [addMark])

    // Handle updating a mark
    const handleUpdateMark = useCallback((id: string, updates: Partial<TimestampMark>) => {
        updateMark(id, updates)
    }, [updateMark])

    // Handle deleting a mark
    const handleDeleteMark = useCallback((id: string) => {
        deleteMark(id)
    }, [deleteMark])

    // Save marks to session metadata
    const handleSaveMarks = useCallback(async () => {
        // Get all marks from the session (updated via playerStore)
        const { currentSession: session } = usePlayerStore.getState()
        if (session) {
            await updateSessionMetadata({
                marks: session.marks
            })
        }
    }, [updateSessionMetadata])

    // Handle close
    const handleClose = () => {
        closePlayer()
        navigate('/sessions')
    }

    const sessionName = currentSession.customName || currentSession.path.split(/[/\\]/).pop()

    return (
        <div className="player-page">
            {/* Header */}
            <div className="player-header">
                <button className="back-btn" onClick={handleClose}>
                    ← Back to Sessions
                </button>
                <div className="header-info">
                    <h1>{sessionName}</h1>
                    <span className="video-indicator">
                        Video {currentVideoIndex + 1} of {currentSession.videoFiles.length}
                    </span>
                </div>
                <button
                    className="mode-switch-btn"
                    onClick={() => navigate('/study')}
                    title="Switch to Split Screen Mode"
                >
                    ◫ Split View
                </button>
            </div>

            {/* Player Container */}
            <div className="player-container">
                <VideoPlayer
                    src={videoPath}
                    title={currentVideoFile}
                    initialPosition={currentSession.videos[currentVideoFile]?.lastPosition || 0}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    onProgress={handleProgress}
                    // Stage 6: Pass marks and notes
                    marks={marks}
                    notes={currentSession.notes || ''}
                    currentVideoFile={currentVideoFile}
                    onAddMark={handleAddMark}
                    onUpdateMark={handleUpdateMark}
                    onDeleteMark={handleDeleteMark}
                    onSaveMarks={handleSaveMarks}
                />
            </div>

            {/* Playlist Sidebar */}
            <div className="player-sidebar">
                <h3>📼 Playlist</h3>
                <div className="sidebar-playlist">
                    {currentSession.videoFiles.map((video, index) => {
                        const progress = currentSession.videos[video]
                        const isActive = index === currentVideoIndex
                        const isCompleted = progress?.completed

                        return (
                            <button
                                key={video}
                                className={`sidebar-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => setCurrentVideo(index)}
                            >
                                <span className="item-status">
                                    {isCompleted ? '✓' : isActive ? '▶' : index + 1}
                                </span>
                                <span className="item-name">{video}</span>
                                {progress?.lastPosition > 0 && !isCompleted && (
                                    <span className="item-time">
                                        {Math.floor(progress.lastPosition / 60)}:{String(Math.floor(progress.lastPosition % 60)).padStart(2, '0')}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* PDFs Link */}
                {currentSession.pdfFiles.length > 0 && (
                    <>
                        <h3>📄 PDFs</h3>
                        <button
                            className="sidebar-item"
                            onClick={() => navigate('/pdf')}
                        >
                            <span className="item-status">📄</span>
                            <span className="item-name">
                                {currentSession.pdfFiles.length} PDF(s)
                            </span>
                        </button>
                    </>
                )}

                {/* Keyboard Shortcuts Help */}
                <div className="shortcuts-help">
                    <h4>⌨️ Shortcuts</h4>
                    <div className="shortcuts-grid">
                        <span><kbd>Space</kbd> Play/Pause</span>
                        <span><kbd>M</kbd> Add Mark</span>
                        <span><kbd>N</kbd> Toggle Notes</span>
                        <span><kbd>C/X</kbd> Speed +/-0.1x</span>
                        <span><kbd>Z</kbd> Reset Speed</span>
                        <span><kbd>WASD</kbd> Pan Video</span>
                        <span><kbd>Q/E</kbd> Zoom In/Out</span>
                        <span><kbd>R</kbd> Reset View</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
