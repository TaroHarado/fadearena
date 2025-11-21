# FadeArena Database Schema (ERD)

## Overview

The database uses PostgreSQL with Prisma ORM. The schema is designed to support:
- Real-time tracking of bot trades and positions
- Strategy decision audit trail
- Our inverse trade execution history
- Configuration management
- Time-series equity data
- System health monitoring

## Entity Relationship Diagram

```
┌─────────────────────┐
│  BotTradeEvent      │
│─────────────────────│
│ id (PK)             │
│ botId               │
│ walletAddress       │
│ timestamp           │
│ eventType           │
│ asset, side, size   │
│ price, notional     │
│ ...                 │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐
│ StrategyDecision    │
│─────────────────────│
│ id (PK)             │
│ botTradeEventId (FK)│
│ timestamp           │
│ decision            │
│ reason/skipReason   │
│ riskChecks (JSON)   │
│ settingsSnapshot    │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐
│  MyTrade            │
│─────────────────────│
│ id (PK)             │
│ botTradeEventId (FK)│
│ strategyDecisionId  │
│ botId               │
│ asset, side, size   │
│ price, notional     │
│ orderRequest (JSON) │
│ orderResult (JSON)  │
│ cloid (UNIQUE)      │
│ simulated           │
└─────────────────────┘

┌─────────────────────┐
│  Settings           │
│─────────────────────│
│ id (PK)             │
│ mode                │
│ globalExposureCap   │
│ dailyLossLimit      │
│ botConfigs (JSON)   │
│ assetExposureCaps   │
│ updatedAt           │
└─────────────────────┘

┌─────────────────────┐
│  SystemStatus       │
│─────────────────────│
│ id (PK)             │
│ killSwitch          │
│ hyperliquidConnected│
│ lastEventTime       │
│ lastOrderTime       │
│ startedAt           │
└─────────────────────┘

┌─────────────────────┐
│  EquitySnapshot     │
│─────────────────────│
│ id (PK)             │
│ timestamp           │
│ botsAggregate       │
│ fadeArena           │
│ botEquities (JSON)  │
└─────────────────────┘

┌─────────────────────┐
│  SystemEvent        │
│─────────────────────│
│ id (PK)             │
│ timestamp           │
│ level               │
│ category            │
│ message             │
│ details (JSON)      │
└─────────────────────┘
```

## Table Descriptions

### BotTradeEvent
**Purpose:** Stores normalized bot trade events (fills and position changes) from Hyperliquid API.

**Key Fields:**
- `botId`: Identifier for the bot (e.g., "gemini-3-pro")
- `walletAddress`: The bot's wallet address (0x...)
- `eventType`: "fill" (new trade) or "position-change" (position modified)
- `asset`, `side`, `size`, `price`, `notional`: Trade details
- `previousSize`, `currentSize`: For position changes, tracks delta

**Relationships:**
- One-to-many with `StrategyDecision` (one event can trigger multiple decisions if retried)
- One-to-many with `MyTrade` (one event can result in multiple trades if partial fills)

**Indexes:**
- `(botId, timestamp)` - Fast lookup of bot's recent events
- `timestamp` - Time-series queries
- `asset` - Filter by asset

**Usage:**
- Populated by `bot-ingestor` module
- Queried by `strategy-engine` to make decisions
- Displayed in frontend `/api/trades` endpoint

---

### StrategyDecision
**Purpose:** Audit trail of strategy engine decisions. Links bot events to our trading actions.

