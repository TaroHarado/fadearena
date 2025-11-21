/**
 * Strategy Engine
 * 
 * Subscribes to BotTradeEvents and generates inverse orders
 * with risk controls
 */

import pino from 'pino';
import { PrismaClient } from '@fadearena/shared';
import { HyperliquidInfoClient } from './hyperliquidClient';
import { ExchangeClientFactory } from './exchangeClientFactory';
import type {
  BotTradeEvent,
  StrategyDecision,
  OrderRequest,
  OrderResult,
  Settings,
  BotConfig,
} from '@fadearena/shared';

const logger = pino({ name: 'StrategyEngine' });

export class StrategyEngine {
  private prisma: PrismaClient;
  private infoClient: HyperliquidInfoClient;
  private exchangeClientFactory: ExchangeClientFactory;
  private settingsCache: Settings | null = null;
  private settingsCacheTime = 0;
  private settingsCacheTTL = 5000; // 5 seconds

  constructor(
    prisma: PrismaClient,
    infoClient: HyperliquidInfoClient,
    exchangeClientFactory: ExchangeClientFactory
  ) {
    this.prisma = prisma;
    this.infoClient = infoClient;
    this.exchangeClientFactory = exchangeClientFactory;
  }

  /**
   * Process a bot trade event and generate strategy decision
   */
  async processBotTradeEvent(event: BotTradeEvent): Promise<StrategyDecision> {
    const correlationId = crypto.randomUUID();
    logger.info({ correlationId, eventId: event.id, botId: event.botId }, 'Processing bot trade event');

    // Load current settings
    const settings = await this.getSettings();

    // Get system status (kill switch)
    const systemStatus = await this.prisma.systemStatus.findUnique({
      where: { id: 'default' },
    });

    // Find mirror account for this bot
    const mirrorAccount = await this.prisma.mirrorAccount.findUnique({
      where: { id: event.botId },
    });

    if (!mirrorAccount) {
      return this.createSkipDecision(
        event,
        `Mirror account not found for bot ${event.botId}`,
        settings,
        systemStatus
      );
    }

    if (!mirrorAccount.enabled) {
      return this.createSkipDecision(
        event,
        `Mirror account is disabled for bot ${event.botId}`,
        settings,
        systemStatus
      );
    }

    // Find bot config (for backward compatibility and additional checks)
    const botConfig = settings.bots.find((b) => b.id === event.botId);
    if (!botConfig) {
      return this.createSkipDecision(event, 'Bot not found in configuration', settings, systemStatus);
    }

    // Use leverageMultiplier from mirror account if set, otherwise from bot config, otherwise default to 1.0
    const leverageMultiplier = mirrorAccount.leverageMultiplier
      ? Number(mirrorAccount.leverageMultiplier)
      : botConfig.leverageMultiplier || 1.0;

    // Risk checks
    const riskChecks = {
      botEnabled: botConfig.enabled && mirrorAccount.enabled,
      killSwitchActive: systemStatus?.killSwitch || false,
      withinGlobalExposureCap: true,
      withinAssetExposureCap: true,
      withinDailyLossLimit: true,
      leverageApplied: leverageMultiplier,
    };

    // Check if bot is enabled
    if (!botConfig.enabled || !mirrorAccount.enabled) {
      return this.createSkipDecision(event, 'Bot or mirror account is disabled', settings, systemStatus, riskChecks);
    }

    // Check kill switch
    if (systemStatus?.killSwitch) {
      return this.createSkipDecision(event, 'Kill switch is active', settings, systemStatus, riskChecks);
    }

    // Calculate inverse position
    const inverseSide = event.side === 'long' ? 'short' : 'long';
    const inverseSize = event.size * leverageMultiplier;

    // Get asset index
    const assetIndex = this.infoClient.getAssetIndex(event.asset);
    if (assetIndex === null) {
      return this.createSkipDecision(event, `Asset ${event.asset} not found`, settings, systemStatus, riskChecks);
    }

    // Check exposure caps
    const exposureCheck = await this.checkExposureCaps(event.asset, inverseSize * event.price, settings);
    riskChecks.withinGlobalExposureCap = exposureCheck.global;
    riskChecks.withinAssetExposureCap = exposureCheck.asset;

    if (!exposureCheck.global || !exposureCheck.asset) {
      return this.createSkipDecision(
        event,
        `Exposure cap exceeded: global=${exposureCheck.global}, asset=${exposureCheck.asset}`,
        settings,
        systemStatus,
        riskChecks
      );
    }

    // Check daily loss limit
    const dailyLoss = await this.getDailyLoss();
    riskChecks.withinDailyLossLimit = settings.dailyLossLimit === null || dailyLoss >= -settings.dailyLossLimit;

    if (!riskChecks.withinDailyLossLimit) {
      return this.createSkipDecision(
        event,
        `Daily loss limit exceeded: ${dailyLoss} < -${settings.dailyLossLimit}`,
        settings,
        systemStatus,
        riskChecks
      );
    }

    // Generate order request
    const orderRequest: OrderRequest = {
      asset: event.asset,
      assetIndex,
      side: inverseSide,
      size: inverseSize,
      price: 0, // Market order
      orderType: 'market',
      timeInForce: 'Ioc',
      reduceOnly: false,
      cloid: `fadearena-${event.walletAddress}-${event.timestamp}-${Date.now()}`,
      botId: event.botId,
      strategyDecisionId: '', // Will be set after decision is created
    };

    // Create execute decision
    const decision: StrategyDecision = {
      id: crypto.randomUUID(),
      botTradeEventId: event.id,
      timestamp: Date.now(),
      decision: 'execute',
      orderRequest,
      reason: `Inverse ${event.side} position, leverage ${leverageMultiplier}x`,
      riskChecks,
      settingsSnapshot: {
        mode: settings.mode,
        leverageMultiplier: leverageMultiplier,
        globalExposureCap: settings.globalExposureCap,
        assetExposureCap: settings.assetExposureCaps[event.asset] || null,
        dailyLossLimit: settings.dailyLossLimit,
      },
    };

    // Save decision to DB
    await this.saveStrategyDecision(decision);

    // Execute order (or simulate)
    if (settings.mode === 'live' && !systemStatus?.killSwitch) {
      await this.executeOrder(decision, correlationId, mirrorAccount.id);
    } else {
      logger.info({ correlationId, decisionId: decision.id }, 'Simulating order (simulation mode or kill switch)');
      await this.simulateOrder(decision, mirrorAccount.id);
    }

    return decision;
  }

