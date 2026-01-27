import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoPlayer } from '../../components/VideoPlayer/VideoPlayer'
import { usePlayerStore } from '../../stores/playerStore'
import { useSessionStore } from '../../stores/sessionStore'
import './PlayerPage.css'

export function PlayerPage() {
    const navigate = useNavigate()
    const {
        currentSession,
        currentVideoIndex,
        currentVideoFile,
        setCurrentVideo,
        playNext,
        closePlayer
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
        }
    }, [currentSession, updateSessionMetadata])

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
            </div>
        </div>
    )
}
