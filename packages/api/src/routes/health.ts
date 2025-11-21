import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';

const router = Router();

const HYPERLIQUID_INFO_URL =  process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info';

export function createHealthRouter(prisma: PrismaClient) {
  router.get('/api/health', async (req, res) => {
    const checks: any = {
      database: { status: 'error', latency: 0 },
      hyperliquid: { status: 'error', latency: 0, lastSuccessfulCall: null },
      worker: { status: 'error', lastSeenAt: null, mode: null },
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';

    // Check database connectivity
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      checks.database = { status: 'ok', latency: dbLatency };
    } catch (error) {
      checks.database = { status: 'error', latency: 0, error: error instanceof Error ? error.message : String(error) };
    }

    // Check Hyperliquid API reachability
    try {
      const hlStart = Date.now();
      const response = await fetch(HYPERLIQUID_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      const hlLatency = Date.now() - hlStart;
      
      if (response.ok) {
        checks.hyperliquid = {
          status: 'ok',
          latency: hlLatency,
          lastSuccessfulCall: Date.now(),
        };
      } else {
        checks.hyperliquid = {
          status: 'error',
          latency: hlLatency,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      checks.hyperliquid = {
        status: 'error',
        latency: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Check worker heartbeat from SystemStatus
    try {
      const systemStatus = await prisma.systemStatus.findUnique({
        where: { id: 'default' },
      });

      if (systemStatus) {
        const lastSeenAt = systemStatus.updatedAt?.getTime() || null;
        const heartbeatAge = lastSeenAt ? Date.now() - lastSeenAt : null;
        const heartbeatThreshold = 60000; // 60 seconds

        // Get current mode from Settings
        const settings = await prisma.settings.findUnique({
          where: { id: 'default' },
        });

        checks.worker = {
          status: heartbeatAge !== null && heartbeatAge < heartbeatThreshold ? 'ok' : 'error',
          lastSeenAt,
          heartbeatAge,
          mode: settings?.mode || null,
          killSwitch: systemStatus.killSwitch || false,
        };
      }
    } catch (error) {
      checks.worker = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Determine overall status
    const dbOk = checks.database.status === 'ok';
    const hlOk = checks.hyperliquid.status === 'ok';
    const workerOk = checks.worker.status === 'ok';
    const dbFast = checks.database.latency < 1000;
    const hlFast = checks.hyperliquid.latency < 5000; // More lenient for external API

    if (dbOk && hlOk && workerOk && dbFast && hlFast) {
      overallStatus = 'healthy';
    } else if (dbOk && (hlOk || workerOk)) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

    res.status(statusCode).json({
      status: overallStatus,
      checks,
      timestamp: Date.now(),
    });
  });

  return router;
}

