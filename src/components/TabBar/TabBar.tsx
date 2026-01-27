import { NavLink } from 'react-router-dom'
import './TabBar.css'

export function TabBar() {
    return (
        <nav className="tab-bar">
            <div className="tab-bar-left">
                <NavLink
                    to="/sessions"
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    <span className="tab-icon">📁</span>
                    <span className="tab-label">Sessions</span>
                </NavLink>

                <NavLink
                    to="/focus"
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    <span className="tab-icon">🎯</span>
                    <span className="tab-label">Focus</span>
                </NavLink>

                <NavLink
                    to="/dashboard"
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    <span className="tab-icon">📊</span>
                    <span className="tab-label">Dashboard</span>
                </NavLink>
            </div>

            <div className="tab-bar-right">
                <button className="settings-btn">
                    <span>⚙️</span>
                </button>
            </div>
        </nav>
    )
}
