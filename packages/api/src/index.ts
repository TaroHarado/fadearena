/**
 * Core API Server
 * 
 * Express HTTP server + WebSocket server for frontend
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';

// Находим корень проекта (где находится .env)
// .env находится в корне проекта, а мы в packages/api/src
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });
console.log(`[DEBUG] Loading .env from: ${envPath}`);
console.log(`[DEBUG] MY_GEMINI_FADE_WALLET: ${process.env.MY_GEMINI_FADE_WALLET ? 'SET (' + process.env.MY_GEMINI_FADE_WALLET.substring(0, 20) + '...)' : 'NOT SET'}`);

import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { PrismaClient, loadConfig } from '@fadearena/shared';
import { createStateRouter } from './routes/state';
import { createModelsRouter } from './routes/models';
import { createTradesRouter } from './routes/trades';
import { createEquityRouter } from './routes/equity';
import { createFaderEquityRouter } from './routes/faderEquity';
import { createAssetPricesRouter } from './routes/assetPrices';
import { createPositionsRouter } from './routes/positions';
import { createSettingsRouter } from './routes/settings';
import { createKillSwitchRouter } from './routes/killSwitch';
import { createHealthRouter } from './routes/health';
import { WSServer } from './websocket';

const logger = pino({
  name: 'API',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

async function main() {
  logger.info('Starting FadeArena API server...');

  try {
    // Load configuration
    logger.info('Loading configuration...');
    const config = loadConfig();
    logger.info({ port: config.server.port, host: config.server.host }, 'Configuration loaded');

    // Initialize Prisma
    logger.info('Initializing Prisma...');
    
    // Try to apply pending migrations automatically (if database is not locked)
    try {
      const { execSync } = require('child_process');
      const path = require('path');
      const sharedPath = path.resolve(__dirname, '../../shared');
      logger.info('Checking for pending migrations...');
      execSync('npx prisma migrate deploy', {
        cwd: sharedPath,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./packages/shared/prisma/dev.db' },
      });
      logger.info('Migrations applied (if any)');
    } catch (error) {
      // Ignore migration errors (database might be locked or migrations already applied)
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('locked')) {
        logger.warn('Database is locked, migrations will be applied on next restart');
      } else {
        logger.warn({ error: errorMsg }, 'Migration check failed, continuing...');
      }
    }
    
    const prisma = new PrismaClient();
    
    // Try to create asset_price_snapshots table if it doesn't exist (fallback)
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "asset_price_snapshots" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "timestamp" DATETIME NOT NULL,
          "data" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "asset_price_snapshots_timestamp_idx" ON "asset_price_snapshots"("timestamp");
      `);
      logger.info('Asset price snapshots table ensured');
    } catch (error) {
      // Table might already exist or database locked
      logger.debug({ error: error instanceof Error ? error.message : String(error) }, 'Table creation check');
    }
    
    logger.info('Prisma initialized');

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  // Root route - для проверки что API работает
  app.get('/', (req, res) => {
    res.json({
      service: 'FadeArena API',
      status: 'running',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        models: '/api/models',
        state: '/api/state',
        trades: '/api/trades',
        equity: '/api/equity',
        faderEquity: '/api/fader-equity',
        positions: '/api/positions',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Routes
  logger.info('Registering routes...');
  try {
    app.use(createStateRouter(prisma));
    logger.info('✓ State router registered');
    app.use(createModelsRouter(prisma));
    logger.info('✓ Models router registered');
    app.use(createTradesRouter(prisma));
    logger.info('✓ Trades router registered');
    app.use(createEquityRouter(prisma));
    logger.info('✓ Equity router registered');
    app.use(createFaderEquityRouter(prisma));
    logger.info('✓ FaderEquity router registered');
    app.use(createAssetPricesRouter(prisma));
    logger.info('✓ AssetPrices router registered');
    app.use(createPositionsRouter());
    logger.info('✓ Positions router registered');
    app.use(createSettingsRouter(prisma));
    logger.info('✓ Settings router registered');
    app.use(createKillSwitchRouter(prisma));
    logger.info('✓ KillSwitch router registered');
    app.use(createHealthRouter(prisma));
    logger.info('✓ Health router registered');
    logger.info('All routes registered successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to register routes');
    throw error;
  }

  // Start HTTP server
  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info({ port: config.server.port, host: config.server.host }, 'HTTP server started');
  });

  // Start fader equity collection (каждые 15 секунд)
  logger.info('Starting fader equity collection...');
  const faderEquityModule = await import('./routes/faderEquity');
  
  // Первый сбор сразу после запуска
  faderEquityModule.collectFaderEquity(prisma).catch(err => {
    logger.error({ error: err }, 'Error in initial fader equity collection');
  });
  
  const faderEquityIntervalId = setInterval(async () => {
    try {
      await faderEquityModule.collectFaderEquity(prisma);
    } catch (error) {
      logger.error({ error }, 'Error collecting fader equity snapshot');
    }
  }, 15_000); // 15 секунд

  // Start asset prices collection (каждые 15 секунд)
  logger.info('Starting asset prices collection...');
  const assetPricesModule = await import('./routes/assetPrices');
  
  // Первый сбор сразу после запуска
  assetPricesModule.collectAssetPrices(prisma).catch(err => {
    logger.error({ error: err }, 'Error in initial asset prices collection');
  });
  
  const assetPricesIntervalId = setInterval(async () => {
    try {
      await assetPricesModule.collectAssetPrices(prisma);
    } catch (error) {
      logger.error({ error }, 'Error collecting asset prices snapshot');
    }
  }, 15_000); // 15 секунд

    // Start WebSocket server (опционально, если порт свободен)
    logger.info('Starting WebSocket server...');
    let wsServer: WSServer | null = null;
    try {
      wsServer = new WSServer(config.server.port + 1); // Use next port
      logger.info('WebSocket server started');
    } catch (error) {
      logger.warn({ error }, 'WebSocket server failed to start, continuing without it');
    }

    // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down API server...');
    clearInterval(faderEquityIntervalId);
    clearInterval(assetPricesIntervalId);
    if (wsServer) {
      wsServer.close();
    }
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down API server...');
    clearInterval(faderEquityIntervalId);
    clearInterval(assetPricesIntervalId);
    if (wsServer) {
      wsServer.close();
    }
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  });
  } catch (error) {
    logger.error({ error, stack: error instanceof Error ? error.stack : undefined }, 'Error during API server initialization');
    throw error;
  }
}

main().catch((error) => {
  logger.error({ 
    error, 
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined 
  }, 'Fatal error in API server');
  process.exit(1);
});

