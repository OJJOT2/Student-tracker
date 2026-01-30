import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '../../types/session'
import { useSessionStore } from '../../stores/sessionStore'
import { usePlayerStore } from '../../stores/playerStore'
import { EditSessionModal } from '../EditSessionModal/EditSessionModal'
import './SessionCard.css'

interface SessionCardProps {
    session: Session
}

export function SessionCard({ session }: SessionCardProps) {
    const navigate = useNavigate()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const { updateSessionMetadata, refreshTree } = useSessionStore()
    const { setSession } = usePlayerStore()

    const completedVideos = Object.values(session.videos).filter(v => v.completed).length
    const totalVideos = session.videoFiles.length

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    const handleSaveMetadata = async (updates: Partial<Session>) => {
        await updateSessionMetadata(updates)
        await refreshTree()
    }

    // Start session - find first unwatched video or start from beginning
    const handleStartSession = () => {
        const firstUnwatchedIndex = session.videoFiles.findIndex(
            video => !session.videos[video]?.completed
        )
        const startIndex = firstUnwatchedIndex >= 0 ? firstUnwatchedIndex : 0
        setSession(session, startIndex)
        navigate('/player')
    }

    // Play specific video
    const handlePlayVideo = (index: number) => {
        setSession(session, index)
        navigate('/player')
    }


    return (
        <div className="session-card">
            {/* Header */}
            <div className="card-header">
                <div className="card-title">
                    <h1>{session.customName || session.path.split(/[/\\]/).pop()}</h1>
                    <span className={`status-badge ${session.status}`}>
                        {session.status === 'completed' && '✓ '}
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                </div>
                <p className="card-path">{session.path}</p>
            </div>

            {/* Progress */}
            <div className="card-progress">
                <div className="progress-header">
                    <span className="progress-label">Progress</span>
                    <span className="progress-value">{completedVideos}/{totalVideos} parts</span>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${session.progress}%` }}
                    />
                </div>
                <div className="progress-stats">
                    <span>⏱ {formatDuration(session.totalWatchTime)} watched</span>
                    <span>📊 {session.sessionsCount} sessions</span>
                </div>
            </div>

            {/* Tags */}
            {session.tags.length > 0 && (
                <div className="card-tags">
                    {session.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                    ))}
                </div>
            )}

            {/* Description */}
            {session.description && (
                <div className="card-description">
                    <h3>📝 Description</h3>
                    <p>{session.description}</p>
                </div>
            )}

            {/* Notes */}
            {session.notes && (
                <div className="card-notes">
                    <h3>📋 Notes</h3>
                    <p>{session.notes}</p>
                </div>
            )}

            {/* Playlist */}
            <div className="card-playlist">
                <h3>📼 Playlist</h3>
                <div className="playlist-items">
                    {session.videoFiles.map((video, index) => {
                        const progress = session.videos[video]
                        const isCompleted = progress?.completed || false

                        return (
                            <div
                                key={video}
                                className={`playlist-item ${isCompleted ? 'completed' : ''}`}
                            >
                                <span className="item-index">
                                    {isCompleted ? '✓' : index + 1}
                                </span>
                                <span className="item-name">{video}</span>
                                {progress?.lastPosition > 0 && !isCompleted && (
                                    <span className="item-resume">
                                        Resume at {formatDuration(progress.lastPosition)}
                                    </span>
                                )}
                                <button className="item-play" onClick={() => handlePlayVideo(index)}>▶</button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* PDFs */}
            {session.pdfFiles.length > 0 && (
                <div className="card-attachments">
                    <h3>📄 Attachments</h3>
                    <div className="attachment-list">
                        {session.pdfFiles.map(pdf => (
                            <button key={pdf} className="attachment-item">
                                📄 {pdf.split(/[/\\]/).pop()}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="card-actions">
                <button className="btn btn-primary" onClick={handleStartSession}>
                    ▶️ Start Session
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        handleStartSession()
                        navigate('/study')
                    }}
                >
                    📑 Split View
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => setIsEditModalOpen(true)}
                >
                    📝 Edit Details
                </button>
            </div>

            {/* Edit Modal */}
            <EditSessionModal
                session={session}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveMetadata}
            />
        </div>
    )
}

