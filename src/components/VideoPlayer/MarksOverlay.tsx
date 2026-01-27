import type { TimestampMark } from '../../types/session'
import './VideoPlayer.css'

interface MarksOverlayProps {
    marks: TimestampMark[]
    duration: number
    onSeek: (time: number) => void
    onEditMark: (mark: TimestampMark) => void
    onDeleteMark: (id: string) => void
}

export function MarksOverlay({
    marks,
    duration,
    onSeek,
    onEditMark,
    onDeleteMark
}: MarksOverlayProps) {
    if (duration <= 0) return null

    const handleContextMenu = (e: React.MouseEvent, mark: TimestampMark) => {
        e.preventDefault()
        // Simple context menu using confirm/prompt
        const action = confirm(`Mark: "${mark.label}"\n\nClick OK to edit, Cancel to see delete option`)
        if (action) {
            onEditMark(mark)
        } else {
            if (confirm('Delete this mark?')) {
                onDeleteMark(mark.id)
            }
        }
    }

    return (
        <div className="marks-overlay">
            {marks.map(mark => {
                const position = (mark.timestamp / duration) * 100
                return (
                    <div
                        key={mark.id}
                        className="mark-dot"
                        style={{
                            left: `${position}%`,
                            backgroundColor: mark.color || '#ffd700'
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            onSeek(mark.timestamp)
                        }}
                        onContextMenu={(e) => handleContextMenu(e, mark)}
                        title={`${mark.label} (${formatTime(mark.timestamp)})`}
                    />
                )
            })}
        </div>
    )
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}
