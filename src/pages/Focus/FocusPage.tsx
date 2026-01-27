import './FocusPage.css'

export function FocusPage() {
    return (
        <div className="focus-page">
            <div className="focus-placeholder">
                <div className="placeholder-icon">🎯</div>
                <h2>Focus Mode</h2>
                <p>Deep work mode coming in Stage 9</p>
                <div className="features-preview">
                    <div className="feature">
                        <span>📋</span>
                        <span>External Paper Focus</span>
                    </div>
                    <div className="feature">
                        <span>📹</span>
                        <span>Session Focus</span>
                    </div>
                    <div className="feature">
                        <span>⏱</span>
                        <span>Break Timer</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
