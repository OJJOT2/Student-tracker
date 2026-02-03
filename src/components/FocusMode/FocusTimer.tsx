import React, { useEffect, useState, useRef } from 'react'
import { useFocusStore } from '../../stores/focusStore'
import './FocusMode.css'

export function FocusTimer() {
    const {
        timeLeft,
        breakTimeLeft,
        timerDuration,
        breakDuration,
        focusStatus,
        activeMode,
        isFocusMode,
        toggleFocusMode,
        startTimer,
        pauseTimer,
        timerState,
        tick // Import tick action
    } = useFocusStore()

    const [isMinimized, setIsMinimized] = useState(false)
    const [size, setSize] = useState(220)
    const [isResizing, setIsResizing] = useState(false)
    const [position, setPosition] = useState({ x: 20, y: 20 })
    const [isDragging, setIsDragging] = useState(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const overlayRef = useRef<HTMLDivElement>(null)

    // Helper for formatting
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        return m.toString()
    }

    // Timer Interval Logic (Essential for timer to actually run!)
    useEffect(() => {
        let interval: number | null = null
        if (timerState === 'running') {
            interval = window.setInterval(tick, 1000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [timerState, tick])

    // Resize Handlers
    // Resize Handlers
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)
    }

    // Drag Handlers
    const handleDragMouseDown = (e: React.MouseEvent) => {
        // Don't drag if clicking buttons or resize handle
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.icon-smt')) return
        if (isResizing) return

        e.preventDefault()
        setIsDragging(true)
        if (overlayRef.current) {
            const rect = overlayRef.current.getBoundingClientRect()
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            }
        }
    }



    // Standard Resize Logic Update (Optional fix, but sticking to existing pattern plus drag)
    // Original resize logic was inside useEffect. I'll merge them.

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing) {
                if (overlayRef.current) {
                    // Assuming bottom-right resize handle
                    const rect = overlayRef.current.getBoundingClientRect()
                    // Calculate new size based on mouse position relative to top-left of element
                    // But actually previous logic was 'rect.right - e.clientX'.
                    // If the resize handle is on the left, that makes sense.
                    // If it's on the right, it should be 'e.clientX - rect.left'.
                    // Let's look at the button: style={{ cursor: 'se-resize' }} matches bottom-right.
                    // So 'rect.right - e.clientX' is weird. It might have been 'width - (e.clientX - rect.left)'?
                    // Let's just use a standard "distance from top-left" approach for SE resize.
                    const newSize = Math.max(150, e.clientX - rect.left)
                    setSize(Math.min(newSize, 500))
                }
            }
            if (isDragging) {
                const newX = e.clientX - dragOffset.current.x
                const newY = e.clientY - dragOffset.current.y
                setPosition({ x: newX, y: newY })
            }
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            setIsDragging(false)
        }

        if (isResizing || isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing, isDragging])

    // Conditional Rendering - MUST BE AFTER ALL HOOKS
    if (!isFocusMode || activeMode !== 'session') return null

    return (
        <div
            ref={overlayRef}
            className={`focus-timer-overlay ${isMinimized ? 'minimized' : ''}`}
            onMouseDown={handleDragMouseDown}
            style={{
                width: isMinimized ? 'auto' : `${size}px`,
                height: isMinimized ? 'auto' : `${size}px`,
                left: isMinimized ? '20px' : `${position.x}px`,
                top: isMinimized ? '20px' : `${position.y}px`,
                bottom: 'auto',
                right: 'auto',
                cursor: isDragging ? 'grabbing' : (isMinimized ? 'pointer' : 'grab')
            }}
        >
            {!isMinimized ? (
                <div className="zen-timer-ring small">
                    <svg className="progress-ring" viewBox="0 0 320 320" width="100%" height="100%">
                        {(() => {
                            const duration = timerDuration
                            const totalMins = Math.max(1, duration + breakDuration)
                            let tickCount = totalMins
                            if (tickCount > 60) tickCount = 60
                            if (tickCount < 12) tickCount = 12

                            const radius = 130
                            const center = 160
                            const ticks = []

                            const studyRatio = duration / Math.max(1, totalMins)
                            const studyTickCount = Math.round(tickCount * studyRatio)
                            const studySeconds = duration * 60
                            const breakSeconds = breakDuration * 60
                            const totalSeconds = studySeconds + breakSeconds

                            let elapsedTotal = 0
                            if (focusStatus === 'study') {
                                elapsedTotal = studySeconds - timeLeft
                            } else {
                                elapsedTotal = studySeconds + (breakSeconds - breakTimeLeft)
                            }

                            const percentComplete = elapsedTotal / Math.max(1, totalSeconds)
                            const activeTickIndex = Math.floor(percentComplete * tickCount)

                            for (let i = 0; i < tickCount; i++) {
                                const angle = (i / tickCount) * 360 - 90
                                const isStudyTick = i < studyTickCount

                                // Fix: Only dim ticks that are STRICTLY past (index less than current active one)
                                // This ensures the 'current' minute tick remains colored until fully elapsed.
                                const isPast = i < activeTickIndex

                                let strokeColor = isStudyTick ? '#4a90e2' : '#50fa7b'
                                if (isPast) strokeColor = 'rgba(255,255,255,0.1)'
                                const isActive = activeTickIndex === i

                                const rad = (angle * Math.PI) / 180
                                const x1 = center + Math.cos(rad) * (radius - 10)
                                const y1 = center + Math.sin(rad) * (radius - 10)
                                const x2 = center + Math.cos(rad) * (radius)
                                const y2 = center + Math.sin(rad) * (radius)

                                ticks.push(
                                    <line
                                        key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                                        stroke={strokeColor}
                                        strokeWidth={isActive ? 4 : 3}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke 0.5s ease-out, stroke-width 0.3s ease' }}
                                    />
                                )
                            }

                            // Seconds Arc
                            let secondsPassed = 0
                            if (focusStatus === 'study') {
                                secondsPassed = (60 - (timeLeft % 60)) % 60
                            } else {
                                secondsPassed = (60 - (breakTimeLeft % 60)) % 60
                            }

                            const degreesPerTick = 360 / tickCount
                            const startAngle = (activeTickIndex / tickCount) * 360 - 90
                            const fractionPassed = secondsPassed / 60
                            const currentAngle = startAngle + (fractionPassed * degreesPerTick)
                            const endAngle = startAngle + degreesPerTick

                            // User requested "between the two mins lines instead of on top".
                            // Original was radius + 15 (outside).
                            // Setting to radius to connect the tips of the ticks.
                            // Or radius - 5 to be centered? Let's try radius (connecting tips).
                            const arcRadius = radius

                            const startRad = (currentAngle * Math.PI) / 180
                            const endRad = (endAngle * Math.PI) / 180
                            const sx = center + Math.cos(startRad) * arcRadius
                            const sy = center + Math.sin(startRad) * arcRadius
                            const ex = center + Math.cos(endRad) * arcRadius
                            const ey = center + Math.sin(endRad) * arcRadius

                            if (tickCount < 60 && activeTickIndex < tickCount) {
                                const isStudy = activeTickIndex < studyTickCount
                                const arcColor = isStudy ? '#4a90e2' : '#50fa7b'
                                ticks.push(
                                    <path
                                        key="seconds-arc"
                                        d={`M ${sx} ${sy} A ${arcRadius} ${arcRadius} 0 0 1 ${ex} ${ey}`}
                                        stroke={arcColor} strokeWidth="2" fill="none" strokeLinecap="round"
                                        style={{ transition: 'all 0.1s linear' }}
                                    />
                                )
                            }
                            return ticks
                        })()}
                    </svg>

                    <div className="timer-center-content">
                        <div className="mini-time-val" style={{ fontSize: `${Math.max(24, size * 0.22)}px` }}>
                            {focusStatus === 'study' ? Math.ceil(timeLeft / 60) : Math.ceil(breakTimeLeft / 60)}
                        </div>
                        <div className="mini-time-label" style={{ fontSize: `${Math.max(10, size * 0.06)}px` }}>min</div>
                        <div className={`mini-status ${focusStatus}`} style={{ fontSize: `${Math.max(8, size * 0.05)}px` }}>
                            {focusStatus === 'study' ? 'FOCUS' : 'BREAK'}
                            {timerState === 'paused' && ' (PAUSED)'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="minimized-pill" onClick={() => setIsMinimized(false)}>
                    🎯 {formatTime(focusStatus === 'study' ? timeLeft : breakTimeLeft)}
                </div>
            )}

            {!isMinimized && (
                <>
                    <div className="overlay-controls">
                        <button
                            className="icon-smt"
                            style={{ cursor: 'se-resize' }}
                            onMouseDown={handleResizeMouseDown}
                            title="Drag to Resize"
                        >
                            📐
                        </button>
                        <button className="icon-smt" onClick={() => setIsMinimized(true)} title="Minimize">_</button>
                        {timerState === 'running' ? (
                            <button className="icon-smt" onClick={pauseTimer} title="Pause">⏸</button>
                        ) : (
                            <button className="icon-smt" onClick={startTimer} title="Resume">▶</button>
                        )}
                        <button className="icon-smt danger" onClick={toggleFocusMode} title="Close">✕</button>
                    </div>

                </>
            )}
        </div>
    )
}
