/**
 * Structured logging utility
 * 
 * JSON format with: timestamp, level, component, botId, eventId, cloid, message
 */

import pino from 'pino';

export interface LogContext {
  component?: string;
  botId?: string;
  eventId?: string;
  cloid?: string;
  orderId?: string;
  correlationId?: string;
  [key: string]: any;
}

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // JSON output in production, pretty in development
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
  });
}

/**
 * Structured log format:
 * {
 *   "timestamp": "2024-01-01T12:00:00.000Z",
 *   "level": "INFO",
 *   "component": "strategy-engine",
 *   "botId": "gemini-3-pro",
 *   "eventId": "uuid",
 *   "cloid": "fadearena-0x...-123456-42",
 *   "message": "Order placed",
 *   ...additional fields
 * }
 */

