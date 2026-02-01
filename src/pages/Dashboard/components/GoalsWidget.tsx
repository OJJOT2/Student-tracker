import { useGoalStore } from '../../../stores/goalStore'
import { useNavigate } from 'react-router-dom'
import './GoalsWidget.css'

export function GoalsWidget() {
    const { streak, dailyStudyTime, dailyGoal } = useGoalStore()
    const navigate = useNavigate()

    const percent = Math.min(100, Math.round((dailyStudyTime / dailyGoal) * 100))

    return (
        <div className="goals-widget" onClick={() => navigate('/goals')}>
            <div className="widget-header">
                <h3>Study Goals</h3>
                <span className="streak-badge">🔥 {streak}</span>
            </div>

            <div className="daily-mini-progress">
                <div className="progress-labels">
                    <span>Daily Goal</span>
                    <span>{percent}%</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <p className="goal-status">
                    {(dailyStudyTime / 3600).toFixed(1)} / {(dailyGoal / 3600).toFixed(1)} hrs
                </p>
            </div>
        </div>
    )
}