  /**
   * Execute an order (live mode)
   * 
   * ⚠️ WARNING: This function places REAL orders on Hyperliquid.
   * It should ONLY be called when:
   * - settings.mode === 'live'
   * - systemStatus.killSwitch === false
   * 
   * In simulation mode, simulateOrder() is called instead.
   */
  private async executeOrder(decision: StrategyDecision, correlationId: string, mirrorAccountId: string): Promise<void> {
    if (!decision.orderRequest) {
      return;
    }

    const orderRequest = decision.orderRequest;

    try {
      logger.info(
        { correlationId, asset: orderRequest.asset, side: orderRequest.side, size: orderRequest.size, mirrorAccountId },
        'Placing live order'
      );

      // Get the appropriate exchange client for this mirror account
      const exchangeClient = await this.exchangeClientFactory.getClient(mirrorAccountId);
      if (!exchangeClient) {
        throw new Error(`Failed to get exchange client for mirror account ${mirrorAccountId}`);
      }

      // Place order via Hyperliquid
      const response = await exchangeClient.placeMarketOrder({
        assetIndex: orderRequest.assetIndex,
        isBuy: orderRequest.side === 'long',
        size: orderRequest.size.toString(),
        reduceOnly: orderRequest.reduceOnly,
        cloid: orderRequest.cloid,
      });

      // Create order result
      const orderResult: OrderResult = {
        id: crypto.randomUUID(),
        orderRequest,
        timestamp: Date.now(),
        status: response.status === 'ok' ? 'filled' : 'rejected',
        fillPrice: orderRequest.price || undefined,
        fillSize: orderRequest.size,
        hyperliquidOrderId: response.response?.data?.statuses?.[0]?.resting?.oid,
        simulated: false,
      };

      // Save trade to DB
      await this.saveMyTrade(decision, orderResult, mirrorAccountId);

      // Update system status
      await this.prisma.systemStatus.updateMany({
        where: { id: 'default' },
        data: { lastOrderTime: new Date() },
      });

      logger.info({ correlationId, orderId: orderResult.id }, 'Order executed successfully');
    } catch (error) {
      logger.error({ correlationId, error, decisionId: decision.id }, 'Failed to execute order');

      // Save failed order result
      const orderResult: OrderResult = {
        id: crypto.randomUUID(),
        orderRequest,
        timestamp: Date.now(),
        status: 'rejected',
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'EXECUTION_ERROR',
        simulated: false,
      };

      await this.saveMyTrade(decision, orderResult, mirrorAccountId);
    }
  }

