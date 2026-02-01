import { useEffect, useState } from 'react'
import { useFocusStore, FocusModeType } from '../../stores/focusStore'
// import { useNavigate } from 'react-router-dom'
// import { useTaskStore } from '../../stores/taskStore'
import './FocusPage.css'

export function FocusPage() {
    const {
        isFocusMode, toggleFocusMode, setMode,
        setDuration, setBreakDuration, startTimer,
        timerDuration, timeLeft,
        breakDuration, breakTimeLeft,
        focusStatus, activeMode
    } = useFocusStore()

    // Map timerDuration to duration for display
    const duration = timerDuration

    // const navigate = useNavigate() // Unused
    // const { tasks } = useTaskStore() // Unused
    const [quote, setQuote] = useState('')

    // Local state for inputs
    const [studyInput, setStudyInput] = useState(25)
    const [breakInput, setBreakInput] = useState(5)

    const quotes = [
        "Focus is the key to all success.",
        "Your future is created by what you do today.",
        "Discipline is choosing between what you want now and what you want most.",
        "Deep work is valuable, rare, and meaningful."
    ]

    useEffect(() => {
        setQuote(quotes[Math.floor(Math.random() * quotes.length)])
    }, [isFocusMode])

    // Effect to handle "Always on Top"
    useEffect(() => {
        if (window.api && window.api.setFocusMode) {
            window.api.setFocusMode(isFocusMode)
        }
        return () => {
            if (isFocusMode && window.api && window.api.setFocusMode) {
                window.api.setFocusMode(false)
            }
        }
    }, [isFocusMode])

    const handleStartFocus = (mode: FocusModeType) => {
        setMode(mode)
        setDuration(studyInput)
        setBreakDuration(breakInput)
        if (!isFocusMode) {
            toggleFocusMode()
        }
        startTimer()
    }

    if (isFocusMode) {
        return (
            <div className="focus-page active">
                <div className="ambient-background">
                    <div className="particle p1"></div>
                    <div className="particle p2"></div>
                    <div className="particle p3"></div>
                </div>

                <div className="focus-active-container">
                    {/* Modern Tick Timer */}
                    <div className="zen-timer-ring">
                        <svg className="progress-ring" width="320" height="320" viewBox="0 0 320 320">
                            {/* Generate Ticks */}
                            {(() => {
                                // Clamp tick count for visuals
                                const totalMins = Math.max(1, duration + breakDuration)
                                let tickCount = totalMins
                                // If total is vast, use larger steps? For now, cap at 60 for clean clock look
                                if (tickCount > 60) tickCount = 60
                                if (tickCount < 12) tickCount = 12

                                const radius = 130
                                const center = 160
                                const ticks = []

                                // Calculate ratios
                                const studyRatio = duration / Math.max(1, totalMins)
                                const studyTickCount = Math.round(tickCount * studyRatio)

                                // Calculate progress based on total cycle time
                                const studySeconds = duration * 60
                                const breakSeconds = breakDuration * 60
                                const totalSeconds = studySeconds + breakSeconds

                                let elapsedTotal = 0
                                // let currentModeSeconds = 0

                                if (focusStatus === 'study') {
                                    elapsedTotal = studySeconds - timeLeft
                                    // currentModeSeconds = (duration * 60) - timeLeft
                                } else {
                                    elapsedTotal = studySeconds + (breakSeconds - breakTimeLeft)
                                    // currentModeSeconds = (breakDuration * 60) - breakTimeLeft
                                }

                                const percentComplete = elapsedTotal / Math.max(1, totalSeconds)
                                const activeTickIndex = Math.floor(percentComplete * tickCount)

                                for (let i = 0; i < tickCount; i++) {
                                    // Start from top (-90deg)
                                    const angle = (i / tickCount) * 360 - 90
                                    const isStudyTick = i < studyTickCount

                                    // Determine if tick is "past" (dimmed)
                                    const tickProgress = i / tickCount
                                    // If percentComplete > tickProgress, this tick is passed
                                    const isPast = percentComplete > tickProgress

                                    // Colors
                                    // Study: Blue (#4a90e2), Break: Green (#50fa7b)
                                    // Past: Transparent/Dimmed
                                    let strokeColor = isStudyTick ? '#4a90e2' : '#50fa7b'
                                    if (isPast) strokeColor = 'rgba(255,255,255,0.1)'

                                    // Active cursor effect
                                    const isActive = activeTickIndex === i

                                    // Cartesian coords
                                    const rad = (angle * Math.PI) / 180
                                    const x1 = center + Math.cos(rad) * (radius - 10)
                                    const y1 = center + Math.sin(rad) * (radius - 10)
                                    const x2 = center + Math.cos(rad) * radius
                                    const y2 = center + Math.sin(rad) * radius

                                    ticks.push(
                                        <line
                                            key={i}
                                            x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke={strokeColor}
                                            strokeWidth={isActive ? 4 : 3}
                                            strokeLinecap="round"
                                            className={`timer-tick ${isActive ? 'active' : ''}`}
                                        />
                                    )
                                }

                                // SECONDS ARC
                                // Draw an arc between activeTick and activeTick + 1
                                // Represents the seconds of the CURRENT minute (or fraction of total if mapped)
                                // If 1 tick = 1 min, then we map seconds (0-60) to the gap.
                                // "Shorten from the side of last min" -> Start point moves forward.

                                // const secondsInCurrentStep = activeMode === 'session'
                                //     ? (focusStatus === 'study' ? timeLeft : breakTimeLeft) % 60 // Seconds remaining
                                //     : (focusStatus === 'study' ? (60 - (timeLeft % 60)) % 60 : (60 - (breakTimeLeft % 60)) % 60)
                                // Wait, simple second counter:
                                // const s = new Date().getSeconds()
                                // Actually we want "seconds passed in this minute"
                                // If timeLeft = 24:50, then 10 seconds have passed in this minute.

                                let secondsPassed = 0
                                if (focusStatus === 'study') {
                                    secondsPassed = (60 - (timeLeft % 60)) % 60
                                } else {
                                    secondsPassed = (60 - (breakTimeLeft % 60)) % 60
                                }

                                // Gap angle
                                const degreesPerTick = 360 / tickCount
                                const startAngle = (activeTickIndex / tickCount) * 360 - 90

                                // We want the arc to cover the UNPASSED portion?
                                // "Shorten from side of last min" -> shrinking bar.
                                // So we want to draw from [CurrentPos] to [NextTick].
                                // CurrentPos = StartAngle + (SecondsPassed/60)*Step

                                const fractionPassed = secondsPassed / 60
                                const currentAngle = startAngle + (fractionPassed * degreesPerTick)
                                const endAngle = startAngle + degreesPerTick

                                // Convert to cartesian for Path
                                const arcRadius = radius + 15 // slightly outside

                                const startRad = (currentAngle * Math.PI) / 180
                                const endRad = (endAngle * Math.PI) / 180

                                const sx = center + Math.cos(startRad) * arcRadius
                                const sy = center + Math.sin(startRad) * arcRadius
                                const ex = center + Math.cos(endRad) * arcRadius
                                const ey = center + Math.sin(endRad) * arcRadius

                                // Arc flag (large arc?) No, gap is small.

                                if (tickCount < 60 && activeTickIndex < tickCount) {
                                    // Color matches the UPCOMING tick (or current active block)
                                    const isStudy = activeTickIndex < studyTickCount
                                    const arcColor = isStudy ? '#4a90e2' : '#50fa7b'

                                    ticks.push(
                                        <path
                                            key="seconds-arc"
                                            d={`M ${sx} ${sy} A ${arcRadius} ${arcRadius} 0 0 1 ${ex} ${ey}`}
                                            stroke={arcColor}
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                            className="seconds-arc"
                                        />
                                    )
                                }

                                return ticks
                            })()}
                        </svg>

                        {/* Center Display */}
                        <div className="timer-display-modern">
                            <div className="time-value">
                                {focusStatus === 'study'
                                    ? Math.ceil(timeLeft / 60)
                                    : Math.ceil(breakTimeLeft / 60)}
                            </div>
                            <div className="time-unit">min</div>
                            <div className={`status-badge-modern ${focusStatus}`}>
                                {focusStatus === 'study' ? 'Focusing' : 'On Break'}
                            </div>
                        </div>
                    </div>

                    <div className="focus-controls-modern">
                        <button className="icon-btn" onClick={toggleFocusMode} title="End Session">
                            ⏹
                        </button>
                    </div>

                    <div className="secondary-info">
                        {activeMode === 'session' && (
                            <p className="hint">
                                {focusStatus === 'study'
                                    ? "Video playing..."
                                    : "Video paused..."}
                            </p>
                        )}
                        <p className="quote">"{quote}"</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="focus-page">
            <div className="video-bg-overlay"></div>
            <div className="focus-header">
                <h2>Enter the Zone</h2>
                <p>Block distractions and achieve deep focus.</p>
            </div>

            <div className="time-inputs">
                <div className="input-group">
                    <label>Focus Time (m)</label>
                    <input
                        type="number"
                        value={studyInput}
                        onChange={(e) => setStudyInput(Number(e.target.value))}
                        min="1"
                    />
                </div>
                <div className="input-group">
                    <label>Break Time (m)</label>
                    <input
                        type="number"
                        value={breakInput}
                        onChange={(e) => setBreakInput(Number(e.target.value))}
                        min="1"
                    />
                </div>
            </div>

            <div className="focus-options-grid">
                <div className="focus-card glass" onClick={() => handleStartFocus('external')}>
                    <div className="card-icon">📚</div>
                    <h3>Deep Study</h3>
                    <p>{studyInput}m Focus / {breakInput}m Break</p>
                    <div className="card-glow"></div>
                </div>

                <div className="focus-card glass" onClick={() => handleStartFocus('session')}>
                    <div className="card-icon">🧠</div>
                    <h3>Session Flow</h3>
                    <p>Video controls timer</p>
                    <div className="card-glow"></div>
                </div>
            </div>
        </div>
    )
}
