# Fly.io Setup Summary

This document summarizes the Fly.io deployment configuration added to the FadeArena repository.

## Files Added

### Configuration Files

1. **`packages/api/fly.toml`**
   - Fly.io configuration for the API service
   - Configures HTTP service on port 3001
   - Sets up health checks
   - Region: Frankfurt (fra)
   - App name: `fadearena-api`

2. **`packages/worker/fly.toml`**
   - Fly.io configuration for the Worker service
   - No HTTP service (background worker)
   - Region: Frankfurt (fra)
   - App name: `fadearena-worker`

### Documentation Files

3. **`FLY_ENV_VARS.md`**
   - Complete reference of all environment variables
   - Required vs optional variables
   - Security best practices
   - Examples for setting secrets
   - Instructions for switching to live mode

4. **`FLY_DEPLOYMENT.md`**
   - Step-by-step deployment guide for Windows/PowerShell
   - Detailed instructions for:
     - Installing flyctl
     - Creating Postgres database
     - Setting up API app
     - Setting up Worker app
     - Running migrations and seeding
     - Testing and monitoring
     - Switching to live mode
   - Troubleshooting section
   - Quick reference commands

5. **`FLY_SETUP_SUMMARY.md`** (this file)
   - Overview of all changes
   - Quick reference for developers

## Key Features

### Safety Defaults

- **Simulation Mode by Default**: All examples and documentation default to `FADEARENA_MODE=simulation`
- **Clear Warnings**: Multiple warnings about switching to live mode
- **Code Protection**: The code checks `settings.mode === 'live'` before executing real orders (see `packages/worker/src/strategyEngine.ts:186`)

### Architecture

- **Shared Database**: Both API and Worker use the same Postgres database (`fadearena-db`)
- **Separate Apps**: API and Worker are deployed as separate Fly.io apps
- **No Public HTTP for Worker**: Worker runs as a background service without public endpoints
- **Health Checks**: API has HTTP health checks, Worker uses process health checks

### Environment Variables

All environment variables are documented in `FLY_ENV_VARS.md`. Key categories:

- **Core**: `FADEARENA_MODE`, `FADEARENA_KILL_SWITCH`
- **Database**: `DATABASE_URL` (auto-set by `fly postgres attach`)
- **Bot Wallets**: `BOT_*` variables for AI bot addresses
- **Mirror Wallets**: `MY_*_FADE_WALLET` for your mirror trading wallets
- **Private Keys**: `MY_*_FADE_PRIVATE_KEY` (only needed in live mode)
- **Optional**: Risk limits, polling intervals, etc.

## Deployment Workflow

1. **Initial Setup** (one-time):
   - Install flyctl
   - Authenticate with Fly.io
   - Create Postgres database
   - Initialize API and Worker apps
   - Attach database to both apps

2. **Configuration**:
   - Set environment variables (secrets) for both apps
   - Start with simulation mode
   - Use placeholder wallet addresses

3. **Deployment**:
   - Deploy API app
   - Deploy Worker app
   - Run database migrations
   - Seed initial data

4. **Testing**:
   - Verify API health endpoint
   - Check API and Worker logs
   - Test API endpoints
   - Monitor for errors

5. **Production** (after testing):
   - Update mirror wallet addresses
   - Add real private keys
   - Switch to live mode
   - Monitor closely

## Code Safety Checks

The codebase includes multiple safety checks to prevent accidental live trading:

1. **Strategy Engine** (`packages/worker/src/strategyEngine.ts:186`):
   ```typescript
   if (settings.mode === 'live' && !systemStatus?.killSwitch) {
     await this.executeOrder(decision, correlationId, mirrorAccount.id);
   } else {
     await this.simulateOrder(decision, mirrorAccount.id);
   }
   ```

2. **Exchange Client Factory** (`packages/worker/src/exchangeClientFactory.ts:59`):
   - Creates clients with dummy keys in simulation mode
   - Only uses real private keys in live mode

3. **Worker Initialization** (`packages/worker/src/index.ts:42`):
   - Checks database settings to determine simulation mode
   - Defaults to simulation if settings not found

## File Locations

```
fadearena/
├── packages/
│   ├── api/
│   │   └── fly.toml              # API Fly.io config
│   └── worker/
│       └── fly.toml              # Worker Fly.io config
├── FLY_ENV_VARS.md               # Environment variables reference
├── FLY_DEPLOYMENT.md              # Deployment guide
└── FLY_SETUP_SUMMARY.md          # This file
```

## Quick Start

1. Read `FLY_DEPLOYMENT.md` for detailed instructions
2. Follow the step-by-step guide
3. **Important**: Deploy from repository root using `--config` flag:
   - `fly deploy --app fadearena-api --config packages/api/fly.toml`
   - `fly deploy --app fadearena-worker --config packages/worker/fly.toml`
4. Start with simulation mode
5. Test thoroughly before switching to live

## Important Notes

- **Never commit private keys** - Always use `fly secrets set`
- **Start in simulation mode** - Test before going live
- **Monitor logs** - Watch for errors after deployment
- **Database migrations** - Run after first deployment
- **Seed data** - Required for mirror accounts to work

## Next Steps

1. Review `FLY_DEPLOYMENT.md`
2. Follow the deployment guide
3. Test in simulation mode
4. Add real credentials when ready
5. Switch to live mode (carefully!)

## Support

- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- FadeArena Docs: See `MIRROR_ACCOUNTS.md` for architecture details

