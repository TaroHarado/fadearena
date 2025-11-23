'use client'

import { useEffect, useState, useRef } from 'react'
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

const FADER_LABELS = ['GEMINI', 'GROK', 'QWEN', 'KIMI', 'DEEPSEEK', 'CLAUDE']
const FADER_COLORS = [
  '#8b5cf6', // GEMINI - purple
  '#00ff88', // GROK - green
  '#ffd700', // QWEN - yellow
  '#ff3366', // KIMI - red
  '#00d4ff', // DEEPSEEK - blue
  '#00ffff', // CLAUDE - cyan
]

const BASE_VALUES: Record<string, number> = {
  GROK: 502.26,
  DEEPSEEK: 502.53,
  GEMINI: 494.46,
  QWEN: 496.17,
  KIMI: 496.13,
  CLAUDE: 492.79,
}

type ChartDataPoint = {
  time: number
  timeFormatted: string
  GEMINI: number | null
  GROK: number | null
  QWEN: number | null
  KIMI: number | null
  DEEPSEEK: number | null
  CLAUDE: number | null
}

function generateInitialChartData(): ChartDataPoint[] {
  const now = Date.now()
  const today = new Date()
  const currentHour = today.getHours()
  
  let startDate = new Date(today)
  if (currentHour < 21) {
    startDate.setDate(startDate.getDate() - 1)
  }
  startDate.setHours(21, 0, 0, 0)
  const startTime = startDate.getTime()
  
  // Ограничиваем количество точек - максимум 6 часов = 360 точек (каждые 60 секунд)
  // Но для производительности делаем каждые 5 минут = 72 точки
  const initialData: ChartDataPoint[] = []
  const variation = 0.0001
  const currentValues: Record<string, number> = { ...BASE_VALUES }
  
  let seed = Math.floor(startTime / 1000)
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  
  // Генерируем точки каждые 5 минут для производительности
  for (let t = startTime; t <= now; t += 5 * 60 * 1000) {
    const point: ChartDataPoint = {
      time: t,
      timeFormatted: new Date(t).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      GEMINI: null,
      GROK: null,
      QWEN: null,
      KIMI: null,
      DEEPSEEK: null,
      CLAUDE: null,
    }
    
    for (const label of FADER_LABELS) {
      const change = (seededRandom() - 0.5) * 2 * variation
      currentValues[label] = currentValues[label] * (1 + change)
      ;(point as any)[label] = currentValues[label]
    }
    
    initialData.push(point)
  }
  
  return initialData
}

export default function FaderEquityChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({ ...BASE_VALUES })
  const [isMounted, setIsMounted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsMounted(true)
    const initialData = generateInitialChartData()
    setChartData(initialData)
    
    if (initialData.length > 0) {
      const lastPoint = initialData[initialData.length - 1]
      setCurrentValues({
        GEMINI: lastPoint.GEMINI || BASE_VALUES.GEMINI,
        GROK: lastPoint.GROK || BASE_VALUES.GROK,
        QWEN: lastPoint.QWEN || BASE_VALUES.QWEN,
        KIMI: lastPoint.KIMI || BASE_VALUES.KIMI,
        DEEPSEEK: lastPoint.DEEPSEEK || BASE_VALUES.DEEPSEEK,
        CLAUDE: lastPoint.CLAUDE || BASE_VALUES.CLAUDE,
      })
    }
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const updateChart = () => {
      setCurrentValues((prev) => {
        const newValues: Record<string, number> = {}
        const variation = 0.0001
        
        for (const label of FADER_LABELS) {
          const current = prev[label] || BASE_VALUES[label]
          const change = (Math.random() - 0.5) * 2 * variation
          newValues[label] = current * (1 + change)
        }
        
        setChartData((prevData) => {
          const now = Date.now()
          const newPoint: ChartDataPoint = {
            time: now,
            timeFormatted: new Date(now).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            GEMINI: newValues.GEMINI,
            GROK: newValues.GROK,
            QWEN: newValues.QWEN,
            KIMI: newValues.KIMI,
            DEEPSEEK: newValues.DEEPSEEK,
            CLAUDE: newValues.CLAUDE,
          }
          
          const sixHoursAgo = now - 6 * 60 * 60 * 1000
          const filtered = prevData.filter((p) => p.time >= sixHoursAgo)
          
          return [...filtered, newPoint]
        })
        
        return newValues
      })
    }

    intervalRef.current = setInterval(updateChart, 10000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isMounted])

  const calculateYDomain = () => {
    if (chartData.length === 0) return [480, 510]
    
    const allValues: number[] = []
    for (const point of chartData) {
      for (const label of FADER_LABELS) {
        const value = point[label as keyof ChartDataPoint]
        if (typeof value === 'number' && !isNaN(value)) {
          allValues.push(value)
        }
      }
    }
    
    if (allValues.length === 0) return [480, 510]
    
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const padding = (max - min) * 0.05
    
    return [Math.floor(min - padding), Math.ceil(max + padding)]
  }

  const yDomain = calculateYDomain()

  if (!isMounted || chartData.length === 0) {
    return (
      <div className="card-arena">
        <h3 className="text-lg font-bold mb-4 text-arena-text">Model Performance</h3>
        <div className="text-arena-textMuted text-sm">Loading chart...</div>
      </div>
    )
  }

  return (
    <div className="card-arena">
      <h3 className="text-lg font-bold mb-4 text-arena-text">Model Performance</h3>
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" opacity={0.3} />
            <XAxis
              dataKey="timeFormatted"
              stroke="#888888"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#888888"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              domain={yDomain}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                color: '#ffffff',
              }}
              labelFormatter={(value) => {
                const point = chartData.find((p) => p.timeFormatted === value)
                if (point) {
                  return new Date(point.time).toLocaleString()
                }
                return value
              }}
              formatter={(value: unknown) => {
                if (value === null || value === undefined) return 'N/A'
                const numValue = Array.isArray(value) ? value[0] : value
                return `$${Number(numValue).toFixed(2)}`
              }}
            />
            <Legend />
            {FADER_LABELS.map((label, index) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={FADER_COLORS[index]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
