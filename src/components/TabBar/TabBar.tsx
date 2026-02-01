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

                <NavLink
                    to="/tasks"
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    <span className="tab-icon">✅</span>
                    <span className="tab-label">Tasks</span>
                </NavLink>

                <NavLink
                    to="/goals"
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    <span className="tab-icon">🏆</span>
                    <span className="tab-label">Goals</span>
                </NavLink>

                <NavLink
                    to="/calendar"
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    <span className="tab-icon">📅</span>
                    <span className="tab-label">Calendar</span>
                </NavLink>
            </div>

            <div className="tab-bar-right">
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `settings-btn ${isActive ? 'active' : ''}`}
                >
                    <span>⚙️</span>
                </NavLink>
            </div>
        </nav>
    )
}
