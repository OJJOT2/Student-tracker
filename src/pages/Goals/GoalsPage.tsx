import { useState, useEffect } from 'react'
import { useGoalStore } from '../../stores/goalStore'
import './GoalsPage.css'

export function GoalsPage() {
    const {
        streak,
        lastStudyDate,
        dailyStudyTime,
        totalStudyTime,
        dailyGoal,
        setDailyGoal,
        checkStreak
    } = useGoalStore()

    // Check streak on mount
    useEffect(() => {
        checkStreak()
    }, [checkStreak])

    const [isEditing, setIsEditing] = useState(false)
    const [tempGoal, setTempGoal] = useState(dailyGoal / 3600) // visual in hours

    const progressPercent = Math.min(100, Math.round((dailyStudyTime / dailyGoal) * 100))
    const hoursStudied = (dailyStudyTime / 3600).toFixed(1)
    const hoursGoal = (dailyGoal / 3600).toFixed(1)

    const handleSaveGoal = () => {
        setDailyGoal(tempGoal * 3600)
        setIsEditing(false)
    }

    return (
        <div className="goals-page">
            <header className="goals-header">
                <h1>Study Goals & Achievements</h1>
            </header>

            <div className="goals-grid">
                {/* Streak Card */}
                <div className="goal-card streak-card">
                    <div className="streak-icon">🔥</div>
                    <div className="streak-count">{streak}</div>
                    <div className="streak-label">Day Streak</div>
                    <p className="streak-sub">
                        {Math.random() > 0.5 ? "Keep it up!" : "You're on fire!"}
                    </p>
                </div>

                {/* Daily Goal Card */}
                <div className="goal-card daily-card">
                    <div className="card-header">
                        <h3>Daily Goal</h3>
                        <button className="edit-btn" onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                    </div>

                    {isEditing ? (
                        <div className="edit-goal-form">
                            <label>Target Hours:</label>
                            <input
                                type="number"
                                value={tempGoal}
                                onChange={(e) => setTempGoal(Number(e.target.value))}
                                step="0.5"
                                min="0.5"
                            />
                            <button className="save-btn" onClick={handleSaveGoal}>Save</button>
                        </div>
                    ) : (
                        <div className="daily-progress">
                            <div className="circle-progress" style={{
                                background: `conic-gradient(#4a90e2 ${progressPercent}%, #eee ${progressPercent}% 100%)`
                            }}>
                                <div className="inner-circle">
                                    <span className="percent">{progressPercent}%</span>
                                </div>
                            </div>
                            <div className="progress-text">
                                <span className="current">{hoursStudied}h</span>
                                <span className="separator">/</span>
                                <span className="target">{hoursGoal}h</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lifetime Stats */}
                <div className="goal-card stats-card">
                    <h3>Lifetime Stats</h3>
                    <div className="stat-row">
                        <span>Total Study Time:</span>
                        <strong>{(totalStudyTime / 3600).toFixed(1)} hours</strong>
                    </div>
                    <div className="stat-row">
                        <span>Last Session:</span>
                        <strong>{lastStudyDate || 'Never'}</strong>
                    </div>
                </div>
            </div>

            <div className="achievements-section">
                <h3>🏆 Achievements (Coming Soon)</h3>
                <div className="achievements-list">
                    <div className="achievement-item locked">
                        <span>🌱</span>
                        <span>First Steps</span>
                    </div>
                    <div className="achievement-item locked">
                        <span>📅</span>
                        <span>Week Warrior</span>
                    </div>
                    <div className="achievement-item locked">
                        <span>🧠</span>
                        <span>Deep Focus</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
