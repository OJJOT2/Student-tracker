import { useState, useMemo } from 'react'
import './ScheduleSessionModal.css'

interface ScheduleSessionModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (date: Date) => void
    sessionName: string
}

export function ScheduleSessionModal({ isOpen, onClose, onConfirm, sessionName }: ScheduleSessionModalProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())



    // Month navigation
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const date = new Date(year, month, 1)
        const days = []

        // Add empty days for padding
        for (let i = 0; i < date.getDay(); i++) {
            days.push(null)
        }

        while (date.getMonth() === month) {
            days.push(new Date(date))
            date.setDate(date.getDate() + 1)
        }
        return days
    }, [currentDate])

    const handleConfirm = () => {
        if (selectedDate) {
            onConfirm(selectedDate)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content schedule-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📅 Schedule Session</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <p className="modal-subtitle">Pick a date to study <strong>{sessionName}</strong></p>

                <div className="calendar-picker">
                    <header className="calendar-header-picker">
                        <button onClick={prevMonth}>&lt;</button>
                        <span>
                            {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth}>&gt;</button>
                    </header>

                    <div className="calendar-grid-picker">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <div key={`${day}-${i}`} className="day-name">{day}</div>
                        ))}

                        {daysInMonth.map((date, i) => {
                            if (!date) return <div key={`empty-${i}`} className="day empty" />

                            const isSelected = selectedDate?.toDateString() === date.toDateString()
                            const isToday = new Date().toDateString() === date.toDateString()

                            return (
                                <div
                                    key={i}
                                    className={`day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                                    onClick={() => setSelectedDate(date)}
                                >
                                    {date.getDate()}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!selectedDate}
                    >
                        Schedule for {selectedDate?.toLocaleDateString()}
                    </button>
                </div>
            </div>
        </div>
    )
}
