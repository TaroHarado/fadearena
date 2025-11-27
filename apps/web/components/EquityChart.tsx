'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useEquity } from '@/hooks/useEquity'

interface EquityPoint {
  timestamp: number
  botsAggregate: number
  fadeArena: number
}

export function EquityChart() {
  const { data } = useEquity()

  if (!data || data.series.length === 0) {
    return (
      <div className="card">
        <div className="text-terminal-textMuted text-sm">No equity data available</div>
      </div>
    )
  }

  // Format data for Recharts
  const chartData = data.series.map((point: EquityPoint) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    bots: point.botsAggregate,
    fadeArena: point.fadeArena,
  }))

  return (
    <div className="card">
      <h2 className="label mb-4">Equity Curve</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
          <XAxis
            dataKey="time"
            stroke="#8b8b9e"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#8b8b9e"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#13131a',
              border: '1px solid #1f1f2e',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e8e8f0',
            }}
            formatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#e8e8f0' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="bots"
            stroke="#8b8b9e"
            strokeWidth={1.5}
            dot={false}
            name="Bots Aggregate"
          />
          <Line
            type="monotone"
            dataKey="fadeArena"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            name="fixarena strategy"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

