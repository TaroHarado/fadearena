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
import type { FaderEquityResponse, FaderEquityHistoryResponse } from '@fadearena/shared';

type LinePoint = { time: number; value: number };

type FaderSeries = {
  label: string;
  address: string;
  points: LinePoint[];
};

const FADER_LABELS = ['GEMINI', 'GROK', 'QWEN', 'KIMI', 'DEEPSEEK', 'CLAUDE'];
const FADER_COLORS = [
  '#8884d8', // GEMINI - purple
  '#82ca9d', // GROK - green
  '#ffc658', // QWEN - yellow
  '#ff7300', // KIMI - orange
  '#0088fe', // DEEPSEEK - blue
  '#00c49f', // CLAUDE - teal
];

// API URL - можно переопределить через env переменную NEXT_PUBLIC_API_URL
const API_BASE_URL = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
    : 'http://localhost:3001';

/**
 * Фильтровать выбросы:
 * 1. Значения > 2000 в период 09:41-09:46 PM
 * 2. Весь период 09:31 PM - 10:20 PM (там учитывались только стейблы, были значения 70, 200 и т.д.)
 */
function filterOutliers(series: FaderSeries[]): FaderSeries[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Период 1: Выбросы с большими значениями (09:41 PM - 09:46 PM, значения > 2000)
  const outlierStart1 = new Date(today);
  outlierStart1.setHours(21, 41, 0, 0); // 09:41 PM
  const outlierEnd1 = new Date(today);
  outlierEnd1.setHours(21, 46, 0, 0); // 09:46 PM
  
  // Период 2: Период с неправильными подсчетами (только стейблы, значения 70, 200 и т.д.)
  // 09:31 PM - 10:20 PM (расширяем до 10:20 для безопасности)
  const outlierStart2 = new Date(today);
  outlierStart2.setHours(21, 31, 0, 0); // 09:31 PM
  const outlierEnd2 = new Date(today);
  outlierEnd2.setHours(22, 20, 0, 0); // 10:20 PM
  
  const outlierStart1Ms = outlierStart1.getTime();
  const outlierEnd1Ms = outlierEnd1.getTime();
  const outlierStart2Ms = outlierStart2.getTime();
  const outlierEnd2Ms = outlierEnd2.getTime();
  
  return series.map((s) => ({
    ...s,
    points: s.points.filter((p) => {
      // Убираем точки в период 1 с значениями > 2000
      if (p.time >= outlierStart1Ms && p.time <= outlierEnd1Ms && p.value > 2000) {
        return false;
      }
      // Убираем все точки в период 2 (неправильные подсчеты - только стейблы)
      if (p.time >= outlierStart2Ms && p.time <= outlierEnd2Ms) {
        return false;
      }
      return true;
    }),
  }));
}

/**
 * Обрезать данные до 12 PM сегодняшнего дня
 */
function trimToTodayNoon(series: FaderSeries[]): FaderSeries[] {
  const now = new Date();
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const todayNoonMs = todayNoon.getTime();
  
  return series.map((s) => ({
    ...s,
    points: s.points.filter((p) => p.time >= todayNoonMs),
  }));
}

/**
 * Добавить новый снапшот к сериям
 */
function appendNewSnapshot(
  series: FaderSeries[],
  snapshot: FaderEquityResponse
): FaderSeries[] {
  const newSeries = [...series];

  for (const wallet of snapshot.wallets) {
    const seriesIndex = newSeries.findIndex((s) => s.label === wallet.label);
    const point: LinePoint = {
      time: snapshot.timestamp,
      value: isNaN(wallet.equityUsd) ? 0 : wallet.equityUsd,
    };

    if (seriesIndex >= 0) {
      newSeries[seriesIndex] = {
        ...newSeries[seriesIndex],
        points: [...newSeries[seriesIndex].points, point],
      };
    } else {
      newSeries.push({
        label: wallet.label,
        address: wallet.address,
        points: [point],
      });
    }
  }

  return newSeries;
}

/**
 * Объединить серии в формат для recharts
 * Всегда включает начальную точку в 12 PM сегодня с дефолтным значением 500
 */