  /**
   * Simulate an order (simulation mode)
   */
  private async simulateOrder(decision: StrategyDecision, mirrorAccountId: string): Promise<void> {
    if (!decision.orderRequest) {
      return;
    }

    const orderRequest = decision.orderRequest;

    // Create simulated order result
    const orderResult: OrderResult = {
      id: crypto.randomUUID(),
      orderRequest,
      timestamp: Date.now(),
      status: 'filled',
      fillPrice: orderRequest.price || 0,
      fillSize: orderRequest.size,
      simulated: true,
    };

    // Save simulated trade to DB
    await this.saveMyTrade(decision, orderResult, mirrorAccountId);

    logger.info({ decisionId: decision.id, orderId: orderResult.id }, 'Order simulated');
  }

  /**
   * Create a skip decision
   */
  private createSkipDecision(
    event: BotTradeEvent,
    skipReason: string,
    settings: Settings,
    systemStatus: any,
    riskChecks?: any
  ): StrategyDecision {
    const decision: StrategyDecision = {
      id: crypto.randomUUID(),
      botTradeEventId: event.id,
      timestamp: Date.now(),
      decision: 'skip',
      skipReason,
      riskChecks: riskChecks || {
        botEnabled: false,
        killSwitchActive: systemStatus?.killSwitch || false,
        withinGlobalExposureCap: true,
        withinAssetExposureCap: true,
        withinDailyLossLimit: true,
        leverageApplied: 0,
      },
      settingsSnapshot: {
        mode: settings.mode,
        leverageMultiplier: 0,
        globalExposureCap: settings.globalExposureCap,
        assetExposureCap: null,
        dailyLossLimit: settings.dailyLossLimit,
      },
    };

    // Save to DB asynchronously
    this.saveStrategyDecision(decision).catch((error) => {
      logger.error({ error, decisionId: decision.id }, 'Failed to save skip decision');
    });

    return decision;
  }

  /**
   * Get current settings (with caching)
   */
  private async getSettings(): Promise<Settings> {
    const now = Date.now();
    if (this.settingsCache && now - this.settingsCacheTime < this.settingsCacheTTL) {
      return this.settingsCache;
    }

    const settingsRecord = await this.prisma.settings.findUnique({
      where: { id: 'default' },
    });

    if (!settingsRecord) {
      throw new Error('Settings not found');
    }

    const systemStatus = await this.prisma.systemStatus.findUnique({
      where: { id: 'default' },
    });

    // Parse JSON strings for SQLite compatibility
    const botConfigs = typeof settingsRecord.botConfigs === 'string'
      ? JSON.parse(settingsRecord.botConfigs)
      : (settingsRecord.botConfigs as any[]) || [];
    const assetExposureCaps = typeof settingsRecord.assetExposureCaps === 'string'
      ? JSON.parse(settingsRecord.assetExposureCaps)
      : (settingsRecord.assetExposureCaps as Record<string, number | null>) || {};

    const settings: Settings = {
      mode: settingsRecord.mode as 'simulation' | 'live',
      globalExposureCap: settingsRecord.globalExposureCap ? Number(settingsRecord.globalExposureCap) : null,
      dailyLossLimit: settingsRecord.dailyLossLimit ? Number(settingsRecord.dailyLossLimit) : null,
      bots: botConfigs,
      assetExposureCaps,
      killSwitch: systemStatus?.killSwitch || false,
    };

    this.settingsCache = settings;
    this.settingsCacheTime = now;

    return settings;
  }

