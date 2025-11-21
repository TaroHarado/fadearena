# FadeArena Deployment Runbook

Step-by-step instructions for deploying FadeArena to a fresh Ubuntu VPS.

## Prerequisites

- Ubuntu 20.04+ VPS
- Root or sudo access
- Domain name (optional, for reverse proxy)
- Hyperliquid wallet address and private key
- Bot wallet addresses (from Alpha Arena)

## Step 1: Initial Server Setup

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 1.3 Install Git

```bash
sudo apt install git -y
```

## Step 2: Clone Repository

```bash
# Clone the repository
git clone <your-repo-url> fadearena
cd fadearena

# Or if you have the code locally, upload it via SCP:
# scp -r . user@your-server:/path/to/fadearena
```

## Step 3: Configure Environment

### 3.1 Create .env File

```bash
cp .env.example .env
nano .env
```

### 3.2 Fill in Required Variables

**Critical variables to set:**

```env
# Database (use strong password!)
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://fadearena:your_secure_password_here@db:5432/fadearena

# Hyperliquid
HYPERLIQUID_WALLET_ADDRESS=0x...
HYPERLIQUID_WALLET_PRIVATE_KEY=0x...

# Bot wallets (at least one required)
GEMINI_3_PRO_WALLET=0x...
GROK_4_WALLET=0x...
# ... etc

# IMPORTANT: Start in simulation mode!
FADEARENA_MODE=simulation
```

**Security Notes:**
- Use a strong, unique password for PostgreSQL
- Never commit `.env` to version control
- Keep private keys secure
- Consider using a secrets manager for production

## Step 4: Deploy

### 4.1 Run Deployment Script

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Verify Docker is installed
2. Check `.env` file exists
3. Validate critical environment variables
4. Build Docker images
5. Start services
6. Wait for health checks
7. Display status

### 4.2 Manual Deployment (Alternative)

If you prefer manual steps:

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 5: Verify Deployment

### 5.1 Check Health Endpoint

```bash
curl http://localhost:3001/api/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok", "latency": 5 },
    "hyperliquid": { "status": "ok", "latency": 200 },
    "worker": { "status": "ok", "lastSeenAt": 1234567890, "mode": "simulation" }
  },
  "timestamp": 1234567890
}
```

### 5.2 Check Service Status

```bash
docker-compose -f docker-compose.prod.yml ps
```

All services should show "Up" status.

### 5.3 Check Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f worker
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 5.4 Access Frontend

Open in browser: `http://your-server-ip:3000`

You should see:
- Landing page or dashboard
- Mode indicator showing "SIMULATION"
- No errors in browser console

## Step 6: Database Migrations

Migrations run automatically on API container startup. To verify:

```bash
# Check migration status
docker-compose -f docker-compose.prod.yml exec api sh -c "cd /app/packages/shared && npx prisma migrate status"

# Run migrations manually if needed
docker-compose -f docker-compose.prod.yml exec api sh -c "cd /app/packages/shared && npx prisma migrate deploy"
```

## Step 7: Initial Configuration

### 7.1 Access Settings

1. Navigate to `http://your-server-ip:3000/dashboard`
2. Click "Settings" tab
3. Review current configuration:
   - Mode: Should be "simulation"
   - Bot configurations
   - Risk limits

### 7.2 Configure Bots

1. Enable/disable bots as needed
2. Set leverage multipliers (start with 1.0x)
3. Set exposure caps (start conservative)
4. Set daily loss limit

### 7.3 Test in Simulation Mode

1. Verify bot positions are being tracked
2. Check trade feed for simulated trades
3. Review equity chart
4. Monitor logs for errors

## Step 8: Switch to Live Mode (When Ready)

**⚠️ WARNING: Only switch to live mode after thorough testing!**

### 8.1 Pre-flight Checks

```bash
# Verify health
curl http://localhost:3001/api/health

# Check worker is running
docker-compose -f docker-compose.prod.yml logs worker | tail -20

# Verify Hyperliquid connection
# Check logs for successful API calls
```

### 8.2 Switch Mode

**Option 1: Via UI (Recommended)**
1. Go to Settings page
2. Change mode from "simulation" to "live"
3. Click "Save Settings"

**Option 2: Via Environment Variable**
1. Edit `.env`: `FADEARENA_MODE=live`
2. Restart services: `docker-compose -f docker-compose.prod.yml restart api worker`

### 8.3 Monitor Closely

After switching to live mode:

```bash
# Watch logs in real-time
docker-compose -f docker-compose.prod.yml logs -f worker

# Monitor health
watch -n 5 'curl -s http://localhost:3001/api/health | jq'

# Check for errors
docker-compose -f docker-compose.prod.yml logs worker | grep -i error
```

## Step 9: Reverse Proxy (Optional)

### 9.1 Setup Caddy (Recommended)

Create `Caddyfile`:

```
your-domain.com {
    reverse_proxy frontend:3000
}

api.your-domain.com {
    reverse_proxy api:3001
}
```

Update `docker-compose.prod.yml` to include reverse proxy service (see TODO comments).

### 9.2 Setup Nginx (Alternative)

Create nginx config and add to compose file.

## Common Operations

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 [service-name]
```

### Restart Services

```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart api
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Code

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U fadearena fadearena > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U fadearena fadearena < backup.sql
```

### Check Worker Heartbeat

```bash
# Query database directly
docker-compose -f docker-compose.prod.yml exec db psql -U fadearena -d fadearena -c "SELECT * FROM system_status;"
```

## Troubleshooting

### Services Won't Start

1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify `.env` file is correct
3. Check Docker resources: `docker system df`
4. Verify database is healthy: `docker-compose -f docker-compose.prod.yml ps db`

### Health Check Failing

1. Check individual checks:
   ```bash
   curl http://localhost:3001/api/health | jq '.checks'
   ```
2. Database issues: Check connection string in `.env`
3. Hyperliquid issues: Verify API URLs and network connectivity
4. Worker issues: Check worker logs and heartbeat

### Worker Not Updating Heartbeat

1. Check worker logs: `docker-compose -f docker-compose.prod.yml logs worker`
2. Verify database connection
3. Check `WORKER_HEARTBEAT_INTERVAL_MS` in `.env`

### Frontend Can't Connect to API

1. Verify `NEXT_PUBLIC_API_URL` in `.env`
2. Check API is running: `docker-compose -f docker-compose.prod.yml ps api`
3. Check firewall rules
4. Verify network connectivity

## Security Checklist

- [ ] Strong PostgreSQL password set
- [ ] `.env` file has correct permissions (600)
- [ ] Private keys are secure
- [ ] Firewall configured (only expose necessary ports)
- [ ] SSL/TLS configured (via reverse proxy)
- [ ] Regular backups scheduled
- [ ] Monitoring and alerting setup
- [ ] Kill switch tested

## Monitoring

### Health Endpoint

Monitor: `http://your-server:3001/api/health`

### Metrics

Key metrics to track:
- Uptime percentage
- Average latency (bot detection → order placement)
- Daily PnL
- Order success rate
- API error rate

### Logs

Structured JSON logs include:
- Timestamp
- Level
- Component
- Bot ID
- Event ID
- Order CLoid
- Correlation ID

## Backup Strategy

1. **Database**: Daily automated backups
2. **Configuration**: Version control `.env.example` (without secrets)
3. **Logs**: Rotate and archive logs
4. **State**: Export settings periodically

## Support

For issues:
1. Check logs first
2. Verify health endpoint
3. Review this runbook
4. Check GitHub issues (if applicable)

