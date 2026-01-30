import { useFocusStore } from '../../stores/focusStore'
import './FocusMode.css'

export function FocusToggle() {
    const { isFocusMode, toggleFocusMode } = useFocusStore()

    return (
        <button
            className={`toggle-focus-btn ${isFocusMode ? 'active' : ''}`}
            onClick={toggleFocusMode}
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
        >
            <span>{isFocusMode ? '🎯 On' : '🎯 Focus'}</span>
        </button>
    )
}