  /**
   * Check exposure caps
   */
  private async checkExposureCaps(asset: string, notional: number, settings: Settings): Promise<{
    global: boolean;
    asset: boolean;
  }> {
    // Get current total exposure
    const openTrades = await this.prisma.myTrade.findMany({
      where: {
        simulated: false,
        closedAt: null,
      },
    });

    const totalExposure = openTrades.reduce((sum, trade) => {
      return sum + Number(trade.notional);
    }, 0);

    const assetExposure = openTrades
      .filter((trade) => trade.asset === asset)
      .reduce((sum, trade) => sum + Number(trade.notional), 0);

    const newTotalExposure = totalExposure + notional;
    const newAssetExposure = assetExposure + notional;

    return {
      global: settings.globalExposureCap === null || newTotalExposure <= settings.globalExposureCap,
      asset: settings.assetExposureCaps[asset] === null || newAssetExposure <= (settings.assetExposureCaps[asset] || 0),
    };
  }

  /**
   * Get daily loss (negative PnL)
   */
  private async getDailyLoss(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trades = await this.prisma.myTrade.findMany({
      where: {
        timestamp: { gte: today },
        pnl: { not: null },
      },
    });

    return trades.reduce((sum, trade) => {
      return sum + (trade.pnl ? Number(trade.pnl) : 0);
    }, 0);
  }

  /**
   * Save strategy decision to DB
   */
  private async saveStrategyDecision(decision: StrategyDecision): Promise<void> {
    try {
      await this.prisma.strategyDecision.create({
        data: {
          id: decision.id,
          botTradeEventId: decision.botTradeEventId,
          timestamp: new Date(decision.timestamp),
          decision: decision.decision,
          reason: decision.reason,
          skipReason: decision.skipReason,
          riskChecks: JSON.stringify(decision.riskChecks), // JSON as string
          settingsSnapshot: JSON.stringify(decision.settingsSnapshot), // JSON as string
        },
      });
    } catch (error) {
      logger.error({ error, decisionId: decision.id }, 'Failed to save strategy decision');
    }
  }

  /**
   * Save my trade to DB
   */
  private async saveMyTrade(decision: StrategyDecision, orderResult: OrderResult, mirrorAccountId: string): Promise<void> {
    if (!decision.orderRequest) {
      return;
    }

    try {
      await this.prisma.myTrade.create({
        data: {
          id: orderResult.id,
          botTradeEventId: decision.botTradeEventId,
          strategyDecisionId: decision.id,
          timestamp: new Date(orderResult.timestamp),
          botId: decision.orderRequest.botId,
          asset: decision.orderRequest.asset,
          side: decision.orderRequest.side,
          size: decision.orderRequest.size.toString(), // SQLite stores as string
          price: (orderResult.fillPrice || decision.orderRequest.price).toString(), // SQLite stores as string
          notional: (decision.orderRequest.size * (orderResult.fillPrice || decision.orderRequest.price)).toString(), // SQLite stores as string
          orderRequest: JSON.stringify(decision.orderRequest), // JSON as string
          orderResult: JSON.stringify(orderResult), // JSON as string
          hyperliquidOrderId: orderResult.hyperliquidOrderId,
          cloid: decision.orderRequest.cloid,
          simulated: orderResult.simulated,
          mirrorAccountId: mirrorAccountId,
        },
      });
    } catch (error) {
      logger.error({ error, orderId: orderResult.id }, 'Failed to save my trade');
    }
  }

  /**
   * Invalidate settings cache (call when settings are updated)
   */
  invalidateSettingsCache(): void {
    this.settingsCache = null;
    this.settingsCacheTime = 0;
  }
}

