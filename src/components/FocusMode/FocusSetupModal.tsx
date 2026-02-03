import { useState } from 'react'
import '../FocusMode/FocusMode.css' // Reuse focus styles or create new ones? Let's use inline or existing for now.

interface FocusSetupModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (settings: { enabled: boolean, focusDuration: number, breakDuration: number, autoPause: boolean }) => void
}

export function FocusSetupModal({ isOpen, onClose, onConfirm }: FocusSetupModalProps) {
    const [enabled, setEnabled] = useState(false)
    const [focusDuration, setFocusDuration] = useState(25)
    const [breakDuration, setBreakDuration] = useState(5)
    const [autoPause, setAutoPause] = useState(true)

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
                            <div className="input-group">
                                <label>Focus Duration (min)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={focusDuration}
                                    onChange={(e) => setFocusDuration(Number(e.target.value))}
                                />
                            </div>
                            <div className="input-group">
                                <label>Break Duration (min)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={breakDuration}
                                    onChange={(e) => setBreakDuration(Number(e.target.value))}
                                />
                            </div>
                            <div className="setup-option-sub">
                                <label className="toggle-label-sub">
                                    <input
                                        type="checkbox"
                                        checked={autoPause}
                                        onChange={(e) => setAutoPause(e.target.checked)}
                                    />
                                    <span>Auto-pause timer when video pauses</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={() => onConfirm({ enabled, focusDuration, breakDuration, autoPause })}
                    >
                        Start Session {enabled ? 'with Focus' : ''} ▶
                    </button>
                </div>
            </div>
            <style>{`
                .focus-setup-modal {
                    width: 400px;
                    max-width: 90vw;
                    padding: 24px; 
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
                .timer-settings .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .timer-settings label {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }
                .timer-settings input {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-color);
                    padding: 10px;
                    border-radius: 6px;
                    color: white;
                    font-size: 1rem;
                    transition: all 0.2s;
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
