import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './SessionsPerDayChart.css'

interface SessionsPerDayChartProps {
    data: { date: string; count: number }[]
}

export function SessionsPerDayChart({ data }: SessionsPerDayChartProps) {
    if (!data || data.length === 0) return null

    return (
        <div className="sessions-chart-container">
            <h3>Sessions Finished (Last 14 Days)</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: 'var(--text-secondary)' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'var(--text-secondary)' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar
                            dataKey="count"
                            fill="#8884d8"
                            radius={[4, 4, 0, 0]}
                            name="Finished Sessions"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
