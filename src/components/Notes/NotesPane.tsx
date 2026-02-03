import { useEffect, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useNotesStore } from '../../stores/notesStore'
import { NotesList } from './NotesList'
import { DrawingOverlay } from './DrawingOverlay'

export function NotesPane() {
    const { selectedSession } = useSessionStore()
    const { loadNotes, notes, addNote, isLoading } = useNotesStore()
    const [inputValue, setInputValue] = useState('')
    const [showDrawing, setShowDrawing] = useState(false)

    useEffect(() => {
        if (selectedSession) {
            loadNotes(selectedSession.path)
        }
    }, [selectedSession, loadNotes])

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim() || !selectedSession) return

        const video = document.querySelector('video')
        const timestamp = video?.currentTime || 0

        await addNote({
            sessionId: selectedSession.id,
            timestamp,
            type: 'text',
            content: inputValue,
            tags: []
        })
        setInputValue('')
    }

    const saveDrawing = async (blob: Blob) => {
        if (!selectedSession) return

        try {
            const timestamp = Date.now()
            const filename = `drawing_${timestamp}.png`
            const buffer = await blob.arrayBuffer()

            const mediaDir = `${selectedSession.path}\\media`
            try { await window.api.createDirectory(mediaDir) } catch (e) { }

            const fullPath = `${mediaDir}\\${filename}`
            await window.api.writeFile(fullPath, buffer)

            const video = document.querySelector('video')
            const videoTime = video?.currentTime || 0

            await addNote({
                sessionId: selectedSession.id,
                timestamp: videoTime,
                type: 'drawing',
                content: fullPath,
                tags: []
            })
            setShowDrawing(false)
        } catch (err) {
            console.error('Failed to save drawing:', err)
        }
    }

    // Handle Image Paste
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (!selectedSession) return
            const items = e.clipboardData?.items
            if (!items) return

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile()
                    if (!blob) continue

                    try {
                        const buffer = await blob.arrayBuffer()
                        const filename = `img_${Date.now()}.png`
                        const mediaDir = `${selectedSession.path}\\media`
                        try { await window.api.createDirectory(mediaDir) } catch (e) { }

                        const fullPath = `${mediaDir}\\${filename}`
                        await window.api.writeFile(fullPath, buffer)

                        const video = document.querySelector('video')
                        const videoTime = video?.currentTime || 0

                        await addNote({
                            sessionId: selectedSession.id,
                            timestamp: videoTime,
                            type: 'image',
                            content: fullPath,
                            tags: []
                        })
                    } catch (err) { console.error(err) }
                }
            }
        }
        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [selectedSession, addNote])

    if (!selectedSession) return <div className="pane-placeholder">No Session Selected</div>

    return (
        <div className="notes-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {showDrawing && (
                <DrawingOverlay
                    onSave={saveDrawing}
                    onCancel={() => setShowDrawing(false)}
                />
            )}

            <div className="notes-header" style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Session Notes</h3>
                <button
                    onClick={() => setShowDrawing(true)}
                    className="toolbar-btn-sm"
                    title="Draw on screen"
                    style={{ fontSize: '1.2rem', padding: '4px' }}
                >
                    ✏️
                </button>
            </div>

            <div className="notes-list-container" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {isLoading ? <p>Loading...</p> : <NotesList notes={notes} />}
            </div>

            <form onSubmit={handleAddNote} style={{ padding: '10px', borderTop: '1px solid #333' }}>
                <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Type a note... (Markdown supported) or Paste an image"
                    style={{ width: '100%', height: '60px', background: '#222', color: 'white', border: '1px solid #444', resize: 'none', padding: '8px' }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddNote(e)
                        }
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                    <small style={{ color: '#666' }}>Markdown supported. Paste image to attach.</small>
                    <button type="submit" className="toolbar-btn-sm" style={{ padding: '4px 12px' }}>Send</button>
                </div>
            </form>
        </div>
    )
}
