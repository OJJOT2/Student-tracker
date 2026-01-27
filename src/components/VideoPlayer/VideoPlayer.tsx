import { useRef, useState, useEffect, useCallback } from 'react'
import type { TimestampMark } from '../../types/session'
import { MarksOverlay } from './MarksOverlay'
import { MarksPanel } from './MarksPanel'
import { NotesOverlay } from './NotesOverlay'
import { MarkEditModal } from './MarkEditModal'
import './VideoPlayer.css'

// Transform state interface
interface VideoTransform {
    x: number
    y: number
    scale: number
}

interface VideoPlayerProps {
    src: string
    title?: string
    initialPosition?: number
    onTimeUpdate?: (currentTime: number, duration: number) => void
    onEnded?: () => void
    onProgress?: (watchedTime: number) => void
    // New props for Stage 6
    marks?: TimestampMark[]
    notes?: string
    currentVideoFile?: string
    onAddMark?: (mark: TimestampMark) => void
    onUpdateMark?: (id: string, updates: Partial<TimestampMark>) => void
    onDeleteMark?: (id: string) => void
    onSaveMarks?: () => void
}

export function VideoPlayer({
    src,
    title,
    initialPosition = 0,
    onTimeUpdate,
    onEnded,
    onProgress,
    marks = [],
    notes = '',
    currentVideoFile = '',
    onAddMark,
    onUpdateMark,
    onDeleteMark,
    onSaveMarks
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)

    // State
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showControls, setShowControls] = useState(true)
    const [buffered, setBuffered] = useState(0)

    // Stage 6: New state
    const [showNotes, setShowNotes] = useState(false)
    const [marksPanelOpen, setMarksPanelOpen] = useState(false)
    const [editingMark, setEditingMark] = useState<TimestampMark | null>(null)
    const [showMarkModal, setShowMarkModal] = useState(false)
    const [transform, setTransform] = useState<VideoTransform>({ x: 0, y: 0, scale: 1 })
    const [showTransformIndicator, setShowTransformIndicator] = useState(false)

    // Track watch time
    const watchedTimeRef = useRef(0)
    const lastTimeRef = useRef(0)

    // Hide controls timeout
    const hideControlsTimeout = useRef<number | null>(null)
    const transformIndicatorTimeout = useRef<number | null>(null)

    // Format time as MM:SS or HH:MM:SS
    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return '0:00'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // Play/Pause toggle
    const togglePlay = useCallback(() => {
        const video = videoRef.current
        if (!video) return

        if (video.paused) {
            video.play()
        } else {
            video.pause()
        }
    }, [])

    // Seek to position
    const seek = useCallback((time: number) => {
        const video = videoRef.current
        if (!video) return
        video.currentTime = Math.max(0, Math.min(time, duration))
    }, [duration])

    // Skip forward/backward
    const skip = useCallback((seconds: number) => {
        const video = videoRef.current
        if (!video) return
        seek(video.currentTime + seconds)
    }, [seek])

    // Progress bar click handler
    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        seek(percent * duration)
    }, [duration, seek])

    // Volume change handler
    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value)
        setVolume(value)
        if (videoRef.current) {
            videoRef.current.volume = value
            setIsMuted(value === 0)
        }
    }, [])

    // Toggle mute
    const toggleMute = useCallback(() => {
        const video = videoRef.current
        if (!video) return

        if (isMuted) {
            video.volume = volume || 0.5
            setIsMuted(false)
        } else {
            video.volume = 0
            setIsMuted(true)
        }
    }, [isMuted, volume])

    // Change playback rate
    const changePlaybackRate = useCallback((rate: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate
            setPlaybackRate(rate)
        }
    }, [])

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    }, [])

    // Show controls temporarily
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true)

        if (hideControlsTimeout.current) {
            clearTimeout(hideControlsTimeout.current)
        }

        if (isPlaying) {
            hideControlsTimeout.current = window.setTimeout(() => {
                setShowControls(false)
            }, 3000)
        }
    }, [isPlaying])

    // Transform functions
    const moveFrame = useCallback((dx: number, dy: number) => {
        setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
        showTransformFeedback()
    }, [])

    const zoomFrame = useCallback((delta: number) => {
        setTransform(t => ({
            ...t,
            scale: Math.max(0.5, Math.min(3, t.scale + delta))
        }))
        showTransformFeedback()
    }, [])

    const resetTransform = useCallback(() => {
        setTransform({ x: 0, y: 0, scale: 1 })
        showTransformFeedback()
    }, [])

    const showTransformFeedback = () => {
        setShowTransformIndicator(true)
        if (transformIndicatorTimeout.current) {
            clearTimeout(transformIndicatorTimeout.current)
        }
        transformIndicatorTimeout.current = window.setTimeout(() => {
            setShowTransformIndicator(false)
        }, 1500)
    }

    // Add mark at current time
    const handleAddMark = useCallback(() => {
        if (!currentVideoFile) return
        setEditingMark(null)
        setShowMarkModal(true)
    }, [currentVideoFile])

    // Edit existing mark
    const handleEditMark = useCallback((mark: TimestampMark) => {
        setEditingMark(mark)
        setShowMarkModal(true)
    }, [])

    // Save mark (add or update)
    const handleSaveMark = useCallback((markData: Omit<TimestampMark, 'id' | 'createdAt'>) => {
        if (editingMark) {
            // Update existing
            onUpdateMark?.(editingMark.id, markData)
        } else {
            // Add new
            const newMark: TimestampMark = {
                id: crypto.randomUUID(),
                videoFile: currentVideoFile,
                timestamp: currentTime,
                label: markData.label,
                color: markData.color,
                createdAt: new Date().toISOString()
            }
            onAddMark?.(newMark)
        }
        setShowMarkModal(false)
        setEditingMark(null)
        onSaveMarks?.()
    }, [editingMark, currentVideoFile, currentTime, onAddMark, onUpdateMark, onSaveMarks])

    // Delete mark
    const handleDeleteMark = useCallback((id: string) => {
        onDeleteMark?.(id)
        onSaveMarks?.()
    }, [onDeleteMark, onSaveMarks])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            // Only handle if video player is focused or body
            if (!containerRef.current?.contains(document.activeElement) &&
                document.activeElement?.tagName !== 'BODY') return

            const key = e.key.toLowerCase()

            switch (key) {
                case ' ':
                case 'k':
                    e.preventDefault()
                    togglePlay()
                    break
                case 'arrowleft':
                    e.preventDefault()
                    skip(-5)
                    break
                case 'arrowright':
                    e.preventDefault()
                    skip(5)
                    break
                case 'arrowup':
                    e.preventDefault()
                    setVolume(v => Math.min(1, v + 0.1))
                    break
                case 'arrowdown':
                    e.preventDefault()
                    setVolume(v => Math.max(0, v - 0.1))
                    break
                case 'm':
                    e.preventDefault()
                    if (e.shiftKey) {
                        toggleMute()
                    } else {
                        handleAddMark()
                    }
                    break
                case 'f':
                    e.preventDefault()
                    toggleFullscreen()
                    break
                case 'j':
                    e.preventDefault()
                    skip(-10)
                    break
                case 'l':
                    e.preventDefault()
                    skip(10)
                    break
                case 'n':
                    e.preventDefault()
                    setShowNotes(s => !s)
                    break
                // Transform controls
                case 'w':
                    e.preventDefault()
                    moveFrame(0, 20)
                    break
                case 's':
                    e.preventDefault()
                    moveFrame(0, -20)
                    break
                case 'a':
                    e.preventDefault()
                    moveFrame(20, 0)
                    break
                case 'd':
                    e.preventDefault()
                    moveFrame(-20, 0)
                    break
                case 'q':
                    e.preventDefault()
                    zoomFrame(-0.1)
                    break
                case 'e':
                    e.preventDefault()
                    zoomFrame(0.1)
                    break
                case 'r':
                    e.preventDefault()
                    resetTransform()
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [togglePlay, skip, toggleMute, toggleFullscreen, handleAddMark, moveFrame, zoomFrame, resetTransform])

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)
        const handleTimeUpdate = () => {
            const time = video.currentTime
            setCurrentTime(time)

            // Track watched time (only count forward progress)
            if (time > lastTimeRef.current && time - lastTimeRef.current < 2) {
                watchedTimeRef.current += time - lastTimeRef.current
            }
            lastTimeRef.current = time

            onTimeUpdate?.(time, video.duration)
        }
        const handleDurationChange = () => setDuration(video.duration)
        const handleEnded = () => {
            setIsPlaying(false)
            onEnded?.()
            onProgress?.(watchedTimeRef.current)
        }
        const handleProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1)
                setBuffered((bufferedEnd / video.duration) * 100)
            }
        }
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        video.addEventListener('play', handlePlay)
        video.addEventListener('pause', handlePause)
        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('durationchange', handleDurationChange)
        video.addEventListener('ended', handleEnded)
        video.addEventListener('progress', handleProgress)
        document.addEventListener('fullscreenchange', handleFullscreenChange)

        // Set initial position
        if (initialPosition > 0) {
            video.currentTime = initialPosition
        }

        return () => {
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('pause', handlePause)
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('durationchange', handleDurationChange)
            video.removeEventListener('ended', handleEnded)
            video.removeEventListener('progress', handleProgress)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)

            // Report final watch time
            onProgress?.(watchedTimeRef.current)
        }
    }, [initialPosition, onTimeUpdate, onEnded, onProgress])

    // Update volume when state changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isMuted ? 0 : volume
        }
    }, [volume, isMuted])

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
    const hasTransform = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1
    const videoStyle = hasTransform
        ? { transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }
        : undefined

    return (
        <div
            ref={containerRef}
            className={`video-player ${isFullscreen ? 'fullscreen' : ''} ${showControls ? 'show-controls' : ''}`}
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Video Element - NO CONTROLS */}
            <video
                ref={videoRef}
                src={src}
                className={`video-element ${hasTransform ? 'transformed' : ''}`}
                style={videoStyle}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
            />

            {/* Play/Pause Overlay */}
            {!isPlaying && (
                <div className="play-overlay" onClick={togglePlay}>
                    <button className="play-button-large">▶</button>
                </div>
            )}

            {/* Transform Indicator */}
            <div className={`transform-indicator ${showTransformIndicator ? 'visible' : ''}`}>
                <span>X: <strong>{transform.x}</strong></span>
                <span>Y: <strong>{transform.y}</strong></span>
                <span>Zoom: <strong>{Math.round(transform.scale * 100)}%</strong></span>
            </div>

            {/* Notes Overlay */}
            <NotesOverlay
                notes={notes}
                isVisible={showNotes}
                onClose={() => setShowNotes(false)}
            />

            {/* Marks Panel */}
            <MarksPanel
                marks={marks}
                currentTime={currentTime}
                onSeek={seek}
                onEditMark={handleEditMark}
                onDeleteMark={handleDeleteMark}
                onAddMark={handleAddMark}
                isOpen={marksPanelOpen}
                onToggle={() => setMarksPanelOpen(!marksPanelOpen)}
            />

            {/* Controls Bar */}
            <div className="controls-bar">
                {/* Progress Bar */}
                <div
                    ref={progressRef}
                    className="progress-container"
                    onClick={handleProgressClick}
                >
                    <div className="progress-buffered" style={{ width: `${buffered}%` }} />
                    <div className="progress-played" style={{ width: `${progressPercent}%` }} />
                    <div
                        className="progress-thumb"
                        style={{ left: `${progressPercent}%` }}
                    />
                    {/* Marks on progress bar */}
                    <MarksOverlay
                        marks={marks}
                        duration={duration}
                        onSeek={seek}
                        onEditMark={handleEditMark}
                        onDeleteMark={handleDeleteMark}
                    />
                </div>

                {/* Controls Row */}
                <div className="controls-row">
                    {/* Left Controls */}
                    <div className="controls-left">
                        <button className="control-btn" onClick={togglePlay}>
                            {isPlaying ? '⏸' : '▶'}
                        </button>

                        <button className="control-btn" onClick={() => skip(-10)}>
                            ⏪
                        </button>

                        <button className="control-btn" onClick={() => skip(10)}>
                            ⏩
                        </button>

                        <div className="volume-control">
                            <button className="control-btn" onClick={toggleMute}>
                                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                            />
                        </div>

                        <span className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Right Controls */}
                    <div className="controls-right">
                        {/* Add Mark Button */}
                        <button
                            className="control-btn"
                            onClick={handleAddMark}
                            title="Add mark (M)"
                        >
                            🏷️
                        </button>

                        {/* Toggle Notes Button */}
                        <button
                            className="control-btn"
                            onClick={() => setShowNotes(s => !s)}
                            title="Toggle notes (N)"
                            style={{ opacity: notes ? 1 : 0.5 }}
                        >
                            📝
                        </button>

                        {/* Playback Speed */}
                        <div className="speed-control">
                            <select
                                value={playbackRate}
                                onChange={e => changePlaybackRate(parseFloat(e.target.value))}
                                className="speed-select"
                            >
                                <option value="0.25">0.25x</option>
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1">1x</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="1.75">1.75x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>

                        <button className="control-btn" onClick={toggleFullscreen}>
                            {isFullscreen ? '⛶' : '⛶'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Title */}
            {title && showControls && (
                <div className="video-title">{title}</div>
            )}

            {/* Mark Edit Modal */}
            {showMarkModal && (
                <MarkEditModal
                    mark={editingMark || { videoFile: currentVideoFile, timestamp: currentTime }}
                    timestamp={currentTime}
                    onSave={handleSaveMark}
                    onClose={() => {
                        setShowMarkModal(false)
                        setEditingMark(null)
                    }}
                />
            )}
        </div>
    )
}
