import type { Session } from '../../types/session'
import './SessionCard.css'

interface SessionCardProps {
    session: Session
}

export function SessionCard({ session }: SessionCardProps) {
    const completedVideos = Object.values(session.videos).filter(v => v.completed).length
    const totalVideos = session.videoFiles.length

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
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
                                <button className="item-play">▶</button>
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
                <button className="btn btn-primary">
                    ▶️ Start Session
                </button>
                <button className="btn btn-secondary">
                    📝 Edit Details
                </button>
            </div>
        </div>
    )
}
