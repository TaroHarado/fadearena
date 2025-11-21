# Mirror Accounts Architecture

## Overview

FadeArena uses a **one-to-one mirror model** where each AI trading bot has a dedicated mirror trading wallet. This allows for:

- **Isolated risk management**: Each bot's mirror account can have its own leverage multiplier and allocation limits
- **Per-bot PnL tracking**: Track performance of each mirror account separately
- **Selective activation**: Enable or disable mirroring for specific bots independently
- **Scalability**: Easy to add new bots without affecting existing mirror accounts

## Architecture

### Before (Single Wallet Model)

```
All AI Bots → Single Trading Wallet → All Inverse Trades
```

### After (One-to-One Mirror Model)

```
Gemini Bot → Gemini Mirror Wallet → Gemini Inverse Trades
Grok Bot   → Grok Mirror Wallet   → Grok Inverse Trades
Qwen Bot   → Qwen Mirror Wallet   → Qwen Inverse Trades
...        → ...                  → ...
```

## Database Schema

### MirrorAccount Model

```prisma
model MirrorAccount {
  id                String   @id // e.g., "gemini-3-pro"
  botWallet         String   // AI bot wallet address (0x...)
  myWallet          String   // Our mirror trading wallet address (0x...)
  label             String?  // Optional human-readable label
  enabled           Boolean  @default(true)
  leverageMultiplier String? // Optional leverage multiplier
  allocationUsd     String?  // Optional allocation in USD
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now()) @updatedAt
  
  @@unique([botWallet])
  @@unique([myWallet])
}
```

### MyTrade Relation

Each `MyTrade` record now includes a `mirrorAccountId` field linking it to the specific mirror account that executed the trade.

## Configuration

### Environment Variables

#### Bot Wallets (AI Trading Bots)

```env
BOT_GEMINI_3_PRO=0x...
BOT_GROK_4=0x...
BOT_QWEN3_MAX=0x...
BOT_KIMI_K2_THINKING=0x...
BOT_DEEPSEEK_CHAT_V3_1=0x...
BOT_CLAUDE_SONNET_4_5=0x...
```

#### Mirror Trading Wallets (Our Wallets)

```env
MY_GEMINI_FADE_WALLET=0x...
MY_GROK_FADE_WALLET=0x...
MY_QWEN_FADE_WALLET=0x...
MY_KIMI_FADE_WALLET=0x...
MY_DEEPSEEK_FADE_WALLET=0x...
MY_CLAUDE_FADE_WALLET=0x...
```

#### Mirror Trading Wallet Private Keys

```env
MY_GEMINI_FADE_PRIVATE_KEY=0x...
MY_GROK_FADE_PRIVATE_KEY=0x...
MY_QWEN_FADE_PRIVATE_KEY=0x...
MY_KIMI_FADE_PRIVATE_KEY=0x...
MY_DEEPSEEK_FADE_PRIVATE_KEY=0x...
MY_CLAUDE_FADE_PRIVATE_KEY=0x...
```

### Seed Script

The seed script (`packages/shared/prisma/seed.ts`) automatically creates `MirrorAccount` records from environment variables:

1. Reads bot wallets from `BOT_*` env vars
2. Reads mirror wallets from `MY_*_FADE_WALLET` env vars
3. Creates or updates `MirrorAccount` records in the database

Run the seed script after setting up environment variables:

```bash
pnpm db:seed
```

## How It Works

### 1. Bot Trade Event Processing

When a `BotTradeEvent` is received:

1. **Lookup Mirror Account**: Find the `MirrorAccount` record for the bot's `botId`
2. **Check Enabled Status**: Skip if `mirrorAccount.enabled === false`
3. **Get Leverage**: Use `mirrorAccount.leverageMultiplier` if set, otherwise fall back to bot config
4. **Get Exchange Client**: Use `ExchangeClientFactory.getClient(mirrorAccountId)` to get the appropriate client
5. **Place Order**: Execute the inverse trade using the mirror account's wallet

### 2. Exchange Client Factory

The `ExchangeClientFactory` manages multiple `HyperliquidExchangeClient` instances:

- **Caching**: Clients are cached by `mirrorAccountId` to avoid recreating them
- **Simulation Mode**: In simulation mode, creates clients with dummy credentials (orders are still simulated)
- **Live Mode**: In live mode, reads private keys from environment variables and creates real clients
- **Lazy Loading**: Clients are created on-demand when first needed

### 3. Strategy Engine Changes

The `StrategyEngine` now:

- Looks up `MirrorAccount` instead of using a single global wallet
- Uses per-account leverage multipliers
- Routes orders to the correct exchange client based on `mirrorAccountId`
- Saves `mirrorAccountId` with each `MyTrade` record

