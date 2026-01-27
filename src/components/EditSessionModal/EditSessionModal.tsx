import { useState, useEffect } from 'react'
import type { Session } from '../../types/session'
import './EditSessionModal.css'

interface EditSessionModalProps {
    session: Session
    isOpen: boolean
    onClose: () => void
    onSave: (updates: Partial<Session>) => void
}

export function EditSessionModal({ session, isOpen, onClose, onSave }: EditSessionModalProps) {
    const [customName, setCustomName] = useState(session.customName || '')
    const [description, setDescription] = useState(session.description || '')
    const [notes, setNotes] = useState(session.notes || '')
    const [tagInput, setTagInput] = useState('')
    const [tags, setTags] = useState<string[]>(session.tags || [])

    // Reset form when session changes
    useEffect(() => {
        setCustomName(session.customName || '')
        setDescription(session.description || '')
        setNotes(session.notes || '')
        setTags(session.tags || [])
    }, [session])

    if (!isOpen) return null

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase()
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed])
            setTagInput('')
        }
    }

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddTag()
        }
    }

    const handleSave = () => {
        onSave({
            customName: customName.trim() || null,
            description: description.trim(),
            notes: notes.trim(),
            tags
        })
        onClose()
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>📝 Edit Session</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Custom Name */}
                    <div className="form-group">
                        <label htmlFor="customName">Session Name</label>
                        <input
                            id="customName"
                            type="text"
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            placeholder={session.path.split(/[/\\]/).pop()}
                        />
                        <span className="form-hint">Leave empty to use folder name</span>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What is this session about?"
                            rows={3}
                        />
                    </div>

                    {/* Tags */}
                    <div className="form-group">
                        <label>Tags</label>
                        <div className="tags-input-wrapper">
                            <div className="tags-list">
                                {tags.map(tag => (
                                    <span key={tag} className="tag editable">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)}>×</button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Add tag and press Enter"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label htmlFor="notes">Notes</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Personal notes, reminders, key points..."
                            rows={5}
                        />
                        <span className="form-hint">Supports markdown formatting</span>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        💾 Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
