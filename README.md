# FadeArena

Contrarian trading bot on Hyperliquid that automatically opens inverse positions to AI trading wallets participating in Alpha Arena.

## Architecture

Monorepo structure with three packages:

- **`packages/shared`**: Common TypeScript types, Prisma schema, and configuration
- **`packages/worker`**: Bot ingestor, strategy engine, and position reconciler
- **`packages/api`**: HTTP REST API and WebSocket server for frontend

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL database
- Hyperliquid account with API wallet

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database:**
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Run migrations
   pnpm db:migrate
   
   # Seed database
   pnpm db:seed
   ```

4. **Start services:**
   ```bash
   # Development mode (runs both API and worker)
   pnpm dev
   
   # Or run separately:
   pnpm --filter api dev
   pnpm --filter worker dev
   ```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `HYPERLIQUID_WALLET_ADDRESS`: Your Hyperliquid wallet address
- `HYPERLIQUID_WALLET_PRIVATE_KEY`: Private key for signing orders
- Bot wallet addresses (at least one)

**Optional:**
- `HYPERLIQUID_API_URL_INFO`: Info API URL (default: mainnet)
- `HYPERLIQUID_API_URL_EXCHANGE`: Exchange API URL (default: mainnet)
- `BOT_STATE_INTERVAL_MS`: Polling interval for bot positions (default: 5000ms)
- `RECONCILIATION_INTERVAL_MS`: Position reconciliation interval (default: 60000ms)

### Bot Wallets

Configure the AI bot wallets you want to track:

- `GEMINI_3_PRO_WALLET`
- `GROK_4_WALLET`
- `QWEN3_MAX_WALLET`
- `KIMI_K2_THINKING_WALLET`
- `DEEPSEEK_CHAT_V3_1_WALLET`
- `CLAUDE_SONNET_WALLET`

## API Endpoints

### REST API (Port 3001)

- `GET /api/state` - Global system summary
- `GET /api/models` - List of bots with stats
- `GET /api/trades` - Paginated trades
- `GET /api/equity` - Time-series equity curves
- `GET /api/settings` - Get strategy configuration
- `POST /api/settings` - Update strategy configuration
- `POST /api/kill-switch` - Activate/deactivate kill switch
- `GET /api/health` - Health check

### WebSocket (Port 3002)

Connect to `ws://localhost:3002/ws` for real-time updates:

- `bot-trade` - New bot trade detected
- `my-trade` - Our inverse trade executed
- `state-update` - System state changed
- `settings-update` - Settings updated
- `error` - Error occurred

## Trading Modes

### Simulation Mode (Default)

- All strategy decisions are logged
- No real orders are placed
- Safe for testing

### Live Mode

- Real orders are placed on Hyperliquid
- Requires valid API wallet credentials
- Use with caution

## Risk Controls

Configure via `/api/settings`:

- **Per-bot leverage multiplier**: Control position sizing (0.1x - 10.0x)
- **Global exposure cap**: Maximum total exposure in USD
- **Per-asset exposure cap**: Maximum exposure per asset
- **Daily loss limit**: Stop trading if daily loss exceeds limit
- **Per-bot enable/disable**: Selectively mirror specific bots
- **Kill switch**: Emergency stop for all trading

## Safety Features

- **Kill switch**: Instantly disable all trading
- **Position reconciliation**: Periodically checks for position drift
- **Daily loss limits**: Automatic halt on excessive losses
- **Exposure caps**: Prevent over-leveraging
- **Structured logging**: All events logged with correlation IDs
- **Retry logic**: Automatic retries for API failures

## Development

### Project Structure

```
fadearena/
├── packages/
│   ├── shared/          # Types, Prisma, config
│   ├── worker/          # Bot ingestor, strategy engine
│   └── api/             # HTTP + WebSocket server
├── prisma/              # Database schema
└── package.json         # Root workspace config
```

### Building

```bash
pnpm build
```

### Type Checking

```bash
pnpm typecheck
```

## Important Notes

1. **Signing Implementation**: The Hyperliquid signing mechanism in `hyperliquidClient.ts` is a placeholder. You may need to adjust it based on Hyperliquid's exact signing requirements or use their official SDK.

2. **Testnet vs Mainnet**: Change `HYPERLIQUID_API_URL_INFO` and `HYPERLIQUID_API_URL_EXCHANGE` to testnet URLs for testing.

3. **Database**: Ensure PostgreSQL is running and accessible before starting services.

4. **API Keys**: Never commit `.env` file or private keys to version control.

5. **Simulation Mode**: Always test in simulation mode first before enabling live trading.

## License

Private - Single user system

