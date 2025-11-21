# FadeArena Project Structure

## Monorepo Layout

```
fadearena/
├── packages/
│   ├── shared/                    # Shared types, config, Prisma
│   │   ├── src/
│   │   │   ├── index.ts          # Main exports
│   │   │   ├── types.ts          # Re-export types
│   │   │   └── config.ts         # Configuration loader
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema
│   │   │   └── seed.ts           # Database seed script
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker/                    # Bot ingestor & strategy engine
│   │   ├── src/
│   │   │   ├── index.ts          # Worker entry point
│   │   │   ├── hyperliquidClient.ts  # Hyperliquid API client
│   │   │   ├── botIngestor.ts    # Bot position tracker
│   │   │   ├── strategyEngine.ts # Strategy decision engine
│   │   │   └── reconciler.ts    # Position reconciler
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                       # HTTP + WebSocket API
│       ├── src/
│       │   ├── index.ts          # API server entry point
│       │   ├── websocket.ts      # WebSocket server
│       │   └── routes/
│       │       ├── state.ts      # GET /api/state
│       │       ├── models.ts     # GET /api/models
│       │       ├── trades.ts     # GET /api/trades
│       │       ├── equity.ts     # GET /api/equity
│       │       ├── settings.ts   # GET/POST /api/settings
│       │       ├── killSwitch.ts # POST /api/kill-switch
│       │       └── health.ts     # GET /api/health
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/                        # Legacy (moved to packages/shared/prisma)
├── package.json                   # Root workspace config
├── pnpm-workspace.yaml            # pnpm workspace definition
├── .env.example                   # Environment variables template
├── README.md                      # Main documentation
└── .gitignore
```

## Key Files

### Configuration
- `.env.example` - Environment variables template
- `packages/shared/src/config.ts` - Configuration loader

### Database
- `packages/shared/prisma/schema.prisma` - Prisma schema
- `packages/shared/prisma/seed.ts` - Database seed script

### Hyperliquid Integration
- `packages/worker/src/hyperliquidClient.ts` - API client
  - `HyperliquidInfoClient` - Read-only operations
  - `HyperliquidExchangeClient` - Trading operations

### Core Logic
- `packages/worker/src/botIngestor.ts` - Polls bot wallets, emits events
- `packages/worker/src/strategyEngine.ts` - Processes events, generates orders
- `packages/worker/src/reconciler.ts` - Position reconciliation

### API
- `packages/api/src/index.ts` - Express server setup
- `packages/api/src/websocket.ts` - WebSocket server
- `packages/api/src/routes/*.ts` - REST endpoints

## Data Flow

1. **Bot Ingestor** polls Hyperliquid → detects bot trades → saves to DB → emits event
2. **Strategy Engine** receives event → loads settings → checks risk → generates order → executes (or simulates)
3. **Reconciler** periodically checks actual vs expected positions
4. **API** serves HTTP endpoints and broadcasts WebSocket events

## Dependencies

- **shared**: Prisma, types
- **worker**: shared, ethers (signing), pino (logging)
- **api**: shared, express, ws, pino

## Build Output

Each package compiles TypeScript to `dist/` directory:
- `packages/shared/dist/`
- `packages/worker/dist/`
- `packages/api/dist/`

