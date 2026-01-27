import './VideoPlayer.css'

interface NotesOverlayProps {
    notes: string
    isVisible: boolean
    onClose: () => void
}

export function NotesOverlay({ notes, isVisible, onClose }: NotesOverlayProps) {
    if (!isVisible || !notes) return null

    return (
        <div className="notes-overlay">
            <div className="notes-overlay-header">
                <span>Session Notes</span>
                <button onClick={onClose} title="Close (N)">✕</button>
            </div>
            <div className="notes-overlay-content">
                {notes.split('\n').map((line, i) => (
                    <p key={i}>{line || '\u00A0'}</p>
                ))}
            </div>
        </div>
    )
}
