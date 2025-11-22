/**
 * Position Synchronizer
 * 
 * Syncs current open positions from bot wallets to our mirror wallets
 * This is a one-time sync on startup to catch up with existing positions
 */

import pino from 'pino';
import { PrismaClient } from '@fadearena/shared';
import { HyperliquidInfoClient } from './hyperliquidClient';
import { StrategyEngine } from './strategyEngine';
import type { BotConfig } from '@fadearena/shared';

const logger = pino({ name: 'PositionSync' });

export class PositionSync {
  private prisma: PrismaClient;
  private infoClient: HyperliquidInfoClient;
  private strategyEngine: StrategyEngine;
  private bots: BotConfig[];

  constructor(
    prisma: PrismaClient,
    infoClient: HyperliquidInfoClient,
    strategyEngine: StrategyEngine,
    bots: BotConfig[]
  ) {
    this.prisma = prisma;
    this.infoClient = infoClient;
    this.strategyEngine = strategyEngine;
    this.bots = bots;
  }

  /**
   * Sync all current open positions from bots to mirror wallets
   */
  async syncAllPositions(): Promise<void> {
    logger.info(
      {
        botCount: this.bots.length,
        bots: this.bots.map(b => ({ id: b.id, wallet: b.walletAddress.substring(0, 10) + '...' })),
      },
      'Starting position synchronization'
    );

    let syncedCount = 0;
    let errorCount = 0;

    for (const bot of this.bots) {
      try {
        logger.info({ botId: bot.id, wallet: bot.walletAddress.substring(0, 10) + '...' }, 'Starting sync for bot');
        await this.syncBotPositions(bot);
        syncedCount++;
        logger.info({ botId: bot.id }, 'Completed sync for bot');
        // Small delay between bots to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        errorCount++;
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            botId: bot.id,
            wallet: bot.walletAddress.substring(0, 10) + '...',
          },
          'Failed to sync positions for bot'
        );
      }
    }

    logger.info(
      {
        totalBots: this.bots.length,
        syncedCount,
        errorCount,
      },
      'Position synchronization completed'
    );
  }

  /**
   * Sync positions for a single bot
   */
  private async syncBotPositions(bot: BotConfig): Promise<void> {
    logger.info({ botId: bot.id, wallet: bot.walletAddress.substring(0, 10) + '...' }, 'Syncing bot positions');

    // Get mirror account
    const mirrorAccount = await this.prisma.mirrorAccount.findUnique({
      where: { id: bot.id },
    });

    if (!mirrorAccount || !mirrorAccount.enabled) {
      logger.warn({ botId: bot.id }, 'Mirror account not found or disabled, skipping');
      return;
    }

    // Get current positions from bot wallet
    let positions: Array<{
      coin: string;
      sz: number; // positive = long, negative = short
      notional: number;
      entryPx: number;
    }> = [];

    try {
      // Try to get positions using clearinghouseState
      logger.debug({ botId: bot.id, wallet: bot.walletAddress }, 'Fetching user state for bot');
      const userState = await this.infoClient.getUserState(bot.walletAddress);
      
      logger.debug(
        {
          botId: bot.id,
          hasAssetPositions: !!userState.assetPositions,
          assetPositionsLength: userState.assetPositions?.length || 0,
          rawState: JSON.stringify(userState).substring(0, 500),
        },
        'User state received'
      );
      
      if (userState.assetPositions && Array.isArray(userState.assetPositions)) {
        logger.debug({ botId: bot.id, count: userState.assetPositions.length }, 'Processing asset positions');
        
        for (const assetPos of userState.assetPositions) {
          const pos = assetPos.position || assetPos;
          const sz = parseFloat(String(pos.sz || 0));
          const notional = Math.abs(parseFloat(String(pos.notional || 0)));
          const entryPx = parseFloat(String(pos.entryPx || 0));

          logger.debug(
            {
              botId: bot.id,
              coin: pos.coin,
              sz,
              notional,
              entryPx,
              meetsThreshold: Math.abs(sz) > 0.0001 && notional > 0,
            },
            'Checking position'
          );

          // Only include non-zero positions
          if (Math.abs(sz) > 0.0001 && notional > 0) {
            positions.push({
              coin: pos.coin,
              sz,
              notional,
              entryPx,
            });
            logger.info(
              {
                botId: bot.id,
                coin: pos.coin,
                side: sz > 0 ? 'LONG' : 'SHORT',
                size: Math.abs(sz),
                notional,
              },
              'Added position to sync list'
            );
          }
        }
      } else {
        logger.warn({ botId: bot.id, userState }, 'No assetPositions found in userState');
      }

      // Also check xyz DEX for stock perps (where most stock positions are)
      try {
        logger.debug({ botId: bot.id }, 'Checking xyz DEX for stock perp positions');
        const xyzState = await this.infoClient.getClearinghouseState({
          user: bot.walletAddress,
          dex: 'xyz',
        });

        logger.debug(
          {
            botId: bot.id,
            hasAssetPositions: !!xyzState.assetPositions,
            assetPositionsLength: xyzState.assetPositions?.length || 0,
          },
          'xyz DEX state received'
        );

        if (xyzState.assetPositions && Array.isArray(xyzState.assetPositions)) {
          logger.debug({ botId: bot.id, count: xyzState.assetPositions.length }, 'Processing xyz DEX positions');
          
          for (const assetPos of xyzState.assetPositions) {
            const pos = assetPos.position || assetPos;
            // For xyz DEX, use szi (signed size integer) or sz
            const sz = parseFloat(String(pos.szi || pos.sz || 0));
            // For xyz DEX, use positionValue (current value) or notional
            const notional = Math.abs(parseFloat(String(pos.positionValue || pos.notional || 0)));
            const entryPx = parseFloat(String(pos.entryPx || 0));

            logger.debug(
              {
                botId: bot.id,
                coin: pos.coin,
                sz,
                szi: pos.szi,
                positionValue: pos.positionValue,
                notional,
                entryPx,
                meetsThreshold: Math.abs(sz) > 0.0001 && notional > 0,
              },
              'Checking xyz DEX position'
            );

            if (Math.abs(sz) > 0.0001 && notional > 0) {
              // Check if we already have this position (might be listed in both)
              const existing = positions.find(p => p.coin === pos.coin);
              if (!existing) {
                positions.push({
                  coin: pos.coin,
                  sz,
                  notional,
                  entryPx,
                });
                logger.info(
                  {
                    botId: bot.id,
                    coin: pos.coin,
                    side: sz > 0 ? 'LONG' : 'SHORT',
                    size: Math.abs(sz),
                    notional,
                    source: 'xyz DEX',
                  },
                  'Added xyz DEX position to sync list'
                );
              } else {
                logger.debug({ botId: bot.id, coin: pos.coin }, 'Position already exists from default DEX');
              }
            }
          }
        } else {
          logger.debug({ botId: bot.id }, 'No xyz DEX positions found');
        }
      } catch (xyzError) {
        logger.warn(
          {
            error: xyzError instanceof Error ? xyzError.message : String(xyzError),
            botId: bot.id,
          },
          'Error fetching xyz DEX positions'
        );
      }

      logger.info(
        {
          botId: bot.id,
          positionCount: positions.length,
          positions: positions.map(p => `${p.coin}: ${p.sz > 0 ? 'LONG' : 'SHORT'} ${Math.abs(p.sz).toFixed(4)} ($${p.notional.toFixed(2)})`),
        },
        'Found bot positions'
      );

      if (positions.length === 0) {
        logger.info({ botId: bot.id }, 'No open positions found for bot');
        return;
      }

      // For each position, create a mirror trade event and process it
      for (const position of positions) {
        try {
          await this.syncPosition(bot, mirrorAccount, position);
          // Small delay between positions
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(
            {
              error: error instanceof Error ? error.message : String(error),
              botId: bot.id,
              asset: position.coin,
            },
            'Failed to sync position'
          );
        }
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          botId: bot.id,
          wallet: bot.walletAddress.substring(0, 10) + '...',
        },
        'Failed to get bot positions'
      );
      throw error;
    }
  }

  /**
   * Sync a single position by creating a synthetic trade event
   */
  private async syncPosition(
    bot: BotConfig,
    mirrorAccount: any,
    position: {
      coin: string;
      sz: number;
      notional: number;
      entryPx: number;
    }
  ): Promise<void> {
    const side = position.sz > 0 ? 'long' : 'short'; // lowercase for Prisma schema
    const size = Math.abs(position.sz);

    logger.info(
      {
        botId: bot.id,
        asset: position.coin,
        side,
        size,
        notional: position.notional,
        entryPx: position.entryPx,
      },
      'Syncing position'
    );

    // Create a synthetic BotTradeEvent for this position
    // This will trigger the strategy engine to open the inverse position
    // IMPORTANT: All numeric fields must be strings (Prisma/SQLite requirement)
    const syntheticEvent = await this.prisma.botTradeEvent.create({
      data: {
        botId: bot.id,
        walletAddress: bot.walletAddress,
        timestamp: new Date(),
        eventType: 'OPEN', // Treat as new position opening
        asset: position.coin,
        side: side as 'long' | 'short', // lowercase for Prisma schema
        size: size.toString(), // Convert to string
        price: position.entryPx.toString(), // Convert to string
        notional: position.notional.toString(), // Convert to string
        previousSize: '0', // No previous position (we're syncing from scratch)
        previousNotional: '0',
        currentSize: size.toString(), // Convert to string
        currentNotional: position.notional.toString(), // Convert to string
        hyperliquidFillHash: `sync-${Date.now()}-${Math.random()}`, // Synthetic hash
        rawData: JSON.stringify(position), // Convert object to JSON string
      },
    });

      // Process the event through strategy engine
    try {
      logger.info(
        {
          botId: bot.id,
          asset: position.coin,
          eventId: syntheticEvent.id,
          side,
          size,
          notional: position.notional,
        },
        'Processing sync event through strategy engine'
      );
      
      const decision = await this.strategyEngine.processBotTradeEvent(syntheticEvent);
      
      logger.info(
        {
          botId: bot.id,
          asset: position.coin,
          eventId: syntheticEvent.id,
          decisionId: decision.id,
          decision: decision.decision,
        },
        'Position synced successfully'
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          botId: bot.id,
          asset: position.coin,
          eventId: syntheticEvent.id,
        },
        'Failed to process sync event'
      );
      // Don't throw - continue with other positions
    }
  }
}

