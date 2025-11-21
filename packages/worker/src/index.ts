/**
 * Worker Entry Point
 * 
 * Orchestrates bot-ingestor, strategy-engine, and reconciler
 */

import pino from 'pino';
import { PrismaClient, loadConfig } from '@fadearena/shared';
import { HyperliquidInfoClient, HyperliquidClient } from './hyperliquidClient';
import { ExchangeClientFactory } from './exchangeClientFactory';
import { BotIngestor } from './botIngestor';
import { StrategyEngine } from './strategyEngine';
import { Reconciler } from './reconciler';

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

  // Load configuration
  const config = loadConfig();

  // Initialize Prisma
  const prisma = new PrismaClient();

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

  // Initialize legacy Hyperliquid client (for backward compatibility with BotIngestor and Reconciler)
  // TODO: Refactor BotIngestor and Reconciler to use the new architecture
  const hyperliquid = new HyperliquidClient(
    config.hyperliquid.infoUrl,
    config.hyperliquid.exchangeUrl,
    config.hyperliquid.walletAddress,
    config.hyperliquid.privateKey
  );
  await hyperliquid.initialize();

  // Initialize bot ingestor
  const botIngestor = new BotIngestor(
    prisma,
    hyperliquid,
    config.bots,
    config.polling.botStateInterval
  );

  // Initialize strategy engine with new architecture
  const strategyEngine = new StrategyEngine(prisma, infoClient, exchangeClientFactory);

  // Connect bot ingestor to strategy engine
  botIngestor.on('bot-trade', async (event) => {
    try {
      await strategyEngine.processBotTradeEvent(event);
    } catch (error) {
      logger.error({ error, eventId: event.id }, 'Error processing bot trade event');
    }
  });

  // Initialize reconciler
  const reconciler = new Reconciler(
    prisma,
    hyperliquid,
    config.hyperliquid.walletAddress,
    config.polling.reconciliationInterval
  );

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
    reconciler.stop();
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

