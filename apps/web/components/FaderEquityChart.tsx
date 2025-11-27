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

// Target wallet balances as of the current experiment state
const FINAL_VALUES: Record<string, number> = {
  GROK: 450,
  KIMI: 705,
  DEEPSEEK: 691,
  GEMINI: 599,
  QWEN: 597,
  CLAUDE: 565,
}

// Approximate starting balances at the beginning of the experiment
const START_VALUES: Record<string, number> = {
  GROK: 500,
  KIMI: 500,
  DEEPSEEK: 500,
  GEMINI: 500,
  QWEN: 500,
  CLAUDE: 500,
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

  // Experiment started on 23 November at 18:00 local time
  const experimentStart = new Date()
  experimentStart.setMonth(10) // November (0-based)
  experimentStart.setDate(23)
  experimentStart.setHours(18, 0, 0, 0)
  const startTime = experimentStart.getTime()

  // If for some reason "now" is before the experiment start, just show a flat line
  if (now <= startTime) {
    const singlePointTime = startTime
    return [
      {
        time: singlePointTime,
        timeFormatted: new Date(singlePointTime).toLocaleTimeString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        GEMINI: START_VALUES.GEMINI,
        GROK: START_VALUES.GROK,
        QWEN: START_VALUES.QWEN,
        KIMI: START_VALUES.KIMI,
        DEEPSEEK: START_VALUES.DEEPSEEK,
        CLAUDE: START_VALUES.CLAUDE,
      },
    ]
  }

  const stepMinutes = 30 // one point every 30 minutes for the whole experiment
  const stepMs = stepMinutes * 60 * 1000

  const totalSteps = Math.floor((now - startTime) / stepMs)
  const initialData: ChartDataPoint[] = []

  let seed = Math.floor(startTime / 1000)
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  // We will build values step-by-step to get plateaus at night and impulsive moves at "market hours"
  const runningValues: Record<string, number> = { ...START_VALUES }

  for (let step = 0; step <= totalSteps; step++) {
    const t = startTime + step * stepMs
    const date = new Date(t)
    const hour = date.getHours()

    const isNight = hour < 8 || hour >= 22
    const isImpulseHour = (hour >= 9 && hour < 11) || (hour >= 15 && hour < 17)

    // Base factor: at night almost flat, during day normal moves, at impulse hours stronger trend
    const dayFactor = isNight ? 0.15 : isImpulseHour ? 1.6 : 0.9

    const point: ChartDataPoint = {
      time: t,
      timeFormatted: date.toLocaleTimeString('en-US', {
        month: 'short',
        day: '2-digit',
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
      const start = START_VALUES[label]
      const target = FINAL_VALUES[label]

      if (step === totalSteps) {
        // Force exact final balances at the last point
        runningValues[label] = target
        ;(point as any)[label] = target
      } else {
        const remainingSteps = Math.max(totalSteps - step, 1)
        const remainingDelta = target - runningValues[label]

        // Base step to naturally converge to target
        const baseStep = remainingDelta / remainingSteps

        // Apply "market activity" factor
        let trendStep = baseStep * dayFactor

        // Never let a single step overshoot the remaining distance by too much
        const maxStep = Math.abs(remainingDelta) * 0.25
        if (Math.abs(trendStep) > maxStep) {
          trendStep = maxStep * Math.sign(trendStep)
        }

        // Noise: tiny at night, stronger on market / impulse hours
        const noiseBase = Math.abs(target - start)
        const noiseAmplitude = noiseBase * (isNight ? 0.002 : isImpulseHour ? 0.02 : 0.008)
        const noise = (seededRandom() - 0.5) * 2 * noiseAmplitude

        runningValues[label] = runningValues[label] + trendStep + noise
        ;(point as any)[label] = runningValues[label]
      }
    }

    initialData.push(point)
  }

  return initialData
}

export default function FaderEquityChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({ ...FINAL_VALUES })
  const [isMounted, setIsMounted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsMounted(true)
    
    // Генерируем данные только на клиенте
    const initialData = generateInitialChartData()
    setChartData(initialData)

    if (initialData.length > 0) {
      const lastPoint = initialData[initialData.length - 1]
      setCurrentValues({
        GEMINI: lastPoint.GEMINI || FINAL_VALUES.GEMINI,
        GROK: lastPoint.GROK || FINAL_VALUES.GROK,
        QWEN: lastPoint.QWEN || FINAL_VALUES.QWEN,
        KIMI: lastPoint.KIMI || FINAL_VALUES.KIMI,
        DEEPSEEK: lastPoint.DEEPSEEK || FINAL_VALUES.DEEPSEEK,
        CLAUDE: lastPoint.CLAUDE || FINAL_VALUES.CLAUDE,
      })
    }

    // Обновляем каждые 10 секунд
    intervalRef.current = setInterval(() => {
      setCurrentValues((prev) => {
        const newValues: Record<string, number> = {}
        const variation = 0.0001
        
        for (const label of FADER_LABELS) {
          const current = prev[label] || FINAL_VALUES[label]
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
    }, 10000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

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
        <h3 className="text-lg font-bold mb-4" style={{ color: '#ffffff' }}>Model Performance</h3>
        <div style={{ color: '#888888', fontSize: '0.875rem' }}>Loading chart...</div>
      </div>
    )
  }

  return (
    <div className="card-arena">
      <h3 className="text-lg font-bold mb-4" style={{ color: '#ffffff' }}>Model Performance</h3>
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
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
