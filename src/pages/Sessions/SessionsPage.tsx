import { useSessionStore } from '../../stores/sessionStore'
import { FolderTree } from '../../components/FolderTree/FolderTree'
import { SessionCard } from '../../components/SessionCard/SessionCard'
import './SessionsPage.css'

export function SessionsPage() {
    const {
        folderTree,
        selectedSession,
        isLoading,
        selectDirectory,
        refreshTree
    } = useSessionStore()

    return (
        <div className="sessions-page">
            {/* Sidebar */}
            <aside className="sessions-sidebar">
                <div className="sidebar-header">
                    <h2>📚 Study Library</h2>
                </div>

                <div className="sidebar-content">
                    {folderTree ? (
                        <FolderTree />
                    ) : (
                        <div className="empty-tree">
                            <p>No folder selected</p>
                            <p className="hint">Select a folder to see your study sessions</p>
                        </div>
                    )}
                </div>

                <div className="sidebar-actions">
                    <button className="btn btn-primary" onClick={selectDirectory}>
                        📂 {folderTree ? 'Change Folder' : 'Select Folder'}
                    </button>
                    {folderTree && (
                        <button className="btn btn-secondary" onClick={refreshTree}>
                            🔄 Refresh
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Panel */}
            <main className="sessions-main">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading...</p>
                    </div>
                ) : selectedSession ? (
                    <SessionCard session={selectedSession} />
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📖</div>
                        <h2>No Session Selected</h2>
                        <p>Select a session from the sidebar to view details and start studying</p>
                    </div>
                )}
            </main>
        </div>
    )
}
