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
import type { EquityResponse } from '@fadearena/shared'

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
  const chartData = data.series.map((point: EquityResponse['series'][0]) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    bots: point.botsAggregate,
    fadeArena: point.fadeArena,
  }))

  return (
    <div className="card">
      <h2 className="label mb-4">Equity Curve</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="time"
            stroke="#666"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: '2px',
              fontSize: '12px',
            }}
            formatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="bots"
            stroke="#666"
            strokeWidth={1.5}
            dot={false}
            name="Bots Aggregate"
          />
          <Line
            type="monotone"
            dataKey="fadeArena"
            stroke="#00a86b"
            strokeWidth={2}
            dot={false}
            name="FadeArena"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

