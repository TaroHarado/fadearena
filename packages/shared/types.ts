/**
 * FadeArena Shared TypeScript Types
 * 
 * These types are used across all modules (core-api, bot-ingestor, strategy-engine, trading-client)
 */

// ============================================================================
// Hyperliquid API Types (Raw)
// ============================================================================

export interface HyperliquidMetaResponse {
  universe: Array<{
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
  }>;
}

export interface HyperliquidUserStateResponse {
  assetPositions: Array<{
    position: {
      coin: string;
      entryPx: string;
      leverage: { type: string; value: string };
      liquidationPx: string;
      marginUsed: string;
      notional: string;
      unrealizedPnl: string;
      sz: string; // positive = long, negative = short
    };
  }>;
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
}

export interface HyperliquidFill {
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string; // "A" (taker) or "B" (maker)
  hash: string;
  oid: number;
  px: string;
  side: string; // "A" (buy) or "B" (sell)
  startPosition: string;
  sz: string;
  time: number; // timestamp ms
  tid: number;
}

export interface HyperliquidUserFillsResponse {
  closedPnl: string;
  fills: HyperliquidFill[];
}

export interface HyperliquidOrderRequest {
  action: {
    type: "order";
    orders: Array<{
      a: number; // asset index
      b: boolean; // isBuy
      p: string; // price ("0" for market)
      s: string; // size (base units)
      r: boolean; // reduceOnly
      t: {
        limit?: {
          tif: "Gtc" | "Ioc" | "Alo";
        };
        trigger?: {
          triggerPx: string;
          isMarket: boolean;
          tpsl: "tp" | "sl";
        };
      };
    }>;
    grouping: "na";
  };
  nonce: number; // timestamp ms
  signature: {
    r: string;
    s: string;
    v: number;
  };
  vaultAddress?: string;
}

export interface HyperliquidOrderResponse {
  status: "ok" | "err";
  response?: {
    type: string;
    data: any;
  };
  error?: string;
}

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Normalized representation of a bot's trade or position change
 * This is the output of bot-ingestor after processing Hyperliquid API responses
 */
export interface BotTradeEvent {
  id: string; // UUID
  botId: string; // e.g., "gemini-3-pro"
  walletAddress: string; // 0x... address
  timestamp: number; // ms
  eventType: "fill" | "position-change";
  
  // Trade details (for fills)
  asset: string; // e.g., "BTC"
  side: "long" | "short";
  size: number; // absolute size (always positive)
  price: number; // fill price
  notional: number; // USD value
  
  // Position context (for position changes)
  previousPosition?: {
    size: number; // can be negative for short
    notional: number;
  };
  currentPosition?: {
    size: number;
    notional: number;
  };
  
  // Metadata
  hyperliquidFillHash?: string; // For fills, the original hash
  rawData?: any; // Original Hyperliquid response (for debugging)
}

/**
 * Strategy decision made by strategy-engine
 * Represents what we decided to do (or not do) in response to a BotTradeEvent
 */
export interface StrategyDecision {
  id: string; // UUID
  botTradeEventId: string; // Reference to BotTradeEvent
  timestamp: number; // ms
  decision: "execute" | "skip";
  
  // If execute:
  orderRequest?: OrderRequest;
  reason?: string; // Why we're executing (e.g., "Inverse position, leverage 2x")
  
  // If skip:
  skipReason?: string; // Why we're skipping (e.g., "Bot disabled", "Exposure cap exceeded", "Daily loss limit")
  
  // Risk checks performed
  riskChecks: {
    botEnabled: boolean;
    killSwitchActive: boolean;
    withinGlobalExposureCap: boolean;
    withinAssetExposureCap: boolean;
    withinDailyLossLimit: boolean;
    leverageApplied: number;
  };
  
  // Settings snapshot (for audit)
  settingsSnapshot: {
    mode: "simulation" | "live";
    leverageMultiplier: number;
    globalExposureCap: number | null;
    assetExposureCap: number | null;
    dailyLossLimit: number | null;
  };
}

/**
 * Order request to be sent to Hyperliquid Exchange API
 */
export interface OrderRequest {
  asset: string; // e.g., "BTC"
  assetIndex: number; // Derived from meta
  side: "long" | "short";
  size: number; // In base units (e.g., 0.1 BTC)
  price: number; // 0 for market orders
  orderType: "market" | "limit";
  timeInForce?: "Gtc" | "Ioc" | "Alo"; // For limit orders
  reduceOnly: boolean; // true to only close position
  
  // Metadata
  cloid: string; // Client order ID (idempotent): "fadearena-{botWallet}-{timestamp}-{nonce}"
  botId: string; // Which bot triggered this
  strategyDecisionId: string; // Reference to StrategyDecision
}

/**
 * Result of order execution (from trading-client)
 */
export interface OrderResult {
  id: string; // UUID (our internal ID)
  orderRequest: OrderRequest;
  timestamp: number; // ms
  status: "pending" | "filled" | "partially-filled" | "rejected" | "cancelled";
  
