# Fly.io Environment Variables Reference

This document lists all environment variables that need to be set as Fly.io secrets for both `fadearena-api` and `fadearena-worker` applications.

## Database

The `DATABASE_URL` is automatically set when you attach a Postgres database using:
```bash
fly postgres attach fadearena-db --app fadearena-api
fly postgres attach fadearena-db --app fadearena-worker
```

**You do NOT need to set this manually.**

## Required Environment Variables

### Core Configuration

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `FADEARENA_MODE` | `simulation` | Trading mode: `simulation` or `live` | ✅ Yes |
| `FADEARENA_KILL_SWITCH` | `false` | Emergency kill switch (set to `true` to stop all trading) | ✅ Yes |

**⚠️ IMPORTANT**: Always start with `FADEARENA_MODE=simulation`. Only switch to `live` after thorough testing and when you're ready to use real funds.

### Hyperliquid API Configuration

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `HYPERLIQUID_API_URL_INFO` | `https://api.hyperliquid.xyz/info` | Hyperliquid info API URL | ❌ No (has default) |
| `HYPERLIQUID_API_URL_EXCHANGE` | `https://api.hyperliquid.xyz/exchange` | Hyperliquid exchange API URL | ❌ No (has default) |

**Note**: The legacy `HYPERLIQUID_WALLET_ADDRESS` and `HYPERLIQUID_WALLET_PRIVATE_KEY` are kept for backward compatibility but are not used in the new mirror account model.

### AI Bot Wallets (The wallets we're mirroring)

These are the addresses of the AI trading bots you want to track and mirror:

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_GEMINI_3_PRO` | Gemini 3 Pro bot wallet address (0x...) | ⚠️ At least one bot |
| `BOT_GROK_4` | Grok 4 bot wallet address (0x...) | ⚠️ At least one bot |
| `BOT_QWEN3_MAX` | Qwen3 Max bot wallet address (0x...) | ⚠️ At least one bot |
| `BOT_KIMI_K2_THINKING` | Kimi K2 Thinking bot wallet address (0x...) | ⚠️ At least one bot |
| `BOT_DEEPSEEK_CHAT_V3_1` | DeepSeek Chat v3.1 bot wallet address (0x...) | ⚠️ At least one bot |
| `BOT_CLAUDE_SONNET_4_5` | Claude Sonnet 4.5 bot wallet address (0x...) | ⚠️ At least one bot |

**Legacy support**: The system also checks for `GEMINI_3_PRO_WALLET`, `GROK_4_WALLET`, etc. if `BOT_*` variables are not set.

### Mirror Trading Wallets (Our wallets that mirror each bot)

These are YOUR wallet addresses that will execute inverse trades for each bot:

| Variable | Description | Required |
|----------|-------------|----------|
| `MY_GEMINI_FADE_WALLET` | Your mirror wallet for Gemini bot (0x...) | ⚠️ If using Gemini |
| `MY_GROK_FADE_WALLET` | Your mirror wallet for Grok bot (0x...) | ⚠️ If using Grok |
| `MY_QWEN_FADE_WALLET` | Your mirror wallet for Qwen bot (0x...) | ⚠️ If using Qwen |
| `MY_KIMI_FADE_WALLET` | Your mirror wallet for Kimi bot (0x...) | ⚠️ If using Kimi |
| `MY_DEEPSEEK_FADE_WALLET` | Your mirror wallet for DeepSeek bot (0x...) | ⚠️ If using DeepSeek |
| `MY_CLAUDE_FADE_WALLET` | Your mirror wallet for Claude bot (0x...) | ⚠️ If using Claude |

**Note**: In simulation mode, you can use placeholder addresses like `0x0000000000000000000000000000000000000000`.

### Mirror Trading Wallet Private Keys (For signing orders)

**⚠️ CRITICAL**: These are sensitive secrets. Only set these when:
1. You've thoroughly tested in simulation mode
2. You're ready to use real funds
3. `FADEARENA_MODE=live` is set

| Variable | Description | Required |
|----------|-------------|----------|
| `MY_GEMINI_FADE_PRIVATE_KEY` | Private key for `MY_GEMINI_FADE_WALLET` (0x...) | ⚠️ Only in live mode |
| `MY_GROK_FADE_PRIVATE_KEY` | Private key for `MY_GROK_FADE_WALLET` (0x...) | ⚠️ Only in live mode |
| `MY_QWEN_FADE_PRIVATE_KEY` | Private key for `MY_QWEN_FADE_WALLET` (0x...) | ⚠️ Only in live mode |
| `MY_KIMI_FADE_PRIVATE_KEY` | Private key for `MY_KIMI_FADE_WALLET` (0x...) | ⚠️ Only in live mode |
| `MY_DEEPSEEK_FADE_PRIVATE_KEY` | Private key for `MY_DEEPSEEK_FADE_WALLET` (0x...) | ⚠️ Only in live mode |
| `MY_CLAUDE_FADE_PRIVATE_KEY` | Private key for `MY_CLAUDE_FADE_WALLET` (0x...) | ⚠️ Only in live mode |

**Note**: In simulation mode, these are not required. The system uses dummy keys internally.

### Risk Limits (Optional)

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `DEFAULT_LEVERAGE_MULTIPLIER` | `1.0` | Default leverage multiplier for inverse trades | ❌ No |
| `DEFAULT_GLOBAL_EXPOSURE_CAP` | `null` | Global exposure cap in USD (null = unlimited) | ❌ No |
| `DEFAULT_DAILY_LOSS_LIMIT` | `null` | Daily loss limit in USD (null = unlimited) | ❌ No |

### Polling Intervals (Optional)

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `BOT_STATE_INTERVAL_MS` | `5000` | How often to poll bot positions (milliseconds) | ❌ No |
| `RECONCILIATION_INTERVAL_MS` | `60000` | How often to reconcile positions (milliseconds) | ❌ No |
| `WORKER_HEARTBEAT_INTERVAL_MS` | `30000` | Worker heartbeat interval (milliseconds) | ❌ No |

### Server Configuration (API only)

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `PORT` | `3001` | HTTP server port | ❌ No (set in fly.toml) |
| `HOST` | `0.0.0.0` | HTTP server host | ❌ No (set in fly.toml) |

## Setting Secrets in Fly.io

### For API App

```bash
fly secrets set \
  FADEARENA_MODE=simulation \
  FADEARENA_KILL_SWITCH=false \
  BOT_GEMINI_3_PRO=0x... \
  MY_GEMINI_FADE_WALLET=0x... \
  --app fadearena-api
