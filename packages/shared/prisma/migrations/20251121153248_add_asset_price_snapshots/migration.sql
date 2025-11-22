-- CreateTable
CREATE TABLE "mirror_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botWallet" TEXT NOT NULL,
    "myWallet" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "leverageMultiplier" TEXT,
    "allocationUsd" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "fader_equity_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "asset_price_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MyTrade" (
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
    "mirrorAccountId" TEXT,
    CONSTRAINT "MyTrade_botTradeEventId_fkey" FOREIGN KEY ("botTradeEventId") REFERENCES "BotTradeEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MyTrade_strategyDecisionId_fkey" FOREIGN KEY ("strategyDecisionId") REFERENCES "StrategyDecision" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MyTrade_mirrorAccountId_fkey" FOREIGN KEY ("mirrorAccountId") REFERENCES "mirror_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MyTrade" ("asset", "botId", "botTradeEventId", "cloid", "closedAt", "hyperliquidOrderId", "id", "notional", "orderRequest", "orderResult", "pnl", "price", "side", "simulated", "size", "strategyDecisionId", "timestamp") SELECT "asset", "botId", "botTradeEventId", "cloid", "closedAt", "hyperliquidOrderId", "id", "notional", "orderRequest", "orderResult", "pnl", "price", "side", "simulated", "size", "strategyDecisionId", "timestamp" FROM "MyTrade";
DROP TABLE "MyTrade";
ALTER TABLE "new_MyTrade" RENAME TO "MyTrade";
CREATE INDEX "MyTrade_botId_timestamp_idx" ON "MyTrade"("botId", "timestamp");
CREATE INDEX "MyTrade_mirrorAccountId_idx" ON "MyTrade"("mirrorAccountId");
CREATE INDEX "MyTrade_timestamp_idx" ON "MyTrade"("timestamp");
CREATE INDEX "MyTrade_asset_idx" ON "MyTrade"("asset");
CREATE UNIQUE INDEX "MyTrade_cloid_key" ON "MyTrade"("cloid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "mirror_accounts_enabled_idx" ON "mirror_accounts"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_accounts_botWallet_key" ON "mirror_accounts"("botWallet");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_accounts_myWallet_key" ON "mirror_accounts"("myWallet");

-- CreateIndex
CREATE INDEX "fader_equity_snapshots_timestamp_idx" ON "fader_equity_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "asset_price_snapshots_timestamp_idx" ON "asset_price_snapshots"("timestamp");
