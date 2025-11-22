/**
 * WebSocket Server
 * 
 * Broadcasts real-time events to connected clients
 */

import { WebSocketServer, WebSocket } from 'ws';
import pino from 'pino';
import type {
  BotTradeEvent,
  OrderResult,
  StateResponse,
  Settings,
  WebSocketMessage,
} from '@fadearena/shared';

const logger = pino({ name: 'WebSocket' });

export class WSServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number) {
    try {
      this.wss = new WebSocketServer({ port, path: '/ws' });

      // Обработка ошибки при занятом порте
      this.wss.on('error', (error: Error & { code?: string }) => {
        if (error.code === 'EADDRINUSE') {
          logger.warn({ port, error: error.message }, 'WebSocket port already in use, server will continue without WebSocket');
          this.wss = null;
          return;
        }
        logger.error({ error }, 'WebSocket server error');
      });

      this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      logger.info({ clientCount: this.clients.size }, 'WebSocket client connected');

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info({ clientCount: this.clients.size }, 'WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        logger.error({ error }, 'WebSocket error');
      });

      // Handle subscribe/unsubscribe messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error({ error }, 'Failed to parse WebSocket message');
        }
      });
    });

      if (this.wss) {
        logger.info({ port }, 'WebSocket server started');
      }
    } catch (error: any) {
      logger.warn({ port, error: error?.message }, 'Failed to create WebSocket server, continuing without it');
      this.wss = null;
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    if (!this.wss) {
      return; // WebSocket не запущен
    }

    const data = JSON.stringify(message);
    let sent = 0;

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
          sent++;
        } catch (error) {
          logger.error({ error }, 'Failed to send WebSocket message');
        }
      }
    }

    logger.debug({ sent, total: this.clients.size }, 'Broadcast message');
  }

  /**
   * Send bot trade event
   */
  sendBotTrade(event: BotTradeEvent): void {
    this.broadcast({
      type: 'bot-trade',
      data: {
        botId: event.botId,
        walletAddress: event.walletAddress,
        event,
      },
    });
  }

  /**
   * Send my trade event
   */
  sendMyTrade(orderResult: OrderResult, botId: string, reason: string): void {
    this.broadcast({
      type: 'my-trade',
      data: {
        id: orderResult.id,
        timestamp: orderResult.timestamp,
        botId,
        asset: orderResult.orderRequest.asset,
        side: orderResult.orderRequest.side,
        size: orderResult.orderRequest.size,
        price: orderResult.fillPrice || orderResult.orderRequest.price,
        notional: orderResult.orderRequest.size * (orderResult.fillPrice || orderResult.orderRequest.price),
        simulated: orderResult.simulated,
        orderId: orderResult.hyperliquidOrderId?.toString() || null,
        reason,
      },
    });
  }

  /**
   * Send state update
   */
  sendStateUpdate(state: Partial<StateResponse>): void {
    this.broadcast({
      type: 'state-update',
      data: state,
    });
  }

  /**
   * Send settings update
   */
  sendSettingsUpdate(settings: Settings): void {
    this.broadcast({
      type: 'settings-update',
      data: settings,
    });
  }

  /**
   * Send error
   */
  sendError(message: string, code: string): void {
    this.broadcast({
      type: 'error',
      data: {
        message,
        code,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (message.type === 'subscribe' || message.type === 'unsubscribe') {
      // For now, all clients receive all messages
      // Could implement channel-based filtering here
      logger.debug({ type: message.type }, 'Client subscription message');
    }
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket server closed');
    }
  }
}

