# Fly.io Deployment Guide for FadeArena

This guide provides step-by-step instructions for deploying FadeArena backend (API + Worker) to Fly.io on Windows using PowerShell.

**⚠️ IMPORTANT**: This guide assumes you will deploy in **simulation mode** first. Real private keys should only be added after thorough testing.

## Prerequisites

- Windows 10/11 with PowerShell
- A Fly.io account (sign up at https://fly.io)
- Git (for cloning the repository if needed)
- Docker Desktop (для локальной сборки с флагом `--local-only`)

## Docker Build Architecture

**Важно понимать структуру Docker build для этого проекта:**

1. **Build Context**: Корень репозитория (где находится `package.json`)
   - Это позволяет Dockerfile видеть всю структуру монорепозитория
   - Команда `flyctl deploy` должна запускаться из корня репозитория

2. **Dockerfile Location**: `packages/api/Dockerfile`
   - Указан в `packages/api/fly.toml` как `dockerfile = 'packages/api/Dockerfile'`
   - Путь относительно build context (корня репозитория)

3. **Node Modules**: 
   - **НЕ копируются с хоста** - все `node_modules` игнорируются через `.dockerignore`
   - Все зависимости устанавливаются внутри контейнера через `pnpm install`
   - Это гарантирует, что сборка не зависит от состояния host `node_modules`

4. **Prisma Client**:
   - **Генерируется внутри контейнера** из `packages/shared/prisma/schema.prisma`
   - НЕ копируется из host `node_modules/@prisma/client`
   - Генерация происходит на стадии `builder` перед сборкой TypeScript

5. **Multi-stage Build**:
   - `deps`: Установка всех зависимостей (включая dev)
   - `builder`: Генерация Prisma client, сборка TypeScript
   - `runner`: Только production зависимости и собранные файлы

Если вы видите ошибки типа `invalid file request packages/shared/node_modules/@prisma/client`, это означает, что Docker пытается скопировать host `node_modules`. Убедитесь, что:
- `.dockerignore` в корне репозитория содержит `**/node_modules`
- Вы запускаете `flyctl deploy` из корня репозитория
- Используете флаг `--local-only` для локальной сборки

## Step 1: Install flyctl

Open PowerShell and run:

```powershell
# Install flyctl
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Verify installation
fly --version
```

You should see the flyctl version number. If you get an error, you may need to restart PowerShell or add flyctl to your PATH.

## Step 2: Authenticate with Fly.io

```powershell
# Login to Fly.io (will open browser for authentication)
fly auth login
```

Follow the prompts in your browser to complete authentication.

## Step 3: Create Postgres Database

We'll create a shared Postgres database that both the API and Worker will use.

```powershell
# Create Postgres cluster named fadearena-db in Frankfurt region
fly postgres create --name fadearena-db --region fra --volume-size 10
```

**What this does:**
- Creates a new Postgres database cluster named `fadearena-db`
- Places it in the Frankfurt (`fra`) region
- Allocates 10GB of storage
- This database will be shared by both `fadearena-api` and `fadearena-worker`

**Note**: The command will output connection details. You don't need to save these - Fly.io will automatically set `DATABASE_URL` when we attach the database to apps.

## Step 4: Set Up the API App

### 4.1 Navigate to Repository Root

```powershell
# Make sure you're in the repository root (where package.json is)
# The Dockerfile expects to build from the repo root for monorepo support
cd C:\Users\anton\Music\1fadearena.com
# Or wherever your repo is located
```

### 4.2 Initialize Fly.io App (Without Deploying)

```powershell
# Initialize the app from repo root (build context должен быть корень репозитория)
# Убедитесь, что вы находитесь в корне репозитория
cd C:\Users\anton\Music\1fadearena.com
fly launch --name fadearena-api --region fra --no-deploy --config packages\api\fly.toml
```

**What to do when prompted:**
- **"Would you like to copy its configuration to the new app?"** → Type `y` (to use our fly.toml)
- **"Would you like to set up a Postgres database now?"** → Type `n` (we already created one)
- **"Would you like to set up an Upstash Redis database now?"** → Type `n`
- **"Would you like to deploy now?"** → This won't be asked because we used `--no-deploy`

**Note**: 
- Docker build context - это корень репозитория (где находится `package.json`)
- Dockerfile находится в `packages/api/Dockerfile` и настроен для работы с контекстом корня
- Все `node_modules` игнорируются через `.dockerignore` - зависимости устанавливаются внутри контейнера
- Prisma client генерируется внутри контейнера, не копируется с хоста

### 4.3 Attach Postgres Database

```powershell
# Attach the database we created earlier
fly postgres attach fadearena-db --app fadearena-api
```

**What this does:**
- Attaches the `fadearena-db` database to the `fadearena-api` app
- Automatically sets `DATABASE_URL` as a secret
- The API can now connect to the database

### 4.4 Set Environment Variables (Secrets)

Set the required environment variables. **Start with simulation mode:**

```powershell
# Set core configuration (SIMULATION MODE)
fly secrets set FADEARENA_MODE=simulation --app fadearena-api
fly secrets set FADEARENA_KILL_SWITCH=false --app fadearena-api

# Set AI bot wallet addresses (replace with real addresses)
fly secrets set BOT_GEMINI_3_PRO=0x1234567890123456789012345678901234567890 --app fadearena-api
fly secrets set BOT_GROK_4=0x2345678901234567890123456789012345678901 --app fadearena-api
# Add more BOT_* variables as needed

# Set mirror wallet addresses (use placeholders for simulation)
fly secrets set MY_GEMINI_FADE_WALLET=0x0000000000000000000000000000000000000000 --app fadearena-api
fly secrets set MY_GROK_FADE_WALLET=0x0000000000000000000000000000000000000000 --app fadearena-api
# Add more MY_*_FADE_WALLET variables as needed

# Optional: Set polling intervals
fly secrets set BOT_STATE_INTERVAL_MS=5000 --app fadearena-api
fly secrets set RECONCILIATION_INTERVAL_MS=60000 --app fadearena-api
```

**Note**: You can set multiple secrets at once:

```powershell
fly secrets set `
  FADEARENA_MODE=simulation `
  FADEARENA_KILL_SWITCH=false `
  BOT_GEMINI_3_PRO=0x1234567890123456789012345678901234567890 `
  MY_GEMINI_FADE_WALLET=0x0000000000000000000000000000000000000000 `
  --app fadearena-api
```

**⚠️ DO NOT set private keys (`MY_*_FADE_PRIVATE_KEY`) yet. We'll add those later after testing.**

### 4.5 Deploy the API

```powershell
# Deploy the API app from repo root (Dockerfile expects repo root as build context)
cd ..\..  # Go back to repo root
fly deploy --app fadearena-api --config packages\api\fly.toml --local-only
```

**Note**: 
- Мы деплоим из корня репозитория, потому что Docker build context - это корень репозитория
- Dockerfile находится в `packages/api/Dockerfile`, но он настроен для работы с контекстом корня
- Флаг `--local-only` указывает flyctl использовать локальный Docker для сборки
- **ВАЖНО**: Docker build НЕ использует host `node_modules` - все зависимости устанавливаются внутри контейнера
- Prisma client генерируется внутри контейнера из `packages/shared/prisma/schema.prisma`
- Все `node_modules` игнорируются через `.dockerignore` на корневом уровне

This will:
- Build the Docker image using the Dockerfile
- Push it to Fly.io
- Deploy and start the API service
- Take a few minutes the first time

### 4.6 Test the API

```powershell
# Check logs to see if API started successfully
fly logs -a fadearena-api

# Get the API URL
fly status -a fadearena-api

# Test health endpoint (replace <app-name> with your actual app name)
curl https://fadearena-api.fly.dev/api/health
```

**Expected output from health endpoint:**
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok" },
    "hyperliquid": { "status": "ok" },
    "worker": { "status": "ok" }
  }
}
```

If you see errors in the logs, check:
- Database connection (should be automatic after `fly postgres attach`)
- Environment variables are set correctly
- The app is running: `fly status -a fadearena-api`

## Step 5: Set Up the Worker App

### 5.1 Navigate to Worker Directory

```powershell
# Navigate to the worker package directory (from API directory)
cd ..\worker
# Or from repo root:
cd packages\worker
```

### 5.2 Initialize Fly.io App (Without Deploying)

```powershell
# Initialize the worker app from packages/worker directory
fly launch --name fadearena-worker --region fra --no-deploy
```

**What to do when prompted:**
- **"Would you like to copy its configuration to the new app?"** → Type `y` (to use our fly.toml)
- **"Would you like to set up a Postgres database now?"** → Type `n` (we already created one)
- **"Would you like to set up an Upstash Redis database now?"** → Type `n`

**Note**: The fly.toml in `packages/worker` is configured to build from the repo root, so the build will use the repo root as context.

### 5.3 Attach Postgres Database

```powershell
# Attach the same database to the worker
fly postgres attach fadearena-db --app fadearena-worker
```

**What this does:**
- Attaches the same `fadearena-db` database to the `fadearena-worker` app
- Both API and Worker now share the same database
- `DATABASE_URL` is automatically set

### 5.4 Set Environment Variables (Secrets)

Set the same environment variables as the API:

```powershell
# Set core configuration (SIMULATION MODE)
fly secrets set FADEARENA_MODE=simulation --app fadearena-worker
fly secrets set FADEARENA_KILL_SWITCH=false --app fadearena-worker

# Set AI bot wallet addresses (same as API)
fly secrets set BOT_GEMINI_3_PRO=0x1234567890123456789012345678901234567890 --app fadearena-worker
fly secrets set BOT_GROK_4=0x2345678901234567890123456789012345678901 --app fadearena-worker

# Set mirror wallet addresses (same as API)
fly secrets set MY_GEMINI_FADE_WALLET=0x0000000000000000000000000000000000000000 --app fadearena-worker
fly secrets set MY_GROK_FADE_WALLET=0x0000000000000000000000000000000000000000 --app fadearena-worker

# Optional: Set polling intervals
fly secrets set BOT_STATE_INTERVAL_MS=5000 --app fadearena-worker
fly secrets set RECONCILIATION_INTERVAL_MS=60000 --app fadearena-worker
fly secrets set WORKER_HEARTBEAT_INTERVAL_MS=30000 --app fadearena-worker
```

**⚠️ DO NOT set private keys yet.**

### 5.5 Deploy the Worker

```powershell
# Deploy the worker app from repo root (Dockerfile expects repo root as build context)
cd ..\..  # Go back to repo root if not already there
fly deploy --app fadearena-worker --config packages\worker\fly.toml --local-only
```

**Note**: 
- Мы деплоим из корня репозитория, потому что Docker build context - это корень репозитория
- Dockerfile находится в `packages/worker/Dockerfile`, но он настроен для работы с контекстом корня
- Флаг `--local-only` указывает flyctl использовать локальный Docker для сборки
- **ВАЖНО**: Docker build НЕ использует host `node_modules` - все зависимости устанавливаются внутри контейнера
- Prisma client генерируется внутри контейнера из `packages/shared/prisma/schema.prisma`

### 5.6 Test the Worker

```powershell
# Check logs to see if worker started successfully
fly logs -a fadearena-worker
```

**Expected logs:**
- "Starting FadeArena worker..."
- "Hyperliquid client initialized"
- Periodic heartbeat messages
- No HTTP-related errors (worker doesn't expose HTTP)

**Note**: The worker doesn't have a public HTTP endpoint. You can only monitor it via logs.

## Step 6: Run Database Migrations

After both apps are deployed, you need to run database migrations to set up the schema:

```powershell
# Option 1: Run migrations via API (if you have a migration endpoint)
# This would require adding a migration script to the API

# Option 2: Run migrations manually via fly ssh
fly ssh console -a fadearena-api

# Inside the console:
cd /app/packages/shared
npx prisma migrate deploy
exit
```

**Or use fly ssh to run the command directly:**

```powershell
fly ssh console -a fadearena-api -C "cd /app/packages/shared && npx prisma migrate deploy"
```

## Step 7: Seed Initial Data

Seed the database with initial settings and mirror accounts:

```powershell
# Run seed script via fly ssh
fly ssh console -a fadearena-api -C "cd /app/packages/shared && npx prisma db seed"
```

**Or interactively:**

```powershell
fly ssh console -a fadearena-api
cd /app/packages/shared
npx prisma db seed
exit
```

## Step 8: Verify Everything Works

### 8.1 Check API Health

```powershell
# Get API URL
fly status -a fadearena-api

# Test health endpoint
curl https://fadearena-api.fly.dev/api/health
```

### 8.2 Check API Logs

```powershell
fly logs -a fadearena-api
```

Look for:
- No database connection errors
- API started successfully
- Health checks passing

### 8.3 Check Worker Logs

```powershell
fly logs -a fadearena-worker
```

Look for:
- Worker started successfully
- Hyperliquid client initialized
- Periodic heartbeat messages
- No errors about missing mirror accounts

### 8.4 Test API Endpoints

```powershell
# Test models endpoint
curl https://fadearena-api.fly.dev/api/models

# Test settings endpoint
curl https://fadearena-api.fly.dev/api/settings

# Test mirror accounts endpoint
curl https://fadearena-api.fly.dev/api/mirror-accounts
```

## Step 9: Monitor and Maintain

### View Logs

```powershell
# API logs
fly logs -a fadearena-api

# Worker logs
fly logs -a fadearena-worker

# Follow logs in real-time
fly logs -a fadearena-api --follow
fly logs -a fadearena-worker --follow
```

### Check App Status

```powershell
# API status
fly status -a fadearena-api

# Worker status
fly status -a fadearena-worker
```

### Restart Apps

```powershell
# Restart API
fly apps restart fadearena-api

# Restart Worker
fly apps restart fadearena-worker
```

### Update Secrets

```powershell
# Update a secret
fly secrets set FADEARENA_MODE=simulation --app fadearena-api

# View current secrets (values are hidden)
fly secrets list -a fadearena-api
```

## Step 10: Switching to Live Mode (Later)

**⚠️ WARNING**: Only do this after thorough testing in simulation mode!

### 10.1 Update Mirror Wallet Addresses

```powershell
# Set real mirror wallet addresses
fly secrets set MY_GEMINI_FADE_WALLET=0xYourRealWalletAddress --app fadearena-api
fly secrets set MY_GEMINI_FADE_WALLET=0xYourRealWalletAddress --app fadearena-worker
# Repeat for all bots you're using
```

### 10.2 Set Private Keys

```powershell
# Set real private keys (BE CAREFUL - these are sensitive!)
fly secrets set MY_GEMINI_FADE_PRIVATE_KEY=0xYourRealPrivateKey --app fadearena-api
fly secrets set MY_GEMINI_FADE_PRIVATE_KEY=0xYourRealPrivateKey --app fadearena-worker
# Repeat for all bots you're using
```

### 10.3 Switch to Live Mode

```powershell
# Switch to live mode
fly secrets set FADEARENA_MODE=live --app fadearena-api
fly secrets set FADEARENA_MODE=live --app fadearena-worker
```

### 10.4 Restart Apps

```powershell
# Restart both apps to pick up new secrets
fly apps restart fadearena-api
fly apps restart fadearena-worker
```

### 10.5 Monitor Closely

```powershell
# Watch logs very carefully
fly logs -a fadearena-api --follow
fly logs -a fadearena-worker --follow
```

Look for:
- Orders being placed (in live mode)
- No errors about missing private keys
- Successful order executions

## Troubleshooting

### Database Connection Errors

```powershell
# Verify database is attached
fly postgres list

# Re-attach if needed
fly postgres attach fadearena-db --app fadearena-api
```

### App Won't Start

```powershell
# Check app status
fly status -a fadearena-api

# View detailed logs
fly logs -a fadearena-api

# Check if secrets are set
fly secrets list -a fadearena-api
```

### Migration Errors

```powershell
# Run migrations manually
fly ssh console -a fadearena-api -C "cd /app/packages/shared && npx prisma migrate deploy"
```

### Worker Not Processing Events

```powershell
# Check worker logs
fly logs -a fadearena-worker

# Verify mirror accounts are seeded
fly ssh console -a fadearena-api -C "cd /app/packages/shared && npx prisma studio"
# Then check mirror_accounts table in Prisma Studio
```

## Quick Reference

```powershell
# View logs
fly logs -a fadearena-api
fly logs -a fadearena-worker

# Check status
fly status -a fadearena-api
fly status -a fadearena-worker

# Restart apps
fly apps restart fadearena-api
fly apps restart fadearena-worker

# Update secrets
fly secrets set KEY=value --app fadearena-api

# View secrets (values hidden)
fly secrets list -a fadearena-api

# SSH into app
fly ssh console -a fadearena-api

# Deploy updates
fly deploy --app fadearena-api
fly deploy --app fadearena-worker
```

## Next Steps

1. ✅ Deploy API and Worker in simulation mode
2. ✅ Verify everything works
3. ✅ Test with real bot wallet addresses
4. ⚠️ Add real mirror wallet addresses
5. ⚠️ Add real private keys
6. ⚠️ Switch to live mode
7. ✅ Monitor closely

**Remember**: Always test in simulation mode first!

