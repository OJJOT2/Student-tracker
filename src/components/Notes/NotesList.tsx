import ReactMarkdown from 'react-markdown'
import { Note } from '../../types/notes'

interface NotesListProps {
    notes: Note[]
}

export function NotesList({ notes }: NotesListProps) {
    // const { currentSession } = usePlayerStore() // Unused currently

    const handleJump = (timestamp: number) => {
        // Hacky seek using DOM for now
        const video = document.querySelector('video')
        if (video) {
            video.currentTime = timestamp
            video.play() // Optional: resume play
        }
    }

    if (notes.length === 0) {
        return <div style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>No notes yet. Type or paste images!</div>
    }

    return (
        <div className="notes-list">
            {notes.map(note => (
                <div key={note.id} className="note-item" style={{ marginBottom: '12px', padding: '10px', background: '#2a2a3e', borderRadius: '6px', border: '1px solid #3a3a5e' }}>
                    <div className="note-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '6px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                        <span
                            className="note-timestamp"
                            onClick={() => handleJump(note.timestamp)}
                            title="Jump to time"
                            style={{ cursor: 'pointer', color: '#4a9eff', fontWeight: 'bold' }}
                        >
                            {formatTime(note.timestamp)}
                        </span>
                        <span>{new Date(note.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="note-content" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        {note.type === 'text' && (
                            <div className="markdown-body" style={{ color: '#ddd' }}>
                                <ReactMarkdown>{note.content}</ReactMarkdown>
                            </div>
                        )}
                        {note.type === 'image' && (
                            <div className="note-image">
                                <img
                                    src={`media://${encodeURIComponent(note.content)}`}
                                    alt="Note"
                                    style={{ maxWidth: '100%', borderRadius: '4px', cursor: 'pointer' }}
                                    onClick={() => window.open(`media://${encodeURIComponent(note.content)}`, '_blank')}
                                />
                            </div>
                        )}
                        {note.type === 'drawing' && (
                            <div className="note-drawing">
                                <span style={{ fontSize: '0.8em', color: '#aaa' }}>Drawing:</span>
                                <img
                                    src={`media://${encodeURIComponent(note.content)}`}
                                    alt="Drawing"
                                    style={{ maxWidth: '100%', borderRadius: '4px', background: 'white' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function formatTime(seconds: number): string {
    if (!seconds) return '0:00'
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
}
