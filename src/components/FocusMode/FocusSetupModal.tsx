import { useState } from 'react'
// Reuse focus styles or create new ones? Let's use inline or existing for now.

interface FocusSetupModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (settings: { enabled: boolean, focusDuration: number, breakDuration: number, autoPause: boolean, strictMode: boolean }) => void
    session?: any // Pass the session object
}

export function FocusSetupModal({ isOpen, onClose, onConfirm, session }: FocusSetupModalProps) {
    const [enabled, setEnabled] = useState(false)
    const [mode, setMode] = useState<'fixed' | 'parts'>('fixed')
    const [focusDuration, setFocusDuration] = useState(25)
    const [breakDuration, setBreakDuration] = useState(5)
    // const [autoPause, setAutoPause] = useState(true) // Removed UI, default to true or inferred
    const [strictMode, setStrictMode] = useState(false)

    // For Parts Mode
    const [selectedParts, setSelectedParts] = useState<string[]>([])

    // Initialize selected parts when session changes or modal opens
    // We could default to all not completed? 
    // Let's just default to empty or all.

    // Calculate total duration for parts
    const partsDuration = selectedParts.reduce((acc, part) => {
        return acc + (session?.videos[part]?.duration || 0)
    }, 0)

    const partsDurationMins = Math.ceil(partsDuration / 60)

    const handleConfirm = () => {
        let finalDuration = focusDuration
        if (mode === 'parts') {
            finalDuration = partsDurationMins
        }

        onConfirm({
            enabled,
            focusDuration: finalDuration,
            breakDuration,
            autoPause: true, // Default to true as checkbox is removed
            strictMode
        })
    }

    const togglePart = (file: string) => {
        if (selectedParts.includes(file)) {
            setSelectedParts(selectedParts.filter(p => p !== file))
        } else {
            setSelectedParts([...selectedParts, file])
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content focus-setup-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🎯 Focus Mode Setup</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="setup-option">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                            />
                            <span className="toggle-text">Enable Focus Mode for this session</span>
                        </label>
                    </div>

                    {enabled && (
                        <div className="timer-settings fade-in">

                            {/* Mode Selection Tabs */}
                            {session && session.videoFiles && session.videoFiles.length > 0 && (
                                <div className="mode-tabs">
                                    <button
                                        className={`tab-btn ${mode === 'fixed' ? 'active' : ''}`}
                                        onClick={() => setMode('fixed')}
                                    >
                                        ⏳ Fixed Time
                                    </button>
                                    <button
                                        className={`tab-btn ${mode === 'parts' ? 'active' : ''}`}
                                        onClick={() => setMode('parts')}
                                    >
                                        📼 Along the Parts
                                    </button>
                                </div>
                            )}

                            {mode === 'fixed' ? (
                                <div className="input-group">
                                    <label>Focus Duration (min)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={focusDuration}
                                        onChange={(e) => setFocusDuration(Number(e.target.value))}
                                    />
                                </div>
                            ) : (
                                <div className="parts-selection">
                                    <label>Select Parts to Focus On:</label>
                                    <div className="parts-list">
                                        {session.videoFiles.map((file: string, idx: number) => {
                                            const duration = session.videos[file]?.duration
                                            const durationStr = duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : '--:--'
                                            return (
                                                <div key={file} className="part-item" onClick={() => togglePart(file)}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedParts.includes(file)}
                                                        readOnly
                                                    />
                                                    <span className="part-name">{idx + 1}. {file}</span>
                                                    <span className="part-dur">({durationStr})</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="total-parts-duration">
                                        Total Focus: <strong>{partsDurationMins} min</strong>
                                    </div>
                                </div>
                            )}

                            <div className="input-group">
                                <label>Break Duration (min)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={breakDuration}
                                    onChange={(e) => setBreakDuration(Number(e.target.value))}
                                />
                            </div>

                            {/* Auto-pause removed */}

                            <div className="setup-option-sub">
                                <label className="toggle-label-sub" title="Enables full screen and prevents switching to other apps while focusing">
                                    <input
                                        type="checkbox"
                                        checked={strictMode}
                                        onChange={(e) => setStrictMode(e.target.checked)}
                                    />
                                    <span>Use Strict Mode (Full Screen & Locked)</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={enabled && mode === 'parts' && selectedParts.length === 0}
                    >
                        Start Session {enabled ? 'with Focus' : ''} ▶
                    </button>
                </div>
            </div>
            <style>{`
                .focus-setup-modal {
                    width: 450px;
                    max-width: 90vw;
                    padding: 24px; 
                    background: #1e1e24; /* Darker bg for contrast */
                }
                .setup-option {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .toggle-label input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: var(--accent-primary);
                }
                .timer-settings {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 20px;
                }
                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                /* Span full width for mode tabs and parts list */
                .mode-tabs, .parts-selection {
                    grid-column: 1 / -1;
                }
                
                .mode-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 10px;
                }
                .tab-btn {
                    flex: 1;
                    padding: 8px;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                .tab-btn.active {
                    background: var(--accent-primary);
                    color: white;
                }
                
                .parts-list {
                    max-height: 150px;
                    overflow-y: auto;
                    background: rgba(0,0,0,0.2);
                    border-radius: 6px;
                    border: 1px solid var(--border-color);
                    margin-top: 8px;
                }
                .part-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 10px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .part-item:hover {
                    background: rgba(255,255,255,0.05);
                }
                .part-name {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .part-dur {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }
                .total-parts-duration {
                    text-align: right;
                    margin-top: 5px;
                    font-size: 0.9rem;
                    color: var(--accent-primary);
                }

                .timer-settings label {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }
                .timer-settings input[type="number"] {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-color);
                    padding: 10px;
                    border-radius: 6px;
                    color: white;
                    font-size: 1rem;
                    transition: all 0.2s;
                    width: 100%;
                }
                .timer-settings input:focus {
                    border-color: var(--accent-primary);
                    outline: none;
                    background: rgba(0, 0, 0, 0.4);
                }
                .fade-in {
                    animation: fadeIn 0.3s ease;
                }
                .setup-option-sub {
                    grid-column: 1 / -1;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid var(--border-color);
                }
                .toggle-label-sub {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .toggle-label-sub input {
                    width: 16px;
                    height: 16px;
                    accent-color: var(--accent-primary);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
