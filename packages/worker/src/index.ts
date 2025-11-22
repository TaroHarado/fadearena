/**
 * Worker Entry Point
 * 
 * Orchestrates bot-ingestor, strategy-engine, and reconciler
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';

// Находим корень проекта (где находится .env)
// .env находится в корне проекта, а мы в packages/worker/src
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

import pino from 'pino';
import { PrismaClient, loadConfig } from '@fadearena/shared';
import { HyperliquidInfoClient, HyperliquidClient } from './hyperliquidClient';
import { ExchangeClientFactory } from './exchangeClientFactory';
import { BotIngestor } from './botIngestor';
import { StrategyEngine } from './strategyEngine';

const logger = pino({
  name: 'Worker',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

async function main() {
  logger.info('Starting FadeArena worker...');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    logger.error('DATABASE_URL is not set in .env file');
    logger.info('Please set DATABASE_URL in .env file, for example:');
    logger.info('DATABASE_URL=file:./packages/shared/prisma/dev.db');
    process.exit(1);
  }

  // Load configuration
  const config = loadConfig();

  // Initialize Prisma with error handling
  let prisma: PrismaClient;
  try {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
    
    // Test connection
    await prisma.$connect();
    logger.info('Prisma connected successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Prisma');
    logger.error('Make sure DATABASE_URL is correct and database exists');
    logger.error('Run: pnpm db:migrate:deploy');
    process.exit(1);
  }

  // Initialize Hyperliquid info client (read-only)
  const infoClient = new HyperliquidInfoClient(config.hyperliquid.infoUrl);
  await infoClient.getMeta();

  // Determine simulation mode from settings
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });
  const simulationMode = !settings || settings.mode === 'simulation';

  // Initialize exchange client factory (for multiple mirror wallets)
  const exchangeClientFactory = new ExchangeClientFactory(
    config.hyperliquid.infoUrl,
    config.hyperliquid.exchangeUrl,
    prisma,
    simulationMode
  );

  // BotIngestor only needs read-only info client (no wallet/key needed)
  // Each bot uses its own mirror wallet via ExchangeClientFactory in StrategyEngine
  const botIngestor = new BotIngestor(
    prisma,
    infoClient,
    config.bots,
    config.polling.botStateInterval
  );

  // Initialize strategy engine with new architecture
  const strategyEngine = new StrategyEngine(prisma, infoClient, exchangeClientFactory);

  // Import position sync
  const { PositionSync } = await import('./positionSync');
  const positionSync = new PositionSync(prisma, infoClient, strategyEngine, config.bots);

  // Sync current positions on startup (one-time sync)
  logger.info('Starting initial position synchronization...');
  try {
    await positionSync.syncAllPositions();
    logger.info('Initial position synchronization completed');
  } catch (error) {
    logger.error({ error }, 'Failed to sync initial positions, continuing anyway');
  }

  // Connect bot ingestor to strategy engine
  botIngestor.on('bot-trade', async (event) => {
    try {
      await strategyEngine.processBotTradeEvent(event);
    } catch (error) {
      logger.error({ error, eventId: event.id }, 'Error processing bot trade event');
    }
  });

  // Reconciler disabled - each mirror account handles its own reconciliation via ExchangeClientFactory

  // Start bot ingestor
  await botIngestor.start();

  // Start worker heartbeat
  const heartbeatInterval = parseInt(
    process.env.WORKER_HEARTBEAT_INTERVAL_MS || '30000',
    10
  );
  
  const heartbeatIntervalId = setInterval(async () => {
    try {
      const settings = await prisma.settings.findUnique({
        where: { id: 'default' },
      });
      
      await prisma.systemStatus.update({
        where: { id: 'default' },
        data: {
          updatedAt: new Date(),
          hyperliquidConnected: true,
          lastHyperliquidCheck: new Date(),
        },
      });
      
      logger.debug({ mode: settings?.mode }, 'Worker heartbeat');
    } catch (error) {
      logger.error({ error }, 'Failed to update worker heartbeat');
    }
  }, heartbeatInterval);

  logger.info('Worker started successfully');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down worker...');
    clearInterval(heartbeatIntervalId);
    botIngestor.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error in worker');
  process.exit(1);
});

