# FadeArena System Architecture

## 1. Overview

FadeArena is a monorepo-based trading system that mirrors AI bot positions inversely on Hyperliquid. The system consists of four core modules that communicate via shared types and a PostgreSQL database.

## 2. Monorepo Structure

```
fadearena/
├── packages/
│   ├── core-api/          # HTTP/WebSocket server for frontend
│   ├── bot-ingestor/      # Watches Hyperliquid AI wallets
│   ├── strategy-engine/   # Converts bot activity to inverse orders
│   ├── trading-client/    # Hyperliquid API wrapper
│   └── shared/            # Shared types, utilities
├── apps/
│   └── web/               # Next.js frontend
├── prisma/
│   └── schema.prisma      # Database schema
└── package.json           # Root workspace config
```

## 3. Module Responsibilities

### 3.1 trading-client
**Purpose:** Low-level wrapper around Hyperliquid Info and Exchange APIs.

**Key Functions:**
- `getUserState(wallet: string)` → Returns asset positions and margin summary
- `getUserFills(wallet: string, startTime?: number)` → Returns recent fills
- `getMeta()` → Returns asset metadata (indices, symbols)
- `placeOrder(order: OrderRequest, signature: Signature)` → Submits order to Exchange API
- `getExchangeState()` → Returns account state for our wallet

**Implementation Details:**
- Base URL: `https://api.hyperliquid.xyz` (mainnet) or `https://api.hyperliquid-testnet.xyz` (testnet)
- Uses `fetch` with POST requests
- Handles nonce generation (timestamp in ms)
- Manages signature creation (external to this module, passed in)
- Derives asset indices from meta response
- Implements retry logic with exponential backoff

**Dependencies:** None (pure API client)

### 3.2 bot-ingestor
**Purpose:** Continuously polls Hyperliquid for target AI wallet activity and normalizes into `BotTradeEvent` objects.

**Key Functions:**
- `startWatching(wallets: string[])` → Begins polling loop
- `pollWalletState(wallet: string)` → Fetches current positions
- `pollWalletFills(wallet: string)` → Fetches recent fills
- `normalizeToBotTradeEvent(data: HyperliquidResponse, wallet: string)` → Converts to internal format
- `detectPositionChanges(oldState, newState)` → Identifies deltas

**Polling Strategy:**
- Polls each wallet every 5 seconds (configurable)
- Tracks last seen fill timestamp to avoid duplicates
- Stores normalized events in database (`BotTradeEvent` table)
- Emits events via internal event bus (for strategy-engine)

**Dependencies:** 
- `trading-client` (for API calls)
- Database (Prisma client)

### 3.3 strategy-engine
**Purpose:** Consumes `BotTradeEvent` objects, applies risk controls, and generates `StrategyDecision` objects with inverse orders.

**Key Functions:**
- `processBotTradeEvent(event: BotTradeEvent)` → Main decision logic
- `calculateInversePosition(botPosition: Position, leverage: number)` → Size calculation
- `checkRiskLimits(decision: StrategyDecision)` → Validates exposure caps, loss limits
- `shouldExecute(decision: StrategyDecision, settings: Settings)` → Final go/no-go check
- `generateOrderRequest(decision: StrategyDecision)` → Converts to `OrderRequest`

