import { useRef, useState, useEffect, useCallback } from 'react'
import { useFocusStore } from '../../stores/focusStore'
import { FocusTimer } from '../FocusMode/FocusTimer'
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
    const [showSpeedIndicator, setShowSpeedIndicator] = useState(false)

    // Track watch time
    const watchedTimeRef = useRef(0)
    const lastTimeRef = useRef(0)

    // Hide controls timeout
    const hideControlsTimeout = useRef<number | null>(null)
    const transformIndicatorTimeout = useRef<number | null>(null)
    const speedIndicatorTimeout = useRef<number | null>(null)

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

    // Focus Mode Integration (Moved to top for scope access)
    const {
        isFocusMode,
        activeMode,
        focusStatus,
        breakTimeLeft,
        setFocusStatus,
        toggleFocusMode,
        setMode,
        autoPause,
        strictMode,
        setPlaybackSpeed // New action
    } = useFocusStore()

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
            const roundedRate = Math.round(rate * 10) / 10 // Round to 1 decimal
            videoRef.current.playbackRate = roundedRate
            setPlaybackRate(roundedRate)
            setPlaybackSpeed(roundedRate) // Update focus store

            // Show speed indicator
            setShowSpeedIndicator(true)
            if (speedIndicatorTimeout.current) {
                clearTimeout(speedIndicatorTimeout.current)
            }
            speedIndicatorTimeout.current = window.setTimeout(() => {
                setShowSpeedIndicator(false)
            }, 1500)
        }
    }, [setPlaybackSpeed])

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen()
            } else {
                await document.exitFullscreen()
                // If in strict mode, ensure the window stays fullscreen
                if (isFocusMode && strictMode && activeMode === 'session' && focusStatus === 'study') {
                    // Small delay to let the exitFullscreen generic behavior finish, then force window fullscreen
                    setTimeout(() => {
                        window.api.setFocusMode(true)
                    }, 50)
                }
            }
        } catch (err) {
            console.error("Fullscreen toggle error:", err)
        }
    }, [isFocusMode, strictMode, activeMode, focusStatus])

    // Show controls temporarily
    const showControlsTemporarily = useCallback(() => {
        if (isPlaying) return

        setShowControls(true)

        if (hideControlsTimeout.current) {
            clearTimeout(hideControlsTimeout.current)
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
                // Speed controls
                case 'c':
                    e.preventDefault()
                    changePlaybackRate(Math.min(5, playbackRate + 0.1))
                    break
                case 'x':
                    e.preventDefault()
                    changePlaybackRate(Math.max(0.25, playbackRate - 0.1))
                    break
                case 'z':
                    e.preventDefault()
                    changePlaybackRate(1)
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [togglePlay, skip, toggleMute, toggleFullscreen, handleAddMark, moveFrame, zoomFrame, resetTransform, playbackRate, changePlaybackRate])

    // Focus Mode Integration (Moved up)
    // const { ... } = useFocusStore()

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handlePlay = () => {
            setIsPlaying(true)
            setShowControls(false)

            // Focus Mode Logic: Play = Study
            if (isFocusMode && activeMode === 'session') {
                setFocusStatus('study')
            }
        }

        const handlePause = () => {
            // Focus Mode Logic: Pause = Break (unless forced)
            if (isFocusMode && activeMode === 'session') {
                // If break time is out, prevent pause (or immediately play)
                if (breakTimeLeft <= 0) {
                    console.log("No break time left! Forced focus.")
                    // We can't easily "prevent" the pause event, but we can force play again immediately
                    // However, better UX might be to just immediately call play()
                    video.play().catch(e => console.error(e))
                    return
                }
                setFocusStatus('break')
            }

            // If auto-pause is enabled, switch to break on pause
            if (isFocusMode && activeMode === 'session' && autoPause) {
                setFocusStatus('break')
            }


            setIsPlaying(false)
            setShowControls(true)
        }

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

        video.addEventListener('progress', handleProgress)
        document.addEventListener('fullscreenchange', handleFullscreenChange)

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
    }, [onTimeUpdate, onEnded, onProgress, isFocusMode, activeMode, breakTimeLeft, setFocusStatus])

    // Handle Initial Position and Source Changes
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        if (initialPosition > 0) {
            video.currentTime = initialPosition
        }
    }, [src, initialPosition])

    // Auto-Resume if break time ends while paused
    useEffect(() => {
        if (isFocusMode && activeMode === 'session' && focusStatus === 'break' && breakTimeLeft <= 0) {
            // Break is over! Resume video.
            if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(e => console.error("Force play error", e))
            }
        }
    }, [breakTimeLeft, isFocusMode, activeMode, focusStatus])


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

            {/* Speed Indicator */}
            <div className={`speed-indicator ${showSpeedIndicator ? 'visible' : ''}`}>
                <strong>{playbackRate.toFixed(1)}x</strong>
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
                            <button
                                className="speed-display"
                                onClick={() => {
                                    // Cycle through common speeds on click
                                    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]
                                    const currentIndex = speeds.findIndex(s => Math.abs(s - playbackRate) < 0.05)
                                    const nextIndex = currentIndex === -1 ? 2 : (currentIndex + 1) % speeds.length
                                    changePlaybackRate(speeds[nextIndex])
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    changePlaybackRate(1)
                                }}
                                title="Click to cycle speeds, right-click to reset to 1x. Use C/X/Z for fine control."
                            >
                                {playbackRate.toFixed(2).replace(/\.?0+$/, '')}x
                            </button>
                        </div>

                        <button className="control-btn" onClick={toggleFullscreen}>
                            {isFullscreen ? '⛶' : '⛶'}
                        </button>

                        <div className="separator" style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></div>

                        {(!isFocusMode || !strictMode) && (
                            <button
                                className={`control-btn ${isFocusMode && activeMode === 'session' ? 'active-focus' : ''}`}
                                onClick={() => {
                                    if (isFocusMode && activeMode === 'session') {
                                        toggleFocusMode()
                                    } else {
                                        setMode('session')
                                        if (!isFocusMode) toggleFocusMode()
                                    }
                                }}
                                title={isFocusMode ? "Disable Focus Mode" : "Enable Focus Mode"}
                                style={{ color: isFocusMode && activeMode === 'session' ? '#4a90e2' : 'white' }}
                            >
                                {isFocusMode && activeMode === 'session' ? '🧠 ON' : '🧠'}
                            </button>
                        )}
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
            {/* Focus Timer Overlay */}
            <FocusTimer />
        </div>
    )
}