function mergeSeriesForChart(series: FaderSeries[]): any[] {
  const now = new Date();
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const todayNoonMs = todayNoon.getTime();
  
  const timeSet = new Set<number>();
  // Всегда добавляем начальную точку в 12 PM
  timeSet.add(todayNoonMs);
  
  for (const s of series) {
    for (const p of s.points) {
      // Добавляем только точки с 12 PM и позже
      if (p.time >= todayNoonMs) {
        timeSet.add(p.time);
      }
    }
  }

  const times = Array.from(timeSet).sort((a, b) => a - b);

  return times.map((time) => {
    const entry: any = {
      time,
      timeFormatted: new Date(time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    for (const s of series) {
      const point = s.points.find((p) => p.time === time);
      if (point) {
        entry[s.label] = point.value;
      } else if (time === todayNoonMs) {
        // Для начальной точки (12 PM) используем дефолтное значение 500, если нет данных
        entry[s.label] = 500;
      } else {
        entry[s.label] = null;
      }
    }

    return entry;
  });
}

export default function FaderEquityChart() {
  const [series, setSeries] = useState<FaderSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузить историю и начать обновления
  useEffect(() => {
    let mounted = true;

    // Вычисляем время с 12 PM сегодняшнего дня (фиксированная точка отсчета)
    const now = new Date();
    const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    const todayNoonMs = todayNoon.getTime();

    async function loadHistory() {
      try {
        // Вычисляем сколько часов прошло с 12 PM
        const hoursSinceNoon = Math.ceil((now.getTime() - todayNoonMs) / (1000 * 60 * 60));
        const windowHours = Math.max(hoursSinceNoon, 1); // Минимум 1 час
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут для истории
        
        const response = await fetch(`${API_BASE_URL}/api/equity/faders/history?windowHours=${windowHours}`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const history: FaderEquityHistoryResponse = await response.json();
        
        if (!mounted) return;

        // Фильтруем только данные с 12 PM сегодня (строгая фильтрация)
        const filteredPoints = history.points.filter(p => p.timestamp >= todayNoonMs);

        // Преобразуем историю в серии
        const historySeries: FaderSeries[] = [];
        
        // Инициализируем все серии с дефолтным значением 500 в 12 PM
        for (const label of FADER_LABELS) {
          historySeries.push({
            label,
            address: '',
            points: [{
              time: todayNoonMs,
              value: 500, // Дефолтное значение для начала графика
            }],
          });
        }

        // Добавляем реальные данные из истории
        for (const point of filteredPoints) {
          for (const wallet of point.wallets) {
            const seriesIndex = historySeries.findIndex((s) => s.label === wallet.label);
            const dataPoint: LinePoint = {
              time: point.timestamp,
              value: isNaN(wallet.equityUsd) ? 0 : wallet.equityUsd,
            };

            if (seriesIndex >= 0) {
              // Проверяем, нет ли уже точки в это время
              const existingIndex = historySeries[seriesIndex].points.findIndex(p => p.time === point.timestamp);
              if (existingIndex >= 0) {
                historySeries[seriesIndex].points[existingIndex] = dataPoint;
              } else {
                historySeries[seriesIndex].points.push(dataPoint);
              }
            } else {
              // Если серии нет, создаем с дефолтной точкой в 12 PM и текущей точкой
              historySeries.push({
                label: wallet.label,
                address: wallet.address,
                points: [{
                  time: todayNoonMs,
                  value: 500, // Дефолтное значение
                }, dataPoint],
              });
            }
          }
        }

        // Сортируем точки по времени для каждой серии
        historySeries.forEach(s => {
          s.points.sort((a, b) => a.time - b.time);
        });

        // Фильтруем выбросы
        const filteredHistorySeries = filterOutliers(historySeries);

        setSeries(filteredHistorySeries);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Failed to load history:', err);
        // Если история не загрузилась, все равно показываем график с текущими данными
        setLoading(false);
      }
    }

    async function updateSnapshot() {
      try {
        const controller = new AbortController();
        // Увеличиваем таймаут до 60 секунд, т.к. запросы последовательные (6 кошельков * 1 сек + время запросов)
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${API_BASE_URL}/api/equity/faders`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const snapshot: FaderEquityResponse = await response.json();
        
        if (!mounted) return;

        // Если нет кошельков, показываем информационное сообщение
        if (snapshot.wallets.length === 0) {
          setError('No fader wallets configured. Please add MY_*_FADE_WALLET variables to .env');
          setLoading(false);
          return;
        }

        setSeries((prev) => {
          const updated = appendNewSnapshot(prev, snapshot);
          // Фильтруем только данные с 12 PM сегодня (фиксированная точка отсчета)
          const filtered = trimToTodayNoon(updated);
          
          // Фильтруем выбросы
          const withoutOutliers = filterOutliers(filtered);
          
          // Убеждаемся, что у каждой серии есть точка в 12 PM с дефолтным значением 500
          const now = new Date();
          const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
          const todayNoonMs = todayNoon.getTime();
          
          withoutOutliers.forEach(s => {
            // Проверяем, есть ли точка в 12 PM
            const hasNoonPoint = s.points.some(p => p.time === todayNoonMs);
            if (!hasNoonPoint && s.points.length > 0) {
              // Если нет точки в 12 PM, добавляем дефолтное значение
              s.points.unshift({
                time: todayNoonMs,
                value: 500,
              });
            } else if (!hasNoonPoint && s.points.length === 0) {
              // Если вообще нет точек, добавляем только дефолтную
              s.points.push({
                time: todayNoonMs,
                value: 500,
              });
            }
            
            // Сортируем точки по времени
            s.points.sort((a, b) => a.time - b.time);
          });
          
          return withoutOutliers;
        });
        setLoading(false);
        setError(null);
      } catch (err) {
        if (!mounted) return;

        console.error('Failed to update fader equity snapshot:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Проверяем тип ошибки
        let userMessage = errorMessage;
        if (err instanceof Error) {
          if (err.name === 'AbortError' || errorMessage.includes('timeout')) {
            userMessage = `Connection timeout. API не отвечает на ${API_BASE_URL}`;
          } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            userMessage = `Не удалось подключиться к API. Убедитесь, что сервер запущен на ${API_BASE_URL}`;
          }
        }
        
        setError(userMessage);
        setLoading(false);
      }
    }

    // Сразу загружаем текущий снапшот и историю параллельно
    // Это позволяет сразу показать график без ожидания
    Promise.all([
      updateSnapshot().catch(err => {
        console.warn('Failed to load current snapshot:', err);
        return null;
      }),
      loadHistory().catch(err => {
        console.warn('Failed to load history:', err);
        return null;
      })
    ]).then(() => {
      // После загрузки начинаем периодические обновления
      if (mounted) {
        intervalRef.current = setInterval(updateSnapshot, 15_000);
      }
    });

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Пустой массив - запускается только один раз при монтировании

  if (loading) {
    return (
      <div className="card p-8">
        <div className="text-center text-terminal-textMuted animate-pulse">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    const isConnectionError = error.includes('Failed to fetch') || error.includes('fetch');
    return (
      <div className="card p-8">
        <div className="text-center space-y-3">
          <div className="text-red-500 font-semibold animate-fade-in">⚠️ Error loading chart</div>
          <div className="text-sm text-terminal-textMuted max-w-md mx-auto">{error}</div>
          {isConnectionError && (
              <div className="text-xs text-terminal-textMuted mt-4 space-y-2 animate-fade-in-delay">
              <div>API server is not running or unavailable.</div>
              <div className="mt-2 p-3 bg-terminal-bg rounded border border-terminal-border transition-all duration-300 hover:border-terminal-text/50">
                <div className="font-mono text-xs">Start the API:</div>
                <code className="block mt-1 text-xs">npx pnpm --filter @fadearena/api dev</code>
              </div>
              <div className="text-xs mt-2">Make sure API is listening on: <code>{API_BASE_URL}</code></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const chartData = mergeSeriesForChart(series);

  // Вычисляем min и max значения из всех данных для настройки Y-оси
  let minValue = Infinity;
  let maxValue = -Infinity;
  
  for (const point of chartData) {
    for (const label of FADER_LABELS) {
      const value = point[label];
      if (value !== null && value !== undefined && !isNaN(value)) {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }
  }

  // Если нет данных, используем дефолтный диапазон
  if (minValue === Infinity) {
    minValue = 400;
    maxValue = 600;
  }

  // Добавляем небольшой отступ сверху и снизу для лучшей видимости (5%)
  const padding = (maxValue - minValue) * 0.05;
  const yAxisMin = Math.max(0, minValue - padding);
  const yAxisMax = maxValue + padding;

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold mb-4 font-mono animate-fade-in">Fader Equity (Live)</h2>
      <p className="text-xs text-terminal-textMuted mb-2 animate-fade-in-delay">
        USDC Balance + Unrealized PnL (profit/loss if positions closed now)
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="timeFormatted"
            stroke="#888"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#888"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            domain={[yAxisMin, yAxisMax]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
            }}
            labelFormatter={(label) => `Time: ${label}`}
            formatter={(value: any) => [
              `$${Number(value).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              '',
            ]}
          />
          <Legend />
          {FADER_LABELS.map((label, index) => {
            const seriesExists = series.some((s) => s.label === label);
            if (!seriesExists) return null;

            return (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={FADER_COLORS[index]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name={label}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