**Key Fields:**
- `botTradeEventId`: Foreign key to `BotTradeEvent`
- `decision`: "execute" (place order) or "skip" (don't trade)
- `reason` / `skipReason`: Human-readable explanation
- `riskChecks`: JSON object storing all risk validation results
- `settingsSnapshot`: JSON object storing settings at decision time (for audit)

**Relationships:**
- Many-to-one with `BotTradeEvent`
- One-to-many with `MyTrade` (one decision can result in multiple trades)

**Indexes:**
- `botTradeEventId` - Link back to source event
- `timestamp` - Time-series queries
- `decision` - Filter by execute/skip

**Usage:**
- Populated by `strategy-engine` module
- Used for debugging and audit (why did we trade or not trade?)
- Can be queried to analyze decision quality

---

### MyTrade
**Purpose:** Records all our executed trades (inverse positions).

**Key Fields:**
- `botTradeEventId`: Foreign key to triggering bot event
- `strategyDecisionId`: Foreign key to decision that generated this trade
- `botId`: Which bot this trade mirrors
- `asset`, `side`, `size`, `price`, `notional`: Trade details
- `orderRequest`: Full `OrderRequest` object (JSON) for audit
- `orderResult`: Full `OrderResult` object (JSON) after execution
- `cloid`: Client order ID (unique, for idempotency)
- `simulated`: Whether this was simulation mode

**Relationships:**
- Many-to-one with `BotTradeEvent` (optional, may be null if manual trade)
- Many-to-one with `StrategyDecision` (optional, may be null if manual trade)

**Indexes:**
- `(botId, timestamp)` - Fast lookup of trades per bot
- `timestamp` - Time-series queries
- `asset` - Filter by asset
- `cloid` (UNIQUE) - Ensure idempotency (prevent duplicate orders)

**Usage:**
- Populated by `trading-client` module after order execution
- Displayed in frontend `/api/trades` endpoint
- Used for PnL calculations

---

### Settings
**Purpose:** Singleton table storing strategy configuration.

**Key Fields:**
- `mode`: "simulation" or "live"
- `globalExposureCap`: Maximum total exposure in USD (null = unlimited)
- `dailyLossLimit`: Maximum daily loss in USD (null = unlimited)
- `botConfigs`: JSON array of `{ id, enabled, leverageMultiplier }` per bot
- `assetExposureCaps`: JSON object mapping asset -> USD cap (null = unlimited)

**Design Notes:**
- Singleton table (only one row, ID is constant)
- JSON fields for flexibility (can add new bot configs without schema migration)
- `updatedAt` tracks when settings changed

**Usage:**
- Read by `strategy-engine` before making decisions
- Updated via `POST /api/settings` endpoint
- Cached in memory for performance (reload on update)

---

### SystemStatus
**Purpose:** Singleton table tracking system health and kill switch state.

**Key Fields:**
- `killSwitch`: Boolean flag (true = trading disabled)
- `killSwitchActivatedAt` / `killSwitchDeactivatedAt`: Timestamps for audit
- `hyperliquidConnected`: Last known connection status
- `lastHyperliquidCheck`: Last time we checked connection
- `lastEventTime`: Timestamp of most recent `BotTradeEvent`
- `lastOrderTime`: Timestamp of most recent `MyTrade`
- `startedAt`: System startup time (for uptime calculation)

**Design Notes:**
- Singleton table (only one row)
- Updated frequently (every few seconds) by various modules
- Used by health check endpoint

**Usage:**
- Read by `strategy-engine` to check kill switch before orders
- Updated by `bot-ingestor` (lastEventTime), `trading-client` (lastOrderTime)
- Displayed in frontend system health panel

---

### EquitySnapshot
**Purpose:** Time-series equity data for charts.

**Key Fields:**
- `timestamp`: Snapshot time
- `botsAggregate`: Sum of all bot equities
- `fadeArena`: Our inverse strategy equity
- `botEquities`: JSON object mapping botId -> equity (optional, for detailed views)

**Design Notes:**
- Populated periodically (every 5 minutes) or on significant changes
- Can be aggregated/compressed for historical data (keep hourly snapshots after 24h)

**Indexes:**
- `timestamp` - Time-series queries (used by `/api/equity`)

**Usage:**
- Populated by background job or on-demand calculation
- Queried by `/api/equity` endpoint for charts
- Can be used for performance analysis

---

### SystemEvent
**Purpose:** Audit log for system events (errors, warnings, important state changes).

**Key Fields:**
- `timestamp`: Event time
- `level`: "info", "warning", or "error"
- `category`: "api", "trading", "system", or "config"
- `message`: Human-readable message
- `details`: JSON object with additional context

**Design Notes:**
- Optional table (can be disabled if not needed)
- Can be rotated/archived periodically
- Useful for debugging and monitoring

**Indexes:**
- `timestamp` - Time-series queries
- `level` - Filter by severity
- `category` - Filter by type

**Usage:**
- Populated by all modules when important events occur
- Can be queried for error analysis
- Can be exported for external monitoring

---

## Data Flow Through Schema

1. **Bot Activity Detection:**
   ```
   Hyperliquid API → bot-ingestor → BotTradeEvent (INSERT)
   ```

2. **Strategy Decision:**
   ```
   BotTradeEvent → strategy-engine → StrategyDecision (INSERT)
   ```

3. **Order Execution:**
   ```
   StrategyDecision → trading-client → MyTrade (INSERT)
   ```

4. **Configuration Update:**
   ```
   POST /api/settings → core-api → Settings (UPDATE)
   ```

5. **Equity Calculation:**
   ```
   MyTrade + BotTradeEvent → Background job → EquitySnapshot (INSERT)
   ```

## Query Patterns

### Get recent bot trades for a specific bot:
```sql
SELECT * FROM "BotTradeEvent"
WHERE "botId" = 'gemini-3-pro'
ORDER BY "timestamp" DESC
LIMIT 50;
```

### Get our trades that mirror a bot:
```sql
SELECT * FROM "MyTrade"
WHERE "botId" = 'gemini-3-pro'
ORDER BY "timestamp" DESC;
```

### Calculate daily PnL:
```sql
SELECT 
  SUM("pnl") as "dailyPnL"
FROM "MyTrade"
WHERE "timestamp" >= CURRENT_DATE
  AND "pnl" IS NOT NULL;
```

### Get equity curve (last 24 hours):
```sql
SELECT * FROM "EquitySnapshot"
WHERE "timestamp" >= NOW() - INTERVAL '24 hours'
ORDER BY "timestamp" ASC;
```

### Check if kill switch is active:
```sql
SELECT "killSwitch" FROM "SystemStatus" LIMIT 1;
```

## Migration Strategy

1. Initial migration creates all tables
2. Settings and SystemStatus are seeded with default values on first run
3. Future migrations can add indexes, columns, or tables as needed
4. JSON fields allow schema evolution without migrations for nested data

