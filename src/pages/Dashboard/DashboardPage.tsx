import { useEffect, useState } from 'react'
import { getSessionAnalytics, useSessionStore } from '../../stores/sessionStore'
import { useTaskStore } from '../../stores/taskStore'
import { StatCard } from './components/StatCard'
import { RecentActivityList } from './components/RecentActivityList'
import { SessionsPerDayChart } from './components/SessionsPerDayChart'
import { GoalsWidget } from './components/GoalsWidget'
import './DashboardPage.css'

export function DashboardPage() {
    const [stats, setStats] = useState(getSessionAnalytics())
    const [activeTab, setActiveTab] = useState<'overview' | 'pending'>('overview')
    const { tasks } = useTaskStore()

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

    const today = new Date().toISOString().split('T')[0]
    const dueTasks = tasks.filter((t) =>
        t.status !== 'done' && t.dueDate && t.dueDate <= today
    )

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

            <div className="dashboard-content-wrapper">
                <div className="dashboard-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending Sessions {(stats.startedSessions?.length || 0) > 0 && `(${stats.startedSessions.length})`}
                    </button>
                </div>

                {activeTab === 'overview' ? (
                    <>
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

                        {/* Reminders Section */}
                        {dueTasks.length > 0 && (
                            <div className="reminders-section" style={{ marginBottom: '24px', background: '#ffebee', padding: '16px', borderRadius: '12px', border: '1px solid #ffcdd2' }}>
                                <h3 style={{ margin: '0 0 12px', color: '#c62828', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🔔 Due Today & Overdue
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {dueTasks.map((task) => (
                                        <div key={task.id} style={{ background: 'white', padding: '10px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 500 }}>{task.title}</span>
                                            <span style={{ fontSize: '12px', color: '#c62828' }}>{task.dueDate === today ? 'Today' : `Overdue (${task.dueDate})`}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {stats.sessionsFinishedPerDay && (
                            <SessionsPerDayChart data={stats.sessionsFinishedPerDay} />
                        )}

                        <div className="dashboard-content-split">
                            <div className="recent-activity-section">
                                <h3>Recent Activity</h3>
                                <RecentActivityList sessions={stats.recentSessions} />
                            </div>

                            <div className="dashboard-side-widgets">
                                <GoalsWidget />
                                <div className="widget-card">
                                    <h3>Tips</h3>
                                    <p>Use <strong>Focus Mode</strong> to stay productive!</p>
                                    <p>Press <strong>M</strong> to add marks while watching videos.</p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="pending-sessions-view">
                        <h3>Pending Sessions</h3>
                        {stats.startedSessions && stats.startedSessions.length > 0 ? (
                            <RecentActivityList sessions={stats.startedSessions} />
                        ) : (
                            <div className="empty-state">
                                <p>No pending sessions. Great job!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
