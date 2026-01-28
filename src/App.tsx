import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionsPage } from './pages/Sessions/SessionsPage'
import { FocusPage } from './pages/Focus/FocusPage'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { PlayerPage } from './pages/Player/PlayerPage'
import { PDFPage } from './pages/PDF/PDFPage'
import { TabBar } from './components/TabBar/TabBar'
import { useSessionStore } from './stores/sessionStore'

function App() {
    // Initialize session store on app startup to restore last folder
    useEffect(() => {
        useSessionStore.getState().init()
    }, [])

    return (
        <BrowserRouter>
            <Routes>
                {/* Player page - full screen, no tab bar */}
                <Route path="/player" element={<PlayerPage />} />
                <Route path="/pdf" element={<PDFPage />} />

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

