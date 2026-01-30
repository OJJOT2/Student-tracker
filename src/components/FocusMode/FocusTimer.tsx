import { useEffect, useState } from 'react'
import { useFocusStore } from '../../stores/focusStore'
import './FocusMode.css'

export function FocusTimer() {
    const {
        timeLeft,
        timerState,
        startTimer,
        pauseTimer,
        resetTimer,
        tick,
        isFocusMode
    } = useFocusStore()

    const [isMinimized, setIsMinimized] = useState(false)

    // Timer interval
    useEffect(() => {
        let interval: number | null = null

        if (timerState === 'running') {
            interval = window.setInterval(tick, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [timerState, tick])

    // Format time MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    if (!isFocusMode) return null

    return (
        <div className={`focus-timer ${isMinimized ? 'minimized' : ''}`}>
            {!isMinimized && <div className="focus-mode-badge">Focus Mode</div>}

            <div
                className="timer-display"
                onClick={() => setIsMinimized(!isMinimized)}
                style={{ cursor: 'pointer' }}
                title="Click to minimize/expand"
            >
                {formatTime(timeLeft)}
            </div>

            {!isMinimized && (
                <div className="timer-controls">
                    {timerState === 'running' ? (
                        <button className="timer-btn secondary" onClick={pauseTimer}>
                            ⏸ Pause
                        </button>
                    ) : (
                        <button className="timer-btn primary" onClick={startTimer}>
                            ▶ Start
                        </button>
                    )}

                    <button className="timer-btn secondary" onClick={resetTimer} title="Reset">
                        ↺
                    </button>
                </div>
            )}

            {isMinimized && (
                <button
                    className="timer-btn secondary"
                    onClick={() => setIsMinimized(false)}
                    style={{ padding: '4px 8px', width: 'auto' }}
                >
                    Expand
                </button>
            )}
        </div>
    )
}
