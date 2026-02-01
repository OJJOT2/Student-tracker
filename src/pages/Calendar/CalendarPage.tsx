import { useState, useMemo } from 'react'
import { getSessionAnalytics } from '../../stores/sessionStore'
import { RecentActivityList } from '../Dashboard/components/RecentActivityList'
import './CalendarPage.css'

export function CalendarPage() {
    // Get all sessions
    const { allSessions } = getSessionAnalytics()
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

    // Safe date parsing helper
    const getSafeDateString = (dateStr: string | null | undefined): string | null => {
        if (!dateStr) return null
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return null
        return d.toLocaleDateString()
    }

    // Sessions for selected date
    const selectedDateSessions = useMemo(() => {
        if (!selectedDate || !allSessions) return []
        const dateStr = selectedDate.toLocaleDateString()

        return allSessions.filter(session => {
            const completedDateStr = getSafeDateString(session.completedAt)
            return completedDateStr === dateStr
        })
    }, [selectedDate, allSessions])

    // Get activity map (date -> count)
    const activityMap = useMemo(() => {
        const map: Record<string, number> = {}
        if (!allSessions) return map

        allSessions.forEach(session => {
            const d = getSafeDateString(session.completedAt)
            if (d) {
                map[d] = (map[d] || 0) + 1
            }
        })
        return map
    }, [allSessions])

    return (
        <div className="calendar-page">
            <div className="calendar-container">
                <header className="calendar-header">
                    <button onClick={prevMonth}>&lt;</button>
                    <h2>
                        {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={nextMonth}>&gt;</button>
                </header>

                <div className="calendar-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="calendar-day-header">{day}</div>
                    ))}

                    {daysInMonth.map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} className="calendar-day empty" />

                        const dateString = date.toLocaleDateString()
                        const count = activityMap[dateString] || 0
                        const isSelected = selectedDate?.toLocaleDateString() === dateString
                        const isToday = new Date().toLocaleDateString() === dateString

                        return (
                            <div
                                key={i}
                                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${count > 0 ? 'has-activity' : ''}`}
                                onClick={() => setSelectedDate(date)}
                            >
                                <span className="day-number">{date.getDate()}</span>
                                {count > 0 && <span className="activity-dot">•</span>}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="calendar-details">
                <h3>
                    Activity for {selectedDate?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>

                {selectedDateSessions.length > 0 ? (
                    <RecentActivityList sessions={selectedDateSessions} />
                ) : (
                    <div className="empty-state">
                        <p>No finished sessions on this day.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
