import './DashboardPage.css'

export function DashboardPage() {
    return (
        <div className="dashboard-page">
            <div className="dashboard-placeholder">
                <div className="placeholder-icon">📊</div>
                <h2>Dashboard</h2>
                <p>Analytics and statistics coming in Stage 10</p>
                <div className="stats-preview">
                    <div className="stat-card">
                        <div className="stat-value">--</div>
                        <div className="stat-label">Hours Today</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">--</div>
                        <div className="stat-label">Day Streak</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">--</div>
                        <div className="stat-label">Sessions</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
