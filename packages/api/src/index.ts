/**
 * Core API Server
 * 
 * Express HTTP server + WebSocket server for frontend
 */

import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { PrismaClient, loadConfig } from '@fadearena/shared';
import { createStateRouter } from './routes/state';
import { createModelsRouter } from './routes/models';
import { createTradesRouter } from './routes/trades';
import { createEquityRouter } from './routes/equity';
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

  // Load configuration
  const config = loadConfig();

  // Initialize Prisma
  const prisma = new PrismaClient();

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  // Routes
  app.use(createStateRouter(prisma));
  app.use(createModelsRouter(prisma));
  app.use(createTradesRouter(prisma));
  app.use(createEquityRouter(prisma));
  app.use(createSettingsRouter(prisma));
  app.use(createKillSwitchRouter(prisma));
  app.use(createHealthRouter(prisma));

  // Start HTTP server
  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info({ port: config.server.port, host: config.server.host }, 'HTTP server started');
  });

  // Start WebSocket server
  const wsServer = new WSServer(config.server.port + 1); // Use next port

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down API server...');
    wsServer.close();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down API server...');
    wsServer.close();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error in API server');
  process.exit(1);
});

