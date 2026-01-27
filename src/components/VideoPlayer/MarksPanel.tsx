import type { TimestampMark } from '../../types/session'
import './VideoPlayer.css'

interface MarksPanelProps {
    marks: TimestampMark[]
    currentTime: number
    onSeek: (time: number) => void
    onEditMark: (mark: TimestampMark) => void
    onDeleteMark: (id: string) => void
    onAddMark: () => void
    isOpen: boolean
    onToggle: () => void
}

export function MarksPanel({
    marks,
    currentTime,
    onSeek,
    onEditMark,
    onDeleteMark,
    onAddMark,
    isOpen,
    onToggle
}: MarksPanelProps) {
    const sortedMarks = [...marks].sort((a, b) => a.timestamp - b.timestamp)

    return (
        <div className={`marks-panel ${isOpen ? 'open' : ''}`}>
            <button className="marks-panel-toggle" onClick={onToggle} title="Toggle marks panel">
                🏷️
            </button>

            {isOpen && (
                <div className="marks-panel-content">
                    <div className="marks-panel-header">
                        <h4>Marks</h4>
                        <button className="add-mark-btn" onClick={onAddMark} title="Add mark at current time">
                            + Add
                        </button>
                    </div>

                    <div className="marks-list">
                        {sortedMarks.length === 0 ? (
                            <div className="marks-empty">
                                No marks yet.<br />
                                Press <kbd>M</kbd> to add one.
                            </div>
                        ) : (
                            sortedMarks.map(mark => (
                                <div
                                    key={mark.id}
                                    className={`mark-item ${Math.abs(mark.timestamp - currentTime) < 1 ? 'active' : ''}`}
                                    onClick={() => onSeek(mark.timestamp)}
                                >
                                    <span
                                        className="mark-color"
                                        style={{ backgroundColor: mark.color || '#ffd700' }}
                                    />
                                    <span className="mark-time">{formatTime(mark.timestamp)}</span>
                                    <span className="mark-label">{mark.label || 'Unnamed'}</span>
                                    <div className="mark-actions">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditMark(mark) }}
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteMark(mark.id) }}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
}