```

### For Worker App

```bash
fly secrets set \
  FADEARENA_MODE=simulation \
  FADEARENA_KILL_SWITCH=false \
  BOT_GEMINI_3_PRO=0x... \
  MY_GEMINI_FADE_WALLET=0x... \
  --app fadearena-worker
```

**Note**: Both apps need the same environment variables (except `PORT` and `HOST` which are API-only).

## Security Best Practices

1. **Never commit private keys to git** - Always use `fly secrets set`
2. **Start in simulation mode** - Test thoroughly before switching to live
3. **Use separate wallets** - Each bot should have its own dedicated mirror wallet
4. **Monitor closely** - Watch logs and health endpoints after deployment
5. **Set kill switch** - Keep `FADEARENA_KILL_SWITCH=true` until you're ready

## Example: Setting All Secrets for Simulation Mode

```bash
# API
fly secrets set \
  FADEARENA_MODE=simulation \
  FADEARENA_KILL_SWITCH=false \
  BOT_GEMINI_3_PRO=0x1234567890123456789012345678901234567890 \
  BOT_GROK_4=0x2345678901234567890123456789012345678901 \
  MY_GEMINI_FADE_WALLET=0x0000000000000000000000000000000000000000 \
  MY_GROK_FADE_WALLET=0x0000000000000000000000000000000000000000 \
  --app fadearena-api

# Worker (same variables)
fly secrets set \
  FADEARENA_MODE=simulation \
  FADEARENA_KILL_SWITCH=false \
  BOT_GEMINI_3_PRO=0x1234567890123456789012345678901234567890 \
  BOT_GROK_4=0x2345678901234567890123456789012345678901 \
  MY_GEMINI_FADE_WALLET=0x0000000000000000000000000000000000000000 \
  MY_GROK_FADE_WALLET=0x0000000000000000000000000000000000000000 \
  --app fadearena-worker
```

## Switching to Live Mode

**⚠️ WARNING**: Only do this after thorough testing in simulation mode!

1. Set real mirror wallet addresses:
   ```bash
   fly secrets set MY_GEMINI_FADE_WALLET=0x... --app fadearena-api
   fly secrets set MY_GEMINI_FADE_WALLET=0x... --app fadearena-worker
   ```

2. Set real private keys:
   ```bash
   fly secrets set MY_GEMINI_FADE_PRIVATE_KEY=0x... --app fadearena-api
   fly secrets set MY_GEMINI_FADE_PRIVATE_KEY=0x... --app fadearena-worker
   ```

3. Switch to live mode:
   ```bash
   fly secrets set FADEARENA_MODE=live --app fadearena-api
   fly secrets set FADEARENA_MODE=live --app fadearena-worker
   ```

4. Restart both apps:
   ```bash
   fly apps restart fadearena-api
   fly apps restart fadearena-worker
   ```

5. Monitor closely:
   ```bash
   fly logs -a fadearena-api
   fly logs -a fadearena-worker
   ```

