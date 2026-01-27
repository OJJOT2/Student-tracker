import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionsPage } from './pages/Sessions/SessionsPage'
import { FocusPage } from './pages/Focus/FocusPage'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { PlayerPage } from './pages/Player/PlayerPage'
import { TabBar } from './components/TabBar/TabBar'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Player page - full screen, no tab bar */}
                <Route path="/player" element={<PlayerPage />} />

                {/* Main app with tab bar */}
                <Route path="*" element={
                    <div className="app">
                        <TabBar />
                        <main className="app-content">
                            <Routes>
                                <Route path="/" element={<Navigate to="/sessions" replace />} />
                                <Route path="/sessions" element={<SessionsPage />} />
                                <Route path="/focus" element={<FocusPage />} />
                                <Route path="/dashboard" element={<DashboardPage />} />
                            </Routes>
                        </main>
                    </div>
                } />
            </Routes>
        </BrowserRouter>
    )
}

export default App

