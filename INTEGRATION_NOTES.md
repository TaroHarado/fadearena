# FadeArena Integration Notes

This document describes the changes made to wire everything together for local development.

## Changes Made

### 1. Root Package.json Scripts

**Updated `package.json` scripts:**
- `dev`: Changed from `&` (background) to `--parallel` flag for proper parallel execution
- `dev:api`, `dev:worker`, `dev:web`: Updated to use package names with `@fadearena/` prefix
- `db:migrate`: Uses `@fadearena/shared` filter
- `db:reset`: Added new script for database reset

**Note:** The `--parallel` flag in pnpm allows all three services to run concurrently and show logs together.

### 2. Environment Variables

**Created `.env.example`:**
- Complete template with all required variables
- Defaults to simulation mode
- Includes dummy wallet addresses for testing
- Documents all bot wallet addresses

**Created `apps/web/.env.local.example`:**
- Frontend-specific environment variables
- API and WebSocket URLs

### 3. Database Seeding

**Updated `packages/shared/prisma/seed.ts`:**
- Now reads `FADEARENA_MODE` from environment when creating settings
- Reads `FADEARENA_KILL_SWITCH` from environment when creating system status
- Defaults to simulation mode if not set

### 4. Simulation Mode Enforcement

**Verified in `packages/worker/src/strategyEngine.ts`:**
- Line 151: Checks `settings.mode === 'live'` before placing real orders
- Line 154: Logs simulation when mode is not live or kill switch is active
- Line 244: Sets `simulated: true` flag in order results

**Settings are read from database:**
- `packages/api/src/routes/settings.ts`: Reads mode from DB
- `packages/worker/src/strategyEngine.ts`: Reads settings from DB with caching

### 5. Port Configuration

**API Server:**
- Default port: 3001 (from `PORT` env or config)
- WebSocket: Port 3001 + 1 = 3002
- Both configured in `packages/api/src/index.ts`

**Frontend:**
- Default port: 3000 (Next.js default)
- API URL: `NEXT_PUBLIC_API_URL` (defaults to http://localhost:3001)
- WebSocket URL: `NEXT_PUBLIC_WS_URL` (defaults to ws://localhost:3002/ws)

### 6. Frontend Integration

**All hooks use environment variables:**
- `apps/web/hooks/*.ts`: All use `process.env.NEXT_PUBLIC_API_URL`
- No hardcoded localhost URLs (except as fallback defaults)

**WebSocket integration:**
- `apps/web/hooks/useLiveEvents.ts`: Uses `NEXT_PUBLIC_WS_URL`
- Connects to `ws://localhost:3002/ws` by default
- Handles reconnection automatically

**No mock data in production:**
- `apps/web/lib/mockData.ts` exists but is not imported anywhere
- All hooks call real API endpoints
- Empty states handled in UI components

### 7. Worker Heartbeat

**Implemented in `packages/worker/src/index.ts`:**
- Updates `SystemStatus.updatedAt` every 30 seconds (configurable via `WORKER_HEARTBEAT_INTERVAL_MS`)
- Health endpoint checks if heartbeat is within 60 seconds

**Health endpoint (`packages/api/src/routes/health.ts`):**
- Checks database connectivity
- Checks Hyperliquid API reachability (actual ping)
- Checks worker heartbeat (last seen within 60s)
- Returns overall status: healthy/degraded/unhealthy

### 8. Prisma Configuration

**Schema location:**
- `packages/shared/prisma/schema.prisma`
- Both API and worker import PrismaClient from `@fadearena/shared`

**Client generation:**
- Script: `pnpm --filter @fadearena/shared db:generate`
- Generates client in `packages/shared/node_modules/.prisma/client`
- Both API and worker use the same client instance

### 9. TypeScript Configuration

**All packages use consistent TypeScript settings:**
- `packages/shared/tsconfig.json`: Base config
- `packages/api/tsconfig.json`: Extends base
- `packages/worker/tsconfig.json`: Extends base
- `apps/web/tsconfig.json`: Next.js specific

**Path aliases:**
- Frontend uses `@/*` for app directory
- All packages use workspace protocol (`workspace:*`)

## Known Issues / TODOs

### 1. Hyperliquid Signing

The signing mechanism in `packages/worker/src/hyperliquidClient.ts` uses ethers.js as a placeholder. For production:
- Implement Hyperliquid's specific signing scheme
- Or use their official SDK if available

### 2. Bot Wallet Addresses

For local testing in simulation mode:
- Can use dummy addresses (0x0000...)
- System will work but won't track real bots
- To see real activity, configure actual bot wallet addresses

### 3. Empty States

The UI shows empty states when:
- No bot wallets configured
- No trades yet
- System just started

This is expected behavior. Configure bot wallets to see activity.

### 4. WebSocket Reconnection

Frontend WebSocket reconnects automatically, but:
- May show connection errors in console initially
- Reconnection happens after 5 seconds
- This is normal behavior

## Testing Checklist

After running `pnpm dev`, verify:

- [ ] API starts on http://localhost:3001
- [ ] Worker starts and shows logs
- [ ] Frontend starts on http://localhost:3000
- [ ] Health endpoint returns status: `curl http://localhost:3001/api/health`
- [ ] Frontend loads without errors
- [ ] Mode pill shows "SIMULATION"
- [ ] No red error banners
- [ ] Worker heartbeat updates (check health endpoint)
- [ ] WebSocket connects (check browser console)

## File Structure

```
.
├── package.json              # Root scripts
├── pnpm-workspace.yaml      # Workspace config
├── .env.example             # Environment template
├── RUN_LOCAL.md             # Local run guide
├── INTEGRATION_NOTES.md     # This file
├── packages/
│   ├── shared/              # Types, Prisma, config
│   ├── api/                 # REST API + WebSocket
│   └── worker/              # Bot ingestor + strategy
└── apps/
    └── web/                  # Next.js frontend
```

## Quick Start Summary

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env
# Edit .env with DATABASE_URL

# 3. Database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Run
pnpm dev

# 5. Verify
curl http://localhost:3001/api/health
open http://localhost:3000
```

## Next Steps

1. **Test locally** - Follow RUN_LOCAL.md
2. **Configure bots** - Add real bot wallet addresses
3. **Monitor** - Watch logs and health endpoint
4. **Customize** - Adjust risk limits and settings
5. **Deploy** - When ready, follow DEPLOYMENT_RUNBOOK.md

