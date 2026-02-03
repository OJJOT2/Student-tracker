import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '../../types/session'
import { useSessionStore } from '../../stores/sessionStore'
import { usePlayerStore } from '../../stores/playerStore'
import { useTaskStore } from '../../stores/taskStore'
import { useFocusStore } from '../../stores/focusStore'
import { EditSessionModal } from '../EditSessionModal/EditSessionModal'
import { FocusSetupModal } from '../FocusMode/FocusSetupModal'
import { ScheduleSessionModal } from '../ScheduleSessionModal/ScheduleSessionModal'
import './SessionCard.css'

interface SessionCardProps {
    session: Session
}

export function SessionCard({ session }: SessionCardProps) {
    const navigate = useNavigate()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const { updateSessionMetadata, refreshTree } = useSessionStore()
    const { setSession } = usePlayerStore()

    // Focus Mode Store
    const {
        isFocusMode,
        toggleFocusMode,
        setMode,
        setDuration,
        setBreakDuration,
        startTimer,
        setAutoPause
    } = useFocusStore()

    const [isFocusSetupOpen, setIsFocusSetupOpen] = useState(false)
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)

    const completedVideos = Object.values(session.videos).filter(v => v.completed).length
    const totalVideos = session.videoFiles.length

    // Calculate total duration (sum of all known video durations)
    const totalSessionDuration = session.videoFiles.reduce((acc, video) => {
        return acc + (session.videos[video]?.duration || 0)
    }, 0)

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)

        if (h > 0) return `${h}h ${m}m ${s}s`
        return `${m}m ${s}s`
    }

    const handleSaveMetadata = async (updates: Partial<Session>) => {
        await updateSessionMetadata(updates)
        await refreshTree()
    }

    // Triggered by "Start Session" button
    const handleStartClick = () => {
        setIsFocusSetupOpen(true)
    }

    // Actual Logic to Start Session
    const proceedToSession = (settings?: { enabled: boolean, focusDuration: number, breakDuration: number, autoPause: boolean }) => {
        // Configure Focus Mode if settings provided
        if (settings) {
            setMode('session')
            setDuration(settings.focusDuration)
            setBreakDuration(settings.breakDuration)
            setAutoPause(settings.autoPause)

            // Handle Enable/Disable
            // If user wants it enabled and it's currently off -> toggle on
            if (settings.enabled && !isFocusMode) {
                toggleFocusMode()
                startTimer()
            }
            // If user wants it disabled and it's currently on -> toggle off
            else if (!settings.enabled && isFocusMode) {
                toggleFocusMode()
            }
            // If enabled and already on -> just update settings (done above)
        }

        const firstUnwatchedIndex = session.videoFiles.findIndex(
            video => !session.videos[video]?.completed
        )
        const startIndex = firstUnwatchedIndex >= 0 ? firstUnwatchedIndex : 0
        setSession(session, startIndex)
        navigate('/player')
        setIsFocusSetupOpen(false)
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
                    <span> / {formatDuration(totalSessionDuration)} total</span>
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
                                <button
                                    className="item-check-btn"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        useSessionStore.getState().toggleVideoCompletion(session.path, video, !isCompleted)
                                    }}
                                    title={isCompleted ? "Mark as not watched" : "Mark as watched"}
                                >
                                    {isCompleted ? '✓' : <span className="item-number">{index + 1}</span>}
                                </button>

                                <span className="item-name">
                                    {video}
                                    <span className="item-duration">
                                        ({formatDuration(progress?.duration)})
                                    </span>
                                </span>
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
                <button className="btn btn-primary" onClick={handleStartClick}>
                    ▶️ Start Session
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        // Split view might not use focus setup? Or should it?
                        // Assuming direct navigation for split view for now.
                        // Or we can reuse proceedToSession if needed.
                        const firstUnwatchedIndex = session.videoFiles.findIndex(
                            video => !session.videos[video]?.completed
                        )
                        const startIndex = firstUnwatchedIndex >= 0 ? firstUnwatchedIndex : 0
                        setSession(session, startIndex)
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
                <button
                    className="btn btn-secondary"
                    onClick={() => handleSaveMetadata({ completedManually: !session.completedManually })}
                    title="Mark as finished previously"
                >
                    {session.completedManually ? '↩ Undo Finish' : '✅ Mark Done'}
                </button>
                <button
                    className="btn btn-danger-outline"
                    onClick={() => {
                        if (confirm('Hide this session from the list?')) {
                            useSessionStore.getState().ignoreSession(session.path)
                        }
                    }}
                    title="Hide session from library"
                    style={{ borderColor: 'rgba(255, 100, 100, 0.3)', color: '#ffaaaa' }}
                >
                    🚫 Ignore
                </button>
            </div>

            {/* Schedule Actions */}
            <div className="card-schedule-actions">
                <button
                    className="btn btn-outline"
                    onClick={() => {
                        useTaskStore.getState().addTask(`Study: ${session.customName || session.path.split(/[/\\]/).pop()}`, `Session from ${session.path}`, session.path)
                        alert('Added to Tasks!')
                    }}
                >
                    📋 Add to Tasks
                </button>
                <button
                    className="btn btn-outline"
                    onClick={() => setIsScheduleModalOpen(true)}
                >
                    📅 Schedule
                </button>
            </div>

            {/* Schedule Modal */}
            <ScheduleSessionModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onConfirm={(date) => {
                    const dateString = date.toISOString().split('T')[0]
                    useTaskStore.getState().addTask(
                        `Study: ${session.customName || session.path.split(/[/\\]/).pop()}`,
                        `Session: ${session.path}`,
                        session.path,
                        dateString
                    )
                    alert(`Scheduled for ${date.toLocaleDateString()}!`)
                    setIsScheduleModalOpen(false)
                }}
                sessionName={session.customName || session.path.split(/[/\\]/).pop() || 'Session'}
            />

            {/* Start Session Focus Setup Modal */}
            <FocusSetupModal
                isOpen={isFocusSetupOpen}
                onClose={() => setIsFocusSetupOpen(false)}
                onConfirm={proceedToSession}
            />

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

