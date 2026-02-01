import { useState } from 'react'
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

    const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress' | 'untouched'>('all')

    // This requires FilterableFolderTree or logic to filter tree
    // FolderTree component currently renders from store directly.
    // We can pass a filter prop to FolderTree?
    // Or we filter in the store?

    // Let's modify FolderTree to accept a filter prop, or just wrap it here.
    // Since FolderTree is recursive, filtering the tree structure is non-trivial if we want to keep parent folders.
    // Simpler: Just filter the displayed sessions if we weren't using a tree.
    // BUT we ARE using a tree.

    // User asked for "sessions list".
    // If we use FolderTree, we should probably add filter support there.

    // Let's verify FolderTree structure.

    return (
        <div className="sessions-page">
            <aside className="sessions-sidebar">
                <div className="sidebar-header">
                    <h2>📚 Study Library</h2>
                    <div className="session-filters">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="filter-select"
                        >
                            <option value="all">All Sessions</option>
                            <option value="in-progress">Pending / Started</option>
                            <option value="completed">Completed</option>
                            <option value="untouched">Untouched</option>
                        </select>
                    </div>
                </div>

                <div className="sidebar-content">
                    {folderTree ? (
                        <FolderTree filter={filter} />
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
