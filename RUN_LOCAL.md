# Running FadeArena Locally

Step-by-step guide to run FadeArena in simulation mode on your local machine.

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **PostgreSQL** >= 14 (or use Docker)

### Installing Prerequisites

**Node.js & pnpm:**
```bash
# Install Node.js from https://nodejs.org/
# Install pnpm
npm install -g pnpm
```

**PostgreSQL:**
- **Option 1: Local installation**
  - macOS: `brew install postgresql@15`
  - Ubuntu: `sudo apt install postgresql postgresql-contrib`
  - Windows: Download from https://www.postgresql.org/download/

- **Option 2: Docker** (Recommended for simplicity)
  ```bash
  docker run --name fadearena-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fadearena -p 5432:5432 -d postgres:15-alpine
  ```

## Step 1: Clone and Install

```bash
# Clone the repository (if not already done)
git clone <your-repo-url> fadearena
cd fadearena

# Install all dependencies
pnpm install
```

## Step 2: Configure Environment

### 2.1 Create .env File

```bash
cp .env.example .env
```

### 2.2 Edit .env File

Open `.env` and configure at minimum:

```env
# Database (adjust if using different PostgreSQL setup)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fadearena?schema=public

# Trading mode - MUST be "simulation" for local testing
FADEARENA_MODE=simulation

# Kill switch - set to false
FADEARENA_KILL_SWITCH=false

# Hyperliquid wallet (can be dummy values in simulation mode)
HYPERLIQUID_WALLET_ADDRESS=0x0000000000000000000000000000000000000000
HYPERLIQUID_WALLET_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# AI Bot Wallets (the wallets we're mirroring)
# Use BOT_* prefix for the new mirror account model
BOT_GEMINI_3_PRO=
BOT_GROK_4=
BOT_QWEN3_MAX=
BOT_KIMI_K2_THINKING=
BOT_DEEPSEEK_CHAT_V3_1=
BOT_CLAUDE_SONNET_4_5=

# Mirror Trading Wallets (our wallets that mirror each bot)
# In simulation mode, these can be dummy addresses
MY_GEMINI_FADE_WALLET=0x0000000000000000000000000000000000000000
MY_GROK_FADE_WALLET=0x0000000000000000000000000000000000000000
MY_QWEN_FADE_WALLET=0x0000000000000000000000000000000000000000
MY_KIMI_FADE_WALLET=0x0000000000000000000000000000000000000000
MY_DEEPSEEK_FADE_WALLET=0x0000000000000000000000000000000000000000
MY_CLAUDE_FADE_WALLET=0x0000000000000000000000000000000000000000

# Mirror Trading Wallet Private Keys (for signing orders)
# In simulation mode, these can be dummy keys
MY_GEMINI_FADE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
MY_GROK_FADE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
MY_QWEN_FADE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
MY_KIMI_FADE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
MY_DEEPSEEK_FADE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
MY_CLAUDE_FADE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
```

**Important Notes:**
- In simulation mode, you can use dummy wallet addresses and private keys
- The system will log simulated trades but won't place real orders
- For testing, you can leave bot wallets empty, but the system won't track any bots
- Each AI bot now has its own dedicated mirror trading wallet (one-to-one model)
- See `MIRROR_ACCOUNTS.md` for detailed information about the mirror account architecture

### 2.3 Frontend Environment (Optional)

If you need to override frontend API URLs:

```bash
cd apps/web
cp .env.local.example .env.local
# Edit .env.local if needed (defaults should work)
cd ../..
```

## Step 3: Setup Database

### 3.1 Start PostgreSQL

**If using Docker:**
```bash
docker start fadearena-db
# Or if not created yet:
docker run --name fadearena-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fadearena -p 5432:5432 -d postgres:15-alpine
```

**If using local PostgreSQL:**
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows: Start PostgreSQL service from Services
```

### 3.2 Create Database (if not exists)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE fadearena;

# Exit
\q
```

### 3.3 Run Migrations

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data (creates default settings)
pnpm db:seed
```

**Note:** If you need to reset the database:
```bash
pnpm db:reset
pnpm db:seed
```

## Step 4: Start All Services

### Option 1: Start All at Once (Recommended)

```bash
pnpm dev
```

This will start:
- **API server** on http://localhost:3001
- **Worker** (bot ingestor + strategy engine)
- **Frontend** on http://localhost:3000

### Option 2: Start Individually

```bash
# Terminal 1: API
pnpm dev:api

# Terminal 2: Worker
pnpm dev:worker

# Terminal 3: Frontend
pnpm dev:web
```

## Step 5: Verify Everything Works

### 5.1 Check Health Endpoint

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "checks": {
    "database": { "status": "ok", "latency": 5 },
    "hyperliquid": { "status": "ok" | "error", ... },
    "worker": { "status": "ok", "lastSeenAt": ..., "mode": "simulation" }
  }
}
```

### 5.2 Open Frontend

Open your browser: **http://localhost:3000**

