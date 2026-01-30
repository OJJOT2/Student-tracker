import { useEffect, useState } from 'react'
import { getSessionAnalytics, useSessionStore } from '../../stores/sessionStore'
import { StatCard } from './components/StatCard'
import { RecentActivityList } from './components/RecentActivityList'
import './DashboardPage.css'

export function DashboardPage() {
    const [stats, setStats] = useState(getSessionAnalytics())

    // Subscribe to store updates to refresh stats
    useEffect(() => {
        const unsub = useSessionStore.subscribe(() => {
            setStats(getSessionAnalytics())
        })
        return unsub
    }, [])

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return `${h}h ${m}m`
    }

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="welcome-section">
                    <h1>Dashboard</h1>
                    <p className="date-display">
                        {new Date().toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>
            </header>

            <div className="dashboard-stats-grid">
                <StatCard
                    label="Total Study Time"
                    value={formatDuration(stats.totalWatchTime)}
                    icon="⏱"
                    color="#4a90e2"
                />
                <StatCard
                    label="Total Sessions"
                    value={stats.totalSessions}
                    icon="📚"
                    color="#9b59b6"
                />
                <StatCard
                    label="Completed"
                    value={stats.completedSessions}
                    icon="✅"
                    color="#2ecc71"
                />
                <StatCard
                    label="In Progress"
                    value={stats.inProgressSessions}
                    icon="📝"
                    color="#f39c12"
                />
            </div>

            <div className="dashboard-content-split">
                <div className="recent-activity-section">
                    <h3>Recent Activity</h3>
                    <RecentActivityList sessions={stats.recentSessions} />
                </div>

                {/* Placeholder for future widgets like Focus Summary or Goals */}
                <div className="dashboard-side-widgets">
                    <div className="widget-card">
                        <h3>Tips</h3>
                        <p>Use <strong>Focus Mode</strong> to stay productive!</p>
                        <p>Press <strong>M</strong> to add marks while watching videos.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
