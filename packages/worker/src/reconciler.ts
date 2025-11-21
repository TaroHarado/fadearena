/**
 * Position Reconciler
 * 
 * Periodically checks our actual positions on Hyperliquid
 * and compares with expected positions from our trades
 */

import pino from 'pino';
import { PrismaClient } from '@fadearena/shared';
import { HyperliquidClient } from './hyperliquidClient';

const logger = pino({ name: 'Reconciler' });

export class Reconciler {
  private prisma: PrismaClient;
  private hyperliquid: HyperliquidClient;
  private walletAddress: string;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private driftThreshold = 0.05; // 5% drift threshold

  constructor(
    prisma: PrismaClient,
    hyperliquid: HyperliquidClient,
    walletAddress: string,
    intervalMs: number
  ) {
    this.prisma = prisma;
    this.hyperliquid = hyperliquid;
    this.walletAddress = walletAddress;

    // Start reconciliation
    this.start(intervalMs);
  }

  /**
   * Start periodic reconciliation
   */
  private start(intervalMs: number): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info({ interval: intervalMs }, 'Starting position reconciler');

    // Initial reconciliation
    this.reconcile().catch((error) => {
      logger.error({ error }, 'Error in initial reconciliation');
    });

    // Set up periodic reconciliation
    this.intervalId = setInterval(() => {
      this.reconcile().catch((error) => {
        logger.error({ error }, 'Error in reconciliation cycle');
      });
    }, intervalMs);
  }

  /**
   * Stop reconciliation
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

    logger.info('Position reconciler stopped');
  }

  /**
   * Reconcile positions
   */
  private async reconcile(): Promise<void> {
    try {
      // Get our actual positions from Hyperliquid
      const actualState = await this.hyperliquid.info.getUserState(this.walletAddress);

      // Get expected positions from our trades
      const expectedPositions = await this.getExpectedPositions();

      // Compare
      const drifts: Array<{ asset: string; expected: number; actual: number; drift: number }> = [];

      for (const expected of expectedPositions) {
        const actual = actualState.assetPositions.find((p) => p.position.coin === expected.asset);
        const actualSize = actual ? parseFloat(actual.position.sz) : 0;
        const expectedSize = expected.size * (expected.side === 'long' ? 1 : -1);

        const drift = Math.abs(actualSize - expectedSize);
        const driftPercent = expectedSize !== 0 ? (drift / Math.abs(expectedSize)) * 100 : 0;

        if (driftPercent > this.driftThreshold * 100) {
          drifts.push({
            asset: expected.asset,
            expected: expectedSize,
            actual: actualSize,
            drift: driftPercent,
          });
        }
      }

      // Log warnings if drift detected
      if (drifts.length > 0) {
        logger.warn({ drifts }, 'Position drift detected');
        
        // Optionally pause trading if drift is significant
        const maxDrift = Math.max(...drifts.map((d) => d.drift));
        if (maxDrift > 20) {
          logger.error({ maxDrift }, 'Significant position drift detected, consider pausing trading');
          // Could set a flag or emit an event here
        }
      } else {
        logger.debug('Positions reconciled, no drift detected');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to reconcile positions');
    }
  }

  /**
   * Get expected positions from our trades
   */
  private async getExpectedPositions(): Promise<Array<{ asset: string; side: 'long' | 'short'; size: number }>> {
    // Get all open trades (not closed)
    const openTrades = await this.prisma.myTrade.findMany({
      where: {
        closedAt: null,
        simulated: false,
      },
    });

    // Aggregate by asset and side
    const positions = new Map<string, { long: number; short: number }>();

    for (const trade of openTrades) {
      const key = trade.asset;
      if (!positions.has(key)) {
        positions.set(key, { long: 0, short: 0 });
      }

      const pos = positions.get(key)!;
      if (trade.side === 'long') {
        pos.long += Number(trade.size);
      } else {
        pos.short += Number(trade.size);
      }
    }

    // Convert to array
    const result: Array<{ asset: string; side: 'long' | 'short'; size: number }> = [];
    for (const [asset, pos] of positions.entries()) {
      if (pos.long > 0) {
        result.push({ asset, side: 'long', size: pos.long });
      }
      if (pos.short > 0) {
        result.push({ asset, side: 'short', size: pos.short });
      }
    }

    return result;
  }
}

