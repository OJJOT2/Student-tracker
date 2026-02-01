import { useNavigate } from 'react-router-dom'
import './SettingsPage.css'

export function SettingsPage() {
    const navigate = useNavigate()

    return (
        <div className="settings-page">
            <header className="settings-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                <h1>Settings</h1>
            </header>

            <div className="settings-content">
                <section className="settings-section">
                    <h2>Appearance</h2>
                    <div className="setting-item">
                        <label>Theme</label>
                        <select defaultValue="dark">
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                            <option value="system">System</option>
                        </select>
                    </div>
                </section>

                <section className="settings-section">
                    <h2>Focus Mode Defaults</h2>
                    <div className="setting-item">
                        <label>Study Timer (minutes)</label>
                        <input type="number" defaultValue={25} />
                    </div>
                    <div className="setting-item">
                        <label>Break Timer (minutes)</label>
                        <input type="number" defaultValue={5} />
                    </div>
                </section>

                <section className="settings-section">
                    <h2>About</h2>
                    <div className="setting-item">
                        <span>Version</span>
                        <span className="version-number">v1.0.0</span>
                    </div>
                </section>
            </div>
        </div>
    )
}
