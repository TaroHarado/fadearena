/**
 * Bot Ingestor
 * 
 * Periodically polls Hyperliquid for AI bot wallet activity
 * and emits normalized BotTradeEvent objects
 */

import { EventEmitter } from 'events';
import pino from 'pino';
import { PrismaClient } from '@fadearena/shared';
import { HyperliquidInfoClient } from './hyperliquidClient';
import type { BotTradeEvent, BotConfig } from '@fadearena/shared';

const logger = pino({ name: 'BotIngestor' });

export class BotIngestor extends EventEmitter {
  private prisma: PrismaClient;
  private infoClient: HyperliquidInfoClient;
  private bots: BotConfig[];
  private pollingInterval: number;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  // Track last seen fills to avoid duplicates
  private lastSeenFills: Map<string, number> = new Map(); // wallet -> last fill timestamp

  constructor(
    prisma: PrismaClient,
    infoClient: HyperliquidInfoClient,
    bots: BotConfig[],
    pollingIntervalMs: number
  ) {
    super();
    this.prisma = prisma;
    this.infoClient = infoClient;
    this.bots = bots;
    this.pollingInterval = pollingIntervalMs;
  }

  /**
   * Start polling bot wallets
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot ingestor already running');
      return;
    }

    this.isRunning = true;
    logger.info({ botCount: this.bots.length, interval: this.pollingInterval }, 'Starting bot ingestor');

    // Initialize lastSeenFills to current time - we only want to process NEW trades from now on
    // This ensures we don't copy old/existing positions, only new trades after worker starts
    const now = Date.now();
    for (const bot of this.bots) {
      this.lastSeenFills.set(bot.walletAddress, now);
      logger.info({ botId: bot.id }, 'Initialized - will only process NEW trades from now on');
    }

    // Initial poll (will skip old fills)
    await this.pollAllBots();

    // Set up periodic polling
    this.intervalId = setInterval(() => {
      this.pollAllBots().catch((error) => {
        logger.error({ error }, 'Error in polling cycle');
      });
    }, this.pollingInterval);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Bot ingestor stopped');
  }

  /**
   * Poll all bot wallets sequentially to avoid rate limiting
   */
  private async pollAllBots(): Promise<void> {
    // Poll bots sequentially with delay to avoid rate limiting
    // Hyperliquid rate limit: ~1 request per second per IP
    // With 6 bots, we need at least 6 seconds between cycles
    // Increased delay to 5 seconds per bot to be safe
    for (const bot of this.bots) {
      await this.pollBot(bot);
      // Wait 5 seconds between each bot to respect rate limits
      // 6 bots * 5 seconds = 30 seconds minimum per cycle
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  /**
   * Poll a single bot wallet
   * 
   * IMPORTANT: We only poll fills to detect NEW trades.
   * Fills contain all the information we need (coin, side, size, price, time).
   * We don't need to poll state separately - fills are sufficient for tracking trades.
   */
  private async pollBot(bot: BotConfig): Promise<void> {
    try {
      // Only poll fills - this is enough to detect new trades
      // Use userFillsByTime to get only recent fills (last 5 minutes)
      // This reduces API load and avoids rate limiting
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const fillsResponse = await this.infoClient.getUserFills(
        bot.walletAddress,
        fiveMinutesAgo,
        Date.now()
      ).catch(() => ({ fills: [] }));

      // Process fills
      if (fillsResponse.fills && fillsResponse.fills.length > 0) {
        for (const fill of fillsResponse.fills) {
          await this.processFill(bot, fill);
        }
      }

      // Update system status
      await this.updateSystemStatus();
    } catch (error) {
      logger.error({ error, botId: bot.id, wallet: bot.walletAddress }, 'Error polling bot');
    }
  }

  /**
   * Process a fill (trade)
   */
  private async processFill(bot: BotConfig, fill: any): Promise<void> {
    const fillTime = fill.time;
    const lastSeen = this.lastSeenFills.get(bot.walletAddress) || 0;

    // Skip if we've already seen this fill
    if (fillTime <= lastSeen) {
      return;
    }

    // Update last seen
    this.lastSeenFills.set(bot.walletAddress, fillTime);

    // Normalize fill to BotTradeEvent
    const event: BotTradeEvent = {
      id: crypto.randomUUID(),
      botId: bot.id,
      walletAddress: bot.walletAddress,
      timestamp: fillTime,
      eventType: 'fill',
      asset: fill.coin,
      side: fill.side === 'A' ? 'long' : 'short', // "A" = buy/long, "B" = sell/short
      size: Math.abs(parseFloat(fill.sz)),
      price: parseFloat(fill.px),
      notional: Math.abs(parseFloat(fill.sz)) * parseFloat(fill.px),
      hyperliquidFillHash: fill.hash,
      rawData: fill,
    };

    // Save to database
    await this.saveBotTradeEvent(event);

    // Emit event for strategy engine
    this.emit('bot-trade', event);

    logger.info(
      { botId: bot.id, asset: event.asset, side: event.side, size: event.size },
      'Bot trade event detected'
    );
  }

  /**
   * Process position changes
   */
  private async processPositionChanges(bot: BotConfig, state: any): Promise<void> {
    if (!state.assetPositions) {
      return;
    }

    // Get previous positions from DB
    const previousEvents = await this.prisma.botTradeEvent.findMany({
      where: {
        botId: bot.id,
        eventType: 'position-change',
      },
      orderBy: { timestamp: 'desc' },
      take: 100, // Get recent position changes
    });

    // Build map of previous positions
    const previousPositions = new Map<string, { size: number; notional: number }>();
    for (const event of previousEvents) {
      if (event.currentSize !== null && event.currentNotional !== null) {
        previousPositions.set(event.asset, {
          size: Number(event.currentSize),
          notional: Number(event.currentNotional),
        });
      }
    }

    // Compare with current positions
    for (const { position } of state.assetPositions) {
      const currentSize = parseFloat(position.sz);
      const currentNotional = Math.abs(parseFloat(position.notional));
      const previous = previousPositions.get(position.coin);

      // Check if position changed significantly (> 1% change) or closed
      if (previous) {
        // If bot closed position (was > 0, now = 0), emit event
        if (previous.size !== 0 && currentSize === 0) {
          // Position closed - emit event to close our position
        } else {
          // Position changed - check if significant
          const sizeChange = Math.abs(currentSize - previous.size);
          const notionalChange = Math.abs(currentNotional - previous.notional);
          const changePercent = (notionalChange / previous.notional) * 100;

          if (changePercent < 1) {
            continue; // Ignore small changes
          }
        }
      } else if (currentSize === 0) {
        continue; // No position and no previous position, skip
      }

      // Create position change event
      const event: BotTradeEvent = {
        id: crypto.randomUUID(),
        botId: bot.id,
        walletAddress: bot.walletAddress,
        timestamp: Date.now(),
        eventType: 'position-change',
        asset: position.coin,
        side: currentSize > 0 ? 'long' : 'short',
        size: Math.abs(currentSize),
        price: parseFloat(position.entryPx),
        notional: currentNotional,
        previousPosition: previous ? {
          size: previous.size,
          notional: previous.notional,
        } : undefined,
        currentPosition: {
          size: currentSize,
          notional: currentNotional,
        },
        rawData: position,
      };

      // Save to database
      await this.saveBotTradeEvent(event);

      // Emit event
      this.emit('bot-trade', event);

      logger.info(
        { botId: bot.id, asset: event.asset, side: event.side, size: event.size },
        'Bot position change detected'
      );
    }
  }

  /**
   * Save bot trade event to database
   */
  private async saveBotTradeEvent(event: BotTradeEvent): Promise<void> {
    try {
      await this.prisma.botTradeEvent.create({
        data: {
          id: event.id,
          botId: event.botId,
          walletAddress: event.walletAddress,
          timestamp: new Date(event.timestamp),
          eventType: event.eventType,
          asset: event.asset,
          side: event.side,
          size: event.size.toString(), // SQLite stores as string
          price: event.price.toString(), // SQLite stores as string
          notional: event.notional.toString(), // SQLite stores as string
          previousSize: event.previousPosition?.size?.toString(),
          previousNotional: event.previousPosition?.notional?.toString(),
          currentSize: event.currentPosition?.size?.toString(),
          currentNotional: event.currentPosition?.notional?.toString(),
          hyperliquidFillHash: event.hyperliquidFillHash,
          rawData: event.rawData ? JSON.stringify(event.rawData) : null, // JSON as string
        },
      });
    } catch (error) {
      logger.error({ error, eventId: event.id }, 'Failed to save bot trade event');
    }
  }

  /**
   * Update system status with last event time
   */
  private async updateSystemStatus(): Promise<void> {
    try {
      await this.prisma.systemStatus.updateMany({
        where: { id: 'default' },
        data: {
          lastEventTime: new Date(),
          hyperliquidConnected: true,
          lastHyperliquidCheck: new Date(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update system status');
    }
  }
}