**Decision Flow:**
1. Receive `BotTradeEvent` from bot-ingestor
2. Load current settings (leverage, caps, enabled bots)
3. Calculate inverse position size (bot size × leverage)
4. Check per-asset exposure cap
5. Check global exposure cap
6. Check daily loss limit (query DB for today's PnL)
7. Check if bot is enabled
8. Check kill switch status
9. Generate `StrategyDecision` with order or skip reason
10. If simulation mode: log only; if live: pass to trading-client

**Dependencies:**
- Database (Prisma client for settings, PnL queries)
- `trading-client` (for order execution in live mode)

### 3.4 core-api
**Purpose:** HTTP/WebSocket server that exposes REST endpoints and WebSocket channels for the Next.js frontend.

**Key Components:**
- Express/Fastify server with REST routes
- WebSocket server (ws library) on `/ws` path
- Real-time event broadcasting to connected clients

**REST Endpoints:** (See API_SPEC.md for details)
- `GET /api/state` - Global summary
- `GET /api/models` - Bot list with stats
- `GET /api/trades` - Paginated trades
- `GET /api/equity` - Time-series equity
- `GET /api/settings` - Read config
- `POST /api/settings` - Update config
- `POST /api/kill-switch` - Emergency stop
- `GET /api/health` - Health check

**WebSocket Protocol:**
- Connection: `ws://localhost:3001/ws`
- Message types: `bot-trade`, `my-trade`, `state-update`, `settings-update`
- Client subscribes to channels (optional filtering)

**Dependencies:**
- Database (Prisma client)
- Internal event bus (receives events from strategy-engine)

## 4. Data Flow

### 4.1 Position Tracking Flow
```
bot-ingestor (every 5s)
  → trading-client.getUserState(wallet)
  → Hyperliquid Info API
  → Normalize to BotTradeEvent
  → Save to DB (BotTradeEvent table)
  → Emit internal event
  → strategy-engine.processBotTradeEvent()
  → Generate StrategyDecision
  → (if live) trading-client.placeOrder()
  → Save to DB (MyTrade table)
  → Emit WebSocket event to frontend
```

### 4.2 Configuration Update Flow
```
Frontend POST /api/settings
  → core-api validates input
  → Update DB (Settings table)
  → Emit WebSocket "settings-update"
  → strategy-engine reloads settings (on next event)
```

### 4.3 Kill Switch Flow
```
Frontend POST /api/kill-switch
  → Update DB (SystemStatus.killSwitch = true)
  → Emit WebSocket "state-update"
  → strategy-engine checks flag before any order
```

## 5. Hyperliquid Integration Details

### 5.1 Info API Endpoints

**Base URLs:**
- Mainnet: `https://api.hyperliquid.xyz/info`
- Testnet: `https://api.hyperliquid-testnet.xyz/info`

**1. Get Asset Metadata**
```typescript
POST https://api.hyperliquid.xyz/info
Body: { type: "meta" }
Response: {
  universe: Array<{
    name: string;      // e.g., "BTC"
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
  }>
}
```
**Usage:** Map asset names to indices (array position = index). Store in memory/cache.

**2. Get User State (Positions)**
```typescript
POST https://api.hyperliquid.xyz/info
Body: { 
  type: "userState",
  user: "0x..." // wallet address
}
Response: {
  assetPositions: Array<{
    position: {
      coin: string;           // e.g., "BTC"
      entryPx: string;        // entry price
      leverage: { type: string; value: string };
      liquidationPx: string;
      marginUsed: string;
      notional: string;        // position size in USD
      unrealizedPnl: string;
      sz: string;             // position size (positive = long, negative = short)
    };
  }>;
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
}
```
**Usage:** Track current positions per wallet. Compare with previous state to detect changes.

**3. Get User Fills**
```typescript
POST https://api.hyperliquid.xyz/info
Body: { 
  type: "userFills",
  user: "0x..."
}
// OR for time-range:
Body: {
  type: "userFillsByTime",
  user: "0x...",
  startTime: 1234567890000 // timestamp ms
}
Response: {
  closedPnl: string;
  fills: Array<{
    closedPnl: string;
    coin: string;
    crossed: boolean;
    dir: string;              // "A" (taker) or "B" (maker)
    hash: string;
    oid: number;
    px: string;               // fill price
    side: string;             // "A" (buy) or "B" (sell)
    startPosition: string;
    sz: string;               // fill size
    time: number;             // timestamp ms
    tid: number;
  }>;
}
```
**Usage:** Track recent fills to detect new trades. Use `time` field to avoid duplicates.

### 5.2 Exchange API

**Base URLs:**
- Mainnet: `https://api.hyperliquid.xyz/exchange`
- Testnet: `https://api.hyperliquid-testnet.xyz/exchange`

**Place Order**
```typescript
POST https://api.hyperliquid.xyz/exchange
Body: {
  action: {
    type: "order",
    orders: [{
      a: number;              // asset index (from meta)
      b: boolean;             // isBuy (true = buy/long, false = sell/short)
      p: string;              // price (use "0" for market orders)
      s: string;              // size (in base units, e.g., BTC amount)
      r: boolean;             // reduceOnly (true = only close position)
      t: {                    // order type
        limit?: {
          tif: "Gtc" | "Ioc" | "Alo"; // Time in force
        };
        trigger?: {
          triggerPx: string;
          isMarket: boolean;
          tpsl: "tp" | "sl";
        };
      };
    }],
    grouping: "na";           // "na" for single orders
  },
  nonce: number;              // timestamp in milliseconds
  signature: {
    r: string;                // signature r component
    s: string;                // signature s component
    v: number;                // signature v component
  },
  vaultAddress?: string;      // optional, for vaults
}
```

**Order Field Mapping:**
- `a` (asset index): Derived from `meta` response. Index in `universe` array = asset index.
- `b` (isBuy): `true` for long, `false` for short. For inverse: if bot is long, we go short (`b = false`).
- `p` (price): `"0"` for market orders. For limit orders, use desired price as string.
- `s` (size): Position size in base units (e.g., `"0.1"` for 0.1 BTC). Must be positive.
- `r` (reduceOnly): `true` to only close existing position, `false` to open/close.
- `t.limit.tif`: `"Gtc"` (Good till cancel), `"Ioc"` (Immediate or cancel), `"Alo"` (Allow limit orders).

**Signature Generation:**
- Nonce: Current timestamp in milliseconds
- Message: Construct order payload, serialize to JSON
- Sign with wallet private key (use ethers.js or similar)
- Format signature as `{ r, s, v }` (EIP-712 or similar)

**Idempotent Client Order IDs (cloid):**
- Format: `fadearena-{botWallet}-{timestamp}-{nonce}`
- Example: `fadearena-0xabc123-1704067200000-42`
- Store in order request metadata (Hyperliquid may support cloid in future, but for now use for our tracking)

### 5.3 Asset Index Derivation

```typescript
// On startup, fetch meta:
const meta = await tradingClient.getMeta();
// meta.universe = [{ name: "BTC", ... }, { name: "ETH", ... }, ...]

// Create mapping:
const assetIndexMap = new Map<string, number>();
meta.universe.forEach((asset, index) => {
  assetIndexMap.set(asset.name, index);
});

// When placing order:
const assetIndex = assetIndexMap.get("BTC"); // e.g., 0
```

## 6. Database Schema (Prisma)

See `schema.prisma` for full schema. Key tables:

- **BotTradeEvent**: Normalized bot activity (fills, position changes)
- **MyTrade**: Our executed trades (inverse positions)
- **Settings**: Strategy configuration (leverage, caps, toggles)
- **EquitySnapshot**: Time-series equity data (per bot + aggregate)
- **SystemStatus**: Kill switch, mode, last event timestamps

## 7. Simulation vs Live Mode

**Simulation Mode:**
- `Settings.mode = "simulation"`
- `strategy-engine` generates `StrategyDecision` but does NOT call `trading-client.placeOrder()`
- All decisions logged to DB with `simulated: true` flag
- Equity calculations use simulated PnL (based on current market prices)
- Frontend shows "SIMULATION" banner

**Live Mode:**
- `Settings.mode = "live"`
- `strategy-engine` calls `trading-client.placeOrder()` with real signature
- Orders submitted to Hyperliquid Exchange API
- Real trades saved to `MyTrade` table
- Equity calculations use real PnL from Hyperliquid

**Mode Switching:**
- Changed via `POST /api/settings` (updates `Settings.mode`)
- Takes effect immediately (checked on next `BotTradeEvent`)

## 8. Kill Switch

**Implementation:**
- `SystemStatus.killSwitch` boolean flag in database
- Checked in `strategy-engine.shouldExecute()` before any order
- When active:
  - No new orders placed (even in live mode)
  - Pending orders can be cancelled (optional: implement cancel logic)
  - System continues tracking (bot-ingestor still runs)
  - Frontend shows "KILL SWITCH ACTIVE" warning

**Activation:**
- `POST /api/kill-switch` with `{ active: true }`
- Immediate effect (no restart required)

**Deactivation:**
- `POST /api/kill-switch` with `{ active: false }`
- Trading resumes on next bot event

## 9. Error Handling

**API Failures:**
- Retry with exponential backoff (max 3 retries)
- Log errors to database/system logs
- Emit WebSocket error event to frontend
- Continue polling (don't stop on single failure)

**Order Failures:**
- Log failed order attempt
- Emit WebSocket error event
- Do NOT retry automatically (user must review)

**Database Failures:**
- Critical: System should halt if DB is unavailable
- Health check endpoint reports DB status

## 10. Deployment Considerations

**Environment Variables:**
- `HYPERLIQUID_API_URL` (mainnet/testnet)
- `HYPERLIQUID_WALLET_PRIVATE_KEY` (for signing)
- `DATABASE_URL` (PostgreSQL connection string)
- `NODE_ENV` (development/production)

**Scaling:**
- Single instance deployment (single-user system)
- No horizontal scaling needed
- Consider process manager (PM2) for reliability

**Monitoring:**
- Log all trades, errors, API calls
- Health check endpoint for uptime monitoring
- WebSocket connection count monitoring

