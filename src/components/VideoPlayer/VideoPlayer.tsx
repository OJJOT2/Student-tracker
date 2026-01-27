import { useRef, useState, useEffect, useCallback } from 'react'
import './VideoPlayer.css'

interface VideoPlayerProps {
    src: string
    title?: string
    initialPosition?: number
    onTimeUpdate?: (currentTime: number, duration: number) => void
    onEnded?: () => void
    onProgress?: (watchedTime: number) => void
}

export function VideoPlayer({
    src,
    title,
    initialPosition = 0,
    onTimeUpdate,
    onEnded,
    onProgress
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

    // Track watch time
    const watchedTimeRef = useRef(0)
    const lastTimeRef = useRef(0)

    // Hide controls timeout
    const hideControlsTimeout = useRef<number | null>(null)

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

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if video player is focused
            if (!containerRef.current?.contains(document.activeElement) &&
                document.activeElement?.tagName !== 'BODY') return

            switch (e.key.toLowerCase()) {
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
                    toggleMute()
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
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [togglePlay, skip, toggleMute, toggleFullscreen])

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
                className="video-element"
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
            />

            {/* Play/Pause Overlay */}
            {!isPlaying && (
                <div className="play-overlay" onClick={togglePlay}>
                    <button className="play-button-large">▶</button>
                </div>
            )}

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
        </div>
    )
}