You should see:
- Landing page with "Open Dashboard" button
- Dashboard with tabs: LIVE, MODELS, SETTINGS
- Header showing "SIMULATION" mode pill
- No red error banners

### 5.3 Check Dashboard Tabs

**LIVE Tab:**
- Equity chart (may be empty initially)
- Trade feed (may show "No trades available")

**MODELS Tab:**
- Bot table (may be empty if no bot wallets configured)

**SETTINGS Tab:**
- Mode: Should show "Simulation"
- Bot configurations
- Risk limits

## Step 6: Verify Worker Heartbeat

The worker should be updating SystemStatus every 30 seconds. Check:

```bash
# Via health endpoint
curl http://localhost:3001/api/health | jq '.checks.worker'

# Or check logs
# Worker logs should show periodic heartbeat messages
```

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
# View all logs (if using individual terminals)
# Or check package-specific logs
```

**Common issues:**
1. **Port already in use:**
   - Change `PORT` in `.env` for API
   - Change port in `apps/web/package.json` for frontend

2. **Database connection failed:**
   - Verify PostgreSQL is running
   - Check `DATABASE_URL` in `.env`
   - Test connection: `psql $DATABASE_URL`

3. **Prisma client not generated:**
   ```bash
   pnpm db:generate
   ```

### Frontend Can't Connect to API

1. **Check API is running:**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Verify CORS:**
   - API should have CORS enabled (already configured)
   - Check browser console for CORS errors

3. **Check environment variables:**
   - Verify `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env` or `apps/web/.env.local`

### Worker Not Updating

1. **Check worker logs** for errors
2. **Verify database connection** in worker
3. **Check bot wallets** are configured (at least one)
4. **Verify Hyperliquid API** is reachable

### Empty Data in UI

This is normal if:
- No bot wallets are configured
- System just started (no trades yet)
- In simulation mode with no bot activity

To see data:
1. Configure at least one bot wallet address
2. Wait for worker to poll and detect activity
3. Or manually trigger events (advanced)

## Switching to Live Mode

⚠️ **WARNING: Live mode places REAL orders with REAL money!**

**DO NOT switch to live mode until:**
1. You've thoroughly tested in simulation mode
2. You've configured real Hyperliquid wallet credentials
3. You understand the risks
4. You've set appropriate risk limits

**To switch to live mode:**

1. **Update .env:**
   ```env
   FADEARENA_MODE=live
   
   # Configure bot wallets (AI trading bots you're mirroring)
   BOT_GEMINI_3_PRO=0x...
   BOT_GROK_4=0x...
   # ... etc
   
   # Configure your mirror trading wallets
   MY_GEMINI_FADE_WALLET=0x... # Your real mirror wallet for Gemini
   MY_GROK_FADE_WALLET=0x...   # Your real mirror wallet for Grok
   # ... etc
   
   # Configure private keys for signing orders
   MY_GEMINI_FADE_PRIVATE_KEY=0x... # Private key for MY_GEMINI_FADE_WALLET
   MY_GROK_FADE_PRIVATE_KEY=0x...   # Private key for MY_GROK_FADE_WALLET
   # ... etc
   ```
   
   **Note**: Each AI bot now requires its own dedicated mirror wallet and private key. See `MIRROR_ACCOUNTS.md` for details.

2. **Update database settings:**
   - Via UI: Go to Settings tab → Change mode to "Live" → Save
   - Or via API: `POST /api/settings` with `{ "mode": "live" }`

3. **Restart services:**
   ```bash
   # Stop current services (Ctrl+C)
   # Restart
   pnpm dev
   ```

4. **Monitor closely:**
   - Watch logs for order placements
   - Monitor health endpoint
   - Check Hyperliquid for actual orders

## Using Docker Compose (Alternative)

If you prefer Docker for local development:

```bash
# Copy .env.example to .env and configure
cp .env.example .env

# Start all services
docker-compose up

# Or in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

See `DEPLOYMENT_RUNBOOK.md` for more Docker details.

## Next Steps

Once everything is running:

1. **Explore the UI** - Check all tabs and features
2. **Review logs** - Understand what the system is doing
3. **Configure bots** - Add real bot wallet addresses (if available)
4. **Test settings** - Try changing risk limits, leverage, etc.
5. **Monitor health** - Keep an eye on `/api/health`

## Quick Reference

```bash
# Start everything
pnpm dev

# Database operations
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed initial data
pnpm db:reset       # Reset database (WARNING: deletes data)

# Individual services
pnpm dev:api        # API only
pnpm dev:worker    # Worker only
pnpm dev:web        # Frontend only

# Health check
curl http://localhost:3001/api/health

# Frontend
open http://localhost:3000
```

## Support

If you encounter issues:
1. Check logs for error messages
2. Verify all prerequisites are installed
3. Ensure database is running and accessible
4. Check environment variables are correct
5. Review this guide and `DEPLOYMENT_RUNBOOK.md`

