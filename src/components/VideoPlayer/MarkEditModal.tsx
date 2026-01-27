import { useState, useEffect } from 'react'
import type { TimestampMark } from '../../types/session'
import './VideoPlayer.css'

const PRESET_COLORS = [
    '#ffd700', // Gold
    '#ff6b6b', // Red
    '#4ecdc4', // Teal
    '#45b7d1', // Blue
    '#96ceb4', // Green
    '#dda0dd', // Plum
    '#ff9f43', // Orange
    '#a55eea', // Purple
]

interface MarkEditModalProps {
    mark: Partial<TimestampMark> | null
    timestamp: number
    onSave: (mark: Omit<TimestampMark, 'id' | 'createdAt'>) => void
    onClose: () => void
}

export function MarkEditModal({ mark, timestamp, onSave, onClose }: MarkEditModalProps) {
    const [label, setLabel] = useState(mark?.label || '')
    const [color, setColor] = useState(mark?.color || PRESET_COLORS[0])

    useEffect(() => {
        setLabel(mark?.label || '')
        setColor(mark?.color || PRESET_COLORS[0])
    }, [mark])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            videoFile: mark?.videoFile || '',
            timestamp: mark?.timestamp ?? timestamp,
            label: label.trim() || `Mark at ${formatTime(mark?.timestamp ?? timestamp)}`,
            color
        })
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className="mark-modal-backdrop" onClick={onClose} onKeyDown={handleKeyDown}>
            <div className="mark-modal" onClick={e => e.stopPropagation()}>
                <h3>{mark?.id ? 'Edit Mark' : 'Add Mark'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mark-modal-field">
                        <label>Timestamp</label>
                        <span className="mark-timestamp">{formatTime(mark?.timestamp ?? timestamp)}</span>
                    </div>

                    <div className="mark-modal-field">
                        <label htmlFor="mark-label">Label</label>
                        <input
                            id="mark-label"
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="Enter mark label..."
                            autoFocus
                        />
                    </div>

                    <div className="mark-modal-field">
                        <label>Color</label>
                        <div className="color-picker">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`color-option ${color === c ? 'selected' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="mark-modal-actions">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary">Save</button>
                    </div>
                </form>
            </div>
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