### 4. PnL Tracking

Each `MyTrade` is linked to a `MirrorAccount`, enabling:

- **Per-bot PnL calculation**: Sum PnL for all trades with the same `mirrorAccountId`
- **Comparison**: Compare AI bot PnL vs mirror account PnL
- **Allocation tracking**: Track how much capital is allocated to each mirror account

## API Endpoints

### GET /api/models

Returns bot information including mirror account details:

```json
{
  "bots": [
    {
      "id": "gemini-3-pro",
      "name": "Gemini 3 Pro",
      "walletAddress": "0x...",
      "enabled": true,
      "leverageMultiplier": 1.0,
      "mirrorAccount": {
        "id": "gemini-3-pro",
        "botWallet": "0x...",
        "myWallet": "0x...",
        "label": "Gemini 3 Pro",
        "enabled": true,
        "leverageMultiplier": 1.0,
        "allocationUsd": null
      },
      "currentPositions": [],
      "myMirroredPositions": [],
      "stats": { ... }
    }
  ]
}
```

### GET /api/mirror-accounts

Returns all mirror accounts:

```json
{
  "mirrorAccounts": [
    {
      "id": "gemini-3-pro",
      "botWallet": "0x...",
      "myWallet": "0x...",
      "label": "Gemini 3 Pro",
      "enabled": true,
      "leverageMultiplier": 1.0,
      "allocationUsd": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Migration Guide

### From Single Wallet to Mirror Accounts

1. **Set up environment variables**:
   - Add `BOT_*` variables for each AI bot wallet
   - Add `MY_*_FADE_WALLET` variables for your mirror wallets
   - Add `MY_*_FADE_PRIVATE_KEY` variables for signing orders

2. **Run database migration**:
   ```bash
   pnpm db:migrate
   ```

3. **Seed mirror accounts**:
   ```bash
   pnpm db:seed
   ```

4. **Verify mirror accounts**:
   ```bash
   curl http://localhost:3001/api/mirror-accounts
   ```

5. **Test in simulation mode**:
   - Set `FADEARENA_MODE=simulation` in `.env`
   - Start the worker and verify orders are being routed correctly
   - Check logs to confirm which mirror account is being used

6. **Switch to live mode** (after thorough testing):
   - Set `FADEARENA_MODE=live` in `.env`
   - Ensure all private keys are correctly configured
   - Monitor closely for the first few trades

## Safety Features

### Simulation Mode

- In simulation mode, `ExchangeClientFactory` creates clients with dummy credentials
- Orders are still simulated and saved to the database
- No real API calls are made to Hyperliquid

### Live Mode

- Private keys are read from environment variables at runtime
- Each mirror account uses its own private key
- Missing private keys result in errors (order is skipped)

### Error Handling

- If a mirror account is not found, the trade event is skipped
- If a mirror account is disabled, the trade event is skipped
- If a private key is missing, the order is skipped and logged

## Future Enhancements

### TODO Items

- [ ] Per-mirror-account exposure caps
- [ ] Per-mirror-account daily loss limits
- [ ] Automatic PnL calculation per mirror account
- [ ] Frontend UI for managing mirror accounts
- [ ] API endpoint for updating mirror account settings
- [ ] Reconciliation per mirror account

## Troubleshooting

### Mirror Account Not Found

**Error**: `Mirror account not found for bot {botId}`

**Solution**: 
1. Check that the bot ID matches a `MirrorAccount.id` in the database
2. Run `pnpm db:seed` to create missing mirror accounts
3. Verify environment variables are set correctly

### Private Key Not Found

**Error**: `Private key not found in environment for mirror account`

**Solution**:
1. Check that `MY_{BOT_ID}_FADE_PRIVATE_KEY` is set in `.env`
2. Verify the environment variable name matches the bot ID
3. Restart the worker after updating `.env`

### Orders Not Being Placed

**Checklist**:
1. Is the mirror account enabled? (`enabled: true`)
2. Is the bot enabled in settings?
3. Is kill switch off?
4. Are exposure caps not exceeded?
5. Is simulation mode disabled (if testing live mode)?
6. Are private keys correctly configured?

## Related Files

- `packages/shared/prisma/schema.prisma` - Database schema
- `packages/worker/src/exchangeClientFactory.ts` - Exchange client factory
- `packages/worker/src/strategyEngine.ts` - Strategy engine with mirror account support
- `packages/shared/prisma/seed.ts` - Seed script for mirror accounts
- `packages/api/src/routes/models.ts` - API routes for mirror accounts

