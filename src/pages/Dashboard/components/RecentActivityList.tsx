import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../../stores/sessionStore'
import type { Session } from '../../../types/session'
import './DashboardComponents.css'

interface RecentActivityListProps {
    sessions: Session[]
}

export function RecentActivityList({ sessions }: RecentActivityListProps) {
    const navigate = useNavigate()
    const { selectSession } = useSessionStore()

    const handleSessionClick = async (path: string) => {
        await selectSession(path)
        navigate('/sessions') // Navigate to session view or direct to player? 
        // For now, go to sessions page which will show the selected session details
    }

    if (sessions.length === 0) {
        return (
            <div className="empty-activity">
                <p>No recent activity. Start a session!</p>
            </div>
        )
    }

    return (
        <div className="recent-activity-list">
            {sessions.map((session) => (
                <div
                    key={session.path}
                    className="activity-item"
                    onClick={() => handleSessionClick(session.path)}
                >
                    <div className="activity-icon">
                        {session.status === 'completed' ? '✅' : '📚'}
                    </div>
                    <div className="activity-details">
                        <h4>{session.customName || session.path.split(/[/\\]/).pop()}</h4>
                        <span className="activity-time">
                            Last accessed: {new Date(session.lastAccessedAt).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="activity-progress">
                        <div className="mini-progress-bar">
                            <div
                                className="mini-progress-fill"
                                style={{ width: `${session.progress || 0}%` }}
                            />
                        </div>
                        <span>{Math.round(session.progress || 0)}%</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
