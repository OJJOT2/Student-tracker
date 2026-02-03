import { useEffect, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { Note } from '../../types/notes'
// We might need a new store action to load all notes from all sessions?
// Or we recursively scan?
// For now, let's assume we scan all sessions in the tree.

export function NotesDashboard() {
    const { folderTree } = useSessionStore()
    const [allNotes, setAllNotes] = useState<{ sessionName: string, notes: Note[] }[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchAllNotes = async () => {
            if (!folderTree) return
            setLoading(true)
            const results: { sessionName: string, notes: Note[] }[] = []

            // Recursive scan
            const scan = async (node: any) => {
                if (node.type === 'session') {
                    try {
                        const path = node.path + '/notes.json'
                        // Check availability logic or try read
                        try {
                            const buffer = await window.api.readFile(path)
                            const text = new TextDecoder().decode(buffer)
                            const notes: Note[] = JSON.parse(text)
                            if (notes.length > 0) {
                                results.push({
                                    sessionName: node.name,
                                    notes
                                })
                            }
                        } catch (e) {
                            // No notes or error
                        }
                    } catch (e) { }
                }
                if (node.children) {
                    for (const child of node.children) {
                        await scan(child)
                    }
                }
            }

            await scan(folderTree)
            setAllNotes(results)
            setLoading(false)
        }

        fetchAllNotes()
    }, [folderTree])

    const filtered = allNotes.map(group => ({
        ...group,
        notes: group.notes.filter(n =>
            n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.sessionName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(g => g.notes.length > 0)

    return (
        <div className="notes-dashboard page-container" style={{ padding: '20px', color: 'white' }}>
            <h1>All Notes</h1>
            <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ marginBottom: '20px', padding: '10px', width: '100%', maxWidth: '400px', background: '#333', border: '1px solid #555', color: 'white' }}
            />

            {loading ? <p>Loading notes...</p> : (
                <div className="notes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {filtered.map((group, i) => (
                        <div key={i} className="session-notes-card" style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
                            <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '10px' }}>{group.sessionName}</h3>
                            <div className="notes-preview">
                                {group.notes.slice(0, 5).map(note => (
                                    <div key={note.id} style={{ marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                                        <span style={{ color: '#4a9eff', marginRight: '5px' }}>
                                            {formatTime(note.timestamp)}
                                        </span>
                                        {note.type === 'image' ? '[Image]' : note.type === 'drawing' ? '[Drawing]' :
                                            note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content
                                        }
                                    </div>
                                ))}
                                {group.notes.length > 5 && <div style={{ color: '#888', fontStyle: 'italic' }}>+ {group.notes.length - 5} more</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
}
