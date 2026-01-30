import './DashboardComponents.css'

interface StatCardProps {
    label: string
    value: string | number
    icon: string
    color?: string
}

export function StatCard({ label, value, icon, color = 'var(--accent-primary)' }: StatCardProps) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${color}20`, color: color }}>
                {icon}
            </div>
            <div className="stat-content">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
            </div>
        </div>
    )
}
