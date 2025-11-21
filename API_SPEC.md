# FadeArena API Specification

## Base URL
- Development: `http://localhost:3001`
- Production: TBD

## Authentication
Currently: None (single-user system). Future: Add API key if needed.

---

## Endpoints

### GET /api/state
Get global system summary including mode, equity, open positions, and system status.

**Response:**
```json
{
  "mode": "simulation" | "live",
  "killSwitch": boolean,
  "equity": {
    "total": number,           // Total equity in USD
    "botsAggregate": number,   // Aggregate equity of all bots
    "fadeArena": number        // Our inverse strategy equity
  },
  "openPositions": {
    "count": number,
    "totalNotional": number    // Total position size in USD
  },
  "systemStatus": {
    "hyperliquidConnected": boolean,
    "lastEventTime": number | null,  // timestamp ms
    "lastOrderTime": number | null,   // timestamp ms
    "uptime": number                  // seconds since start
  },
  "dailyPnL": {
    "bots": number,
    "fadeArena": number
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### GET /api/models
Get list of all tracked bots with their wallet addresses, current positions, and statistics.

**Response:**
```json
{
  "bots": [
    {
      "id": string,                    // Bot identifier (e.g., "gemini-3-pro")
      "name": string,                  // Display name
      "walletAddress": string,         // 0x... address
      "enabled": boolean,              // Is this bot active?
      "leverageMultiplier": number,    // Configured leverage
      "currentPositions": [
        {
          "asset": string,             // e.g., "BTC"
          "side": "long" | "short",
          "size": number,              // Position size (positive for long, negative for short)
          "notional": number,          // USD value
          "entryPrice": number,
          "unrealizedPnl": number
        }
      ],
      "myMirroredPositions": [
        {
          "asset": string,
          "side": "long" | "short",   // Inverse of bot's side
          "size": number,
          "notional": number,
          "entryPrice": number,
          "unrealizedPnl": number
        }
      ],
      "stats": {
        "totalTrades": number,
        "winRate": number,             // 0-1
        "totalPnL": number,            // Cumulative PnL in USD
        "dailyPnL": number
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### GET /api/trades
Get paginated list of recent trades (both bot trades and our inverse trades).

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50, max: 200) - Items per page
- `botId` (string, optional) - Filter by bot ID
- `type` (string, optional) - Filter by type: "bot" | "mine" | "all" (default: "all")
- `startTime` (number, optional) - Filter trades after this timestamp (ms)
- `endTime` (number, optional) - Filter trades before this timestamp (ms)

**Response:**
```json
{
  "trades": [
    {
      "id": string,
      "type": "bot" | "mine",
      "botId": string | null,          // null if type is "mine"
      "timestamp": number,              // ms
      "asset": string,
      "side": "long" | "short",
      "size": number,
      "price": number,
      "notional": number,               // USD value
      "pnl": number | null,             // null for opening trades
      "simulated": boolean              // true if simulation mode
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server error

---

### GET /api/equity
Get time-series equity curves for bots aggregate and FadeArena strategy.

**Query Parameters:**
- `startTime` (number, optional) - Start timestamp (ms), default: 24 hours ago
- `endTime` (number, optional) - End timestamp (ms), default: now
- `interval` (string, optional) - Data point interval: "1m" | "5m" | "15m" | "1h" | "1d" (default: "5m")
- `botId` (string, optional) - Get equity for specific bot (if not provided, returns aggregate)

**Response:**
```json
{
  "series": [
    {
      "timestamp": number,              // ms
      "botsAggregate": number,          // Aggregate equity of all bots
      "fadeArena": number,              // Our inverse strategy equity
      "bots": {                         // Per-bot equity (if botId not specified)
        "gemini-3-pro": number,
        "grok-4": number,
        // ... other bots
      }
    }
  ],
  "interval": string,
  "startTime": number,
  "endTime": number
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server error

---

### GET /api/settings
Get current strategy configuration.

**Response:**
```json
{
  "mode": "simulation" | "live",
  "globalExposureCap": number | null,   // USD, null = unlimited
  "dailyLossLimit": number | null,      // USD, null = unlimited
  "bots": [
    {
      "id": string,
      "enabled": boolean,
      "leverageMultiplier": number
    }
  ],
  "assetExposureCaps": {                // Per-asset caps in USD
    "BTC": number | null,
    "ETH": number | null,
    // ... other assets
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### POST /api/settings
Update strategy configuration.

**Request Body:**
```json
{
  "mode"?: "simulation" | "live",
  "globalExposureCap"?: number | null,
  "dailyLossLimit"?: number | null,
  "bots"?: [
    {
      "id": string,
      "enabled"?: boolean,
      "leverageMultiplier"?: number
    }
  ],
  "assetExposureCaps"?: {
    "BTC"?: number | null,
    "ETH"?: number | null,
    // ... other assets
  }
}
```

**Validation Rules:**
- `leverageMultiplier`: Must be between 0.1 and 10.0
- `globalExposureCap`: Must be positive or null
- `dailyLossLimit`: Must be positive or null
- `assetExposureCaps` values: Must be positive or null
- `mode`: Must be "simulation" or "live"

**Response:**
```json
{
  "success": boolean,
  "settings": {
    // Same structure as GET /api/settings response
  },
  "errors"?: string[]                  // Validation errors if any
}
```

**Status Codes:**
- `200 OK` - Success (with updated settings)
- `400 Bad Request` - Validation errors
- `500 Internal Server Error` - Server error

---

### POST /api/kill-switch
Activate or deactivate the kill switch.

**Request Body:**
```json
{
  "active": boolean
}
```

**Response:**
```json
{
  "success": boolean,
  "killSwitch": boolean,               // Current state
  "message": string
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid request body
- `500 Internal Server Error` - Server error

**Behavior:**
- When `active: true`: Immediately stops all trading (no new orders)
- When `active: false`: Resumes trading on next bot event
- System continues tracking bot positions even when kill switch is active

---

### GET /api/health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "checks": {
    "database": {
      "status": "ok" | "error",
      "latency": number                // ms
    },
    "hyperliquid": {
      "status": "ok" | "error",
      "latency": number,               // ms
      "lastSuccessfulCall": number | null  // timestamp ms
    }
  },
  "timestamp": number                  // Current server time (ms)
}
```

**Status Codes:**
- `200 OK` - System is healthy or degraded
- `503 Service Unavailable` - System is unhealthy

**Status Determination:**
- `healthy`: All checks pass, latency < 1s
- `degraded`: Some checks pass but with high latency or intermittent failures
- `unhealthy`: Critical checks fail (DB unavailable, Hyperliquid unreachable)

---

## WebSocket API

### Connection
- **URL:** `ws://localhost:3001/ws`
- **Protocol:** Standard WebSocket (text messages, JSON payloads)

### Message Types

#### Client → Server

**Subscribe to channels (optional):**
```json
{
  "type": "subscribe",
  "channels": ["bot-trade", "my-trade", "state-update"]
}
```

**Unsubscribe:**
```json
{
  "type": "unsubscribe",
  "channels": ["bot-trade"]
}
```

#### Server → Client

**bot-trade** - New bot trade detected:
```json
{
  "type": "bot-trade",
  "data": {
    "botId": string,
    "walletAddress": string,
    "event": {
      "id": string,
      "timestamp": number,
      "asset": string,
      "side": "long" | "short",
      "size": number,
      "price": number,
      "notional": number,
      "eventType": "fill" | "position-change"
    }
  }
}
```

**my-trade** - Our inverse trade executed:
```json
{
  "type": "my-trade",
  "data": {
    "id": string,
    "timestamp": number,
    "botId": string,
    "asset": string,
    "side": "long" | "short",
    "size": number,
    "price": number,
    "notional": number,
    "simulated": boolean,
    "orderId": string | null,          // Hyperliquid order ID if live
    "reason": string                   // Why this trade was executed
  }
}
```

**state-update** - System state changed:
```json
{
  "type": "state-update",
  "data": {
    "mode"?: "simulation" | "live",
    "killSwitch"?: boolean,
    "equity"?: {
      "total": number,
      "botsAggregate": number,
      "fadeArena": number
    },
    "systemStatus"?: {
      "hyperliquidConnected": boolean,
      "lastEventTime": number | null,
      "lastOrderTime": number | null
    }
  }
}
```

**settings-update** - Settings changed:
```json
{
  "type": "settings-update",
  "data": {
    // Same structure as GET /api/settings response
  }
}
```

**error** - Error occurred:
```json
{
  "type": "error",
  "data": {
    "message": string,
    "code": string,                    // Error code
    "timestamp": number
  }
}
```

### Connection Lifecycle
1. Client connects to `/ws`
2. Server sends initial state (optional welcome message)
3. Client can subscribe to channels (default: all channels)
4. Server broadcasts events as they occur
5. Client can unsubscribe or close connection

### Error Handling
- Invalid message format: Server sends `error` message, connection remains open
- Server error: Server sends `error` message, connection may close
- Client should implement reconnection logic with exponential backoff

