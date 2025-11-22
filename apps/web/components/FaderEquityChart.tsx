'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const FADER_LABELS = ['GEMINI', 'GROK', 'QWEN', 'KIMI', 'DEEPSEEK', 'CLAUDE'];
const FADER_COLORS = [
  '#8884d8', // GEMINI - purple
  '#82ca9d', // GROK - green
  '#ffc658', // QWEN - yellow
  '#ff7300', // KIMI - orange
  '#0088fe', // DEEPSEEK - blue
  '#00c49f', // CLAUDE - teal
];

// Базовые значения для каждого фейдера (из скриншота)
const BASE_VALUES: Record<string, number> = {
  GEMINI: 485.0,      // Начинает с ~$485, самый низкий
  GROK: 493.5,        // Стабильный около $493.5
  QWEN: 496.0,        // Начинает с ~$496, затем падает
  KIMI: 494.0,        // Стабильный около $494, затем растет до ~$495.5
  DEEPSEEK: 491.0,    // Около $491
  CLAUDE: 500.76,     // Начинает с самого высокого ~$500.76, затем падает
};

type ChartDataPoint = {
  time: number;
  timeFormatted: string;
  GEMINI: number | null;
  GROK: number | null;
  QWEN: number | null;
  KIMI: number | null;
  DEEPSEEK: number | null;
  CLAUDE: number | null;
};

// Генерируем начальные данные для чарта (вынесено из компонента для избежания hydration ошибок)
function generateInitialChartData(): ChartDataPoint[] {
  const now = Date.now();
  const today = new Date();
  today.setHours(21, 0, 0, 0); // 09:00 PM
  const startTime = today.getTime();
  
  // Генерируем точки каждую минуту с 09:00 PM до текущего времени
  // Каждая точка имеет небольшое отклонение от предыдущей для естественных колебаний
  const initialData: ChartDataPoint[] = [];
  const variation = 0.0001; // 0.01% вариация
  
  // Текущие значения для каждой линии (начинаем с базовых)
  const currentValues: Record<string, number> = { ...BASE_VALUES };
  
  for (let t = startTime; t <= now; t += 60 * 1000) {
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
    };
    
    // Обновляем каждое значение с небольшим случайным изменением
    for (const label of FADER_LABELS) {
      // Генерируем изменение от -0.01% до +0.01%
      const change = (Math.random() - 0.5) * 2 * variation;
      currentValues[label] = currentValues[label] * (1 + change);
      (point as any)[label] = currentValues[label];
    }
    
    initialData.push(point);
  }
  
  return initialData;
}

export default function FaderEquityChart() {
  // Инициализируем пустой массив, чтобы сервер и клиент рендерили одинаково
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({ ...BASE_VALUES });
  const [isMounted, setIsMounted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Генерируем данные только после монтирования на клиенте
  useEffect(() => {
    setIsMounted(true);
    const initialData = generateInitialChartData();
    setChartData(initialData);
    
    // Устанавливаем текущие значения из последней точки
    if (initialData.length > 0) {
      const lastPoint = initialData[initialData.length - 1];
      setCurrentValues({
        GEMINI: lastPoint.GEMINI || BASE_VALUES.GEMINI,
        GROK: lastPoint.GROK || BASE_VALUES.GROK,
        QWEN: lastPoint.QWEN || BASE_VALUES.QWEN,
        KIMI: lastPoint.KIMI || BASE_VALUES.KIMI,
        DEEPSEEK: lastPoint.DEEPSEEK || BASE_VALUES.DEEPSEEK,
        CLAUDE: lastPoint.CLAUDE || BASE_VALUES.CLAUDE,
      });
    }
  }, []);

  // Обновляем чарт каждые 10 секунд с ±0.01% вариацией
  useEffect(() => {
    const updateChart = () => {
      setCurrentValues((prev) => {
        const newValues: Record<string, number> = {};
        const variation = 0.0001; // 0.01% вариация
        
        // Обновляем каждое значение с ±0.01% вариацией
        for (const label of FADER_LABELS) {
          const current = prev[label] || BASE_VALUES[label];
          // Генерируем изменение от -0.01% до +0.01%
          const change = (Math.random() - 0.5) * 2 * variation;
          newValues[label] = current * (1 + change);
        }
        
        // Добавляем новую точку в чарт
        setChartData((prevData) => {
          const now = Date.now();
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
          };
          
          // Оставляем только последние 6 часов данных
          const sixHoursAgo = now - 6 * 60 * 60 * 1000;
          const filtered = prevData.filter((p) => p.time >= sixHoursAgo);
          
          return [...filtered, newPoint];
        });
        
        return newValues;
      });
    };

    // Не обновляем сразу, т.к. начальные данные уже сгенерированы
    // Обновляем каждые 10 секунд
    intervalRef.current = setInterval(updateChart, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Вычисляем динамический Y-axis domain
  const calculateYDomain = () => {
    if (chartData.length === 0) return [480, 510];
    
    const allValues: number[] = [];
    for (const point of chartData) {
      for (const label of FADER_LABELS) {
        const value = point[label as keyof ChartDataPoint];
        if (typeof value === 'number' && !isNaN(value)) {
          allValues.push(value);
        }
      }
    }
    
    if (allValues.length === 0) return [480, 510];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.05; // 5% padding
    
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  };

  const yDomain = calculateYDomain();

  // Показываем placeholder пока данные не загружены (избегаем hydration ошибок)
  if (!isMounted || chartData.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4 font-mono">Fader Equity</h3>
        <div className="text-terminal-textMuted text-sm animate-pulse">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4 font-mono">Fader Equity</h3>
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="timeFormatted"
              stroke="#888"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#888"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              domain={yDomain}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
              }}
              labelFormatter={(value) => {
                const point = chartData.find((p) => p.timeFormatted === value);
                if (point) {
                  return new Date(point.time).toLocaleString();
                }
                return value;
              }}
              formatter={(value: any) => {
                if (value === null || value === undefined) return 'N/A';
                return `$${Number(value).toFixed(2)}`;
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
  );
}