  // If filled:
  fillPrice?: number;
  fillSize?: number;
  hyperliquidOrderId?: number; // From Hyperliquid response
  
  // If rejected:
  error?: string;
  errorCode?: string;
  
  // Simulation flag
  simulated: boolean; // true if simulation mode (no real order placed)
}

/**
 * Equity point for time-series charts
 */
export interface EquityPoint {
  timestamp: number; // ms
  botsAggregate: number; // Aggregate equity of all tracked bots
  fadeArena: number; // Our inverse strategy equity
  
  // Per-bot equity (optional, for detailed views)
  bots?: Record<string, number>; // botId -> equity
}

// ============================================================================
// Position Types
// ============================================================================

export interface Position {
  asset: string;
  side: "long" | "short";
  size: number; // Absolute size (always positive)
  notional: number; // USD value
  entryPrice: number;
  unrealizedPnl: number;
  leverage?: number;
}

export interface BotPosition extends Position {
  botId: string;
  walletAddress: string;
}

export interface MyPosition extends Position {
  botId: string; // Which bot this mirrors
  orderId: string; // Our order that opened this
}

// ============================================================================
// Settings Types
// ============================================================================

export interface BotConfig {
  id: string;
  name: string;
  walletAddress: string;
  enabled: boolean;
  leverageMultiplier: number; // 0.1 to 10.0
}

export interface Settings {
  mode: "simulation" | "live";
  globalExposureCap: number | null; // USD, null = unlimited
  dailyLossLimit: number | null; // USD, null = unlimited
  bots: BotConfig[];
  assetExposureCaps: Record<string, number | null>; // asset -> USD cap
  killSwitch: boolean; // Stored in SystemStatus, but included here for convenience
}

// ============================================================================
// API Response Types (for core-api)
// ============================================================================

export interface StateResponse {
  mode: "simulation" | "live";
  killSwitch: boolean;
  equity: {
    total: number;
    botsAggregate: number;
    fadeArena: number;
  };
  openPositions: {
    count: number;
    totalNotional: number;
  };
  systemStatus: {
    hyperliquidConnected: boolean;
    lastEventTime: number | null;
    lastOrderTime: number | null;
    uptime: number;
  };
  dailyPnL: {
    bots: number;
    fadeArena: number;
  };
}

export interface MirrorAccountInfo {
  id: string;
  botWallet: string;
  myWallet: string;
  label: string | null;
  enabled: boolean;
  leverageMultiplier: number | null;
  allocationUsd: number | null;
}

export interface ModelResponse {
  bots: Array<{
    id: string;
    name: string;
    walletAddress: string;
    enabled: boolean;
    leverageMultiplier: number;
    mirrorAccount: MirrorAccountInfo | null;
    currentPositions: Position[];
    myMirroredPositions: Position[];
    stats: {
      totalTrades: number;
      winRate: number;
      totalPnL: number;
      dailyPnL: number;
    };
  }>;
}

export interface TradeResponse {
  id: string;
  type: "bot" | "mine";
  botId: string | null;
  timestamp: number;
  asset: string;
  side: "long" | "short";
  size: number;
  price: number;
  notional: number;
  pnl: number | null;
  simulated: boolean;
}

export interface EquityResponse {
  series: EquityPoint[];
  interval: string;
  startTime: number;
  endTime: number;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type WebSocketMessageType =
  | "bot-trade"
  | "my-trade"
  | "state-update"
  | "settings-update"
  | "error"
  | "subscribe"
  | "unsubscribe";

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
}

export interface BotTradeWebSocketMessage extends WebSocketMessage {
  type: "bot-trade";
  data: {
    botId: string;
    walletAddress: string;
    event: BotTradeEvent;
  };
}

export interface MyTradeWebSocketMessage extends WebSocketMessage {
  type: "my-trade";
  data: {
    id: string;
    timestamp: number;
    botId: string;
    asset: string;
    side: "long" | "short";
    size: number;
    price: number;
    notional: number;
    simulated: boolean;
    orderId: string | null;
    reason: string;
  };
}

export interface StateUpdateWebSocketMessage extends WebSocketMessage {
  type: "state-update";
  data: Partial<StateResponse>;
}

export interface SettingsUpdateWebSocketMessage extends WebSocketMessage {
  type: "settings-update";
  data: Settings;
}

export interface ErrorWebSocketMessage extends WebSocketMessage {
  type: "error";
  data: {
    message: string;
    code: string;
    timestamp: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type TradingMode = "simulation" | "live";
export type OrderSide = "long" | "short";
export type OrderType = "market" | "limit";
export type TimeInForce = "Gtc" | "Ioc" | "Alo";

// Asset index mapping (derived from meta)
export type AssetIndexMap = Map<string, number>;

// Bot identifiers
export const BOT_IDS = [
  "gemini-3-pro",
  "grok-4",
  "qwen3-max",
  "kimi-k2-thinking",
  "deepseek-chat-v3.1",
  "claude-sonnet",
] as const;

export type BotId = typeof BOT_IDS[number];

