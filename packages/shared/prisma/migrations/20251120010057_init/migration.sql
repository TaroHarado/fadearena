-- CreateTable
CREATE TABLE "BotTradeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "eventType" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "notional" TEXT NOT NULL,
    "previousSize" TEXT,
    "previousNotional" TEXT,
    "currentSize" TEXT,
    "currentNotional" TEXT,
    "hyperliquidFillHash" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StrategyDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botTradeEventId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "skipReason" TEXT,
    "riskChecks" TEXT NOT NULL,
    "settingsSnapshot" TEXT NOT NULL,
    CONSTRAINT "StrategyDecision_botTradeEventId_fkey" FOREIGN KEY ("botTradeEventId") REFERENCES "BotTradeEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MyTrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botTradeEventId" TEXT,
    "strategyDecisionId" TEXT,
    "timestamp" DATETIME NOT NULL,
    "botId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "notional" TEXT NOT NULL,
    "orderRequest" TEXT NOT NULL,
    "orderResult" TEXT,
    "hyperliquidOrderId" INTEGER,
    "cloid" TEXT NOT NULL,
    "pnl" TEXT,
    "closedAt" DATETIME,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MyTrade_botTradeEventId_fkey" FOREIGN KEY ("botTradeEventId") REFERENCES "BotTradeEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MyTrade_strategyDecisionId_fkey" FOREIGN KEY ("strategyDecisionId") REFERENCES "StrategyDecision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "mode" TEXT NOT NULL DEFAULT 'simulation',
    "globalExposureCap" TEXT,
    "dailyLossLimit" TEXT,
    "botConfigs" TEXT NOT NULL,
    "assetExposureCaps" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "system_status" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "killSwitchActivatedAt" DATETIME,
    "killSwitchDeactivatedAt" DATETIME,
    "hyperliquidConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastHyperliquidCheck" DATETIME,
    "lastEventTime" DATETIME,
    "lastOrderTime" DATETIME,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "equity_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "botsAggregate" TEXT NOT NULL,
    "fadeArena" TEXT NOT NULL,
    "botEquities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "system_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT
);

-- CreateIndex
CREATE INDEX "BotTradeEvent_botId_timestamp_idx" ON "BotTradeEvent"("botId", "timestamp");

-- CreateIndex
CREATE INDEX "BotTradeEvent_timestamp_idx" ON "BotTradeEvent"("timestamp");

-- CreateIndex
CREATE INDEX "BotTradeEvent_asset_idx" ON "BotTradeEvent"("asset");

-- CreateIndex
CREATE INDEX "StrategyDecision_botTradeEventId_idx" ON "StrategyDecision"("botTradeEventId");

-- CreateIndex
CREATE INDEX "StrategyDecision_timestamp_idx" ON "StrategyDecision"("timestamp");

-- CreateIndex
CREATE INDEX "StrategyDecision_decision_idx" ON "StrategyDecision"("decision");

-- CreateIndex
CREATE INDEX "MyTrade_botId_timestamp_idx" ON "MyTrade"("botId", "timestamp");

-- CreateIndex
CREATE INDEX "MyTrade_timestamp_idx" ON "MyTrade"("timestamp");

-- CreateIndex
CREATE INDEX "MyTrade_asset_idx" ON "MyTrade"("asset");

-- CreateIndex
CREATE UNIQUE INDEX "MyTrade_cloid_key" ON "MyTrade"("cloid");

-- CreateIndex
CREATE INDEX "equity_snapshots_timestamp_idx" ON "equity_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "system_events_timestamp_idx" ON "system_events"("timestamp");

-- CreateIndex
CREATE INDEX "system_events_level_idx" ON "system_events"("level");

-- CreateIndex
CREATE INDEX "system_events_category_idx" ON "system_events"("category");
