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

// Risk management constants
const FADE_MIN_ABS_SIZE = 0.001; // Minimum absolute size to trade (reduced to allow smaller trades)
const FADE_MIN_NOTIONAL_PER_TRADE = 5; // Minimum notional per trade (USD) - 5 USD minimum
const FADE_MAX_NOTIONAL_PER_TRADE = 10000; // Maximum notional per trade (USD)
const FADE_MAX_NOTIONAL_PER_SYMBOL = 50000; // Maximum notional per symbol (USD)

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

    // Calculate inverse position based on position change
    // If bot closes position (currentSize = 0), we close ours
    // If bot opens/increases position, we open/increase inverse
    const botCurrentSize = event.currentPosition?.size ?? event.size;
    const botPreviousSize = event.previousPosition?.size ?? 0;
    
    // If bot closed position (currentSize = 0, previousSize > 0), close ours
    if (botCurrentSize === 0 && botPreviousSize > 0) {
      // Close our position with reduceOnly
      const assetIndex = this.infoClient.getAssetIndex(event.asset);
      if (assetIndex === null) {
        return this.createSkipDecision(event, `Asset ${event.asset} not found`, settings, systemStatus, riskChecks);
      }

      // Get our current position size to close it
      // We need to close the inverse of what bot had
      // Calculate based on notional, not contract size
      const botPreviousNotional = Math.abs(botPreviousSize * event.price);
      const ourPreviousNotional = botPreviousNotional * leverageMultiplier; // Our position was 20x smaller
      const closeSize = ourPreviousNotional / event.price; // Convert back to contract size
      
      const botPreviousSide = botPreviousSize > 0 ? 'long' : 'short';
      const ourCloseSide = botPreviousSide === 'long' ? 'short' : 'long'; // Inverse

      const orderRequest: OrderRequest = {
        asset: event.asset,
        assetIndex,
        side: ourCloseSide,
        size: closeSize,
        price: 0, // Market order
        orderType: 'market',
        timeInForce: 'Ioc',
        reduceOnly: true, // IMPORTANT: Only reduce, don't open new position
        cloid: `fadearena-close-${event.walletAddress}-${event.timestamp}-${Date.now()}`,
        botId: event.botId,
        strategyDecisionId: '',
      };

      const decision: StrategyDecision = {
        id: crypto.randomUUID(),
        botTradeEventId: event.id,
        timestamp: Date.now(),
        decision: 'execute',
        orderRequest,
        reason: `Bot closed ${botPreviousSide} position, closing our ${ourCloseSide} position`,
        riskChecks,
        settingsSnapshot: {
          mode: settings.mode,
          leverageMultiplier: leverageMultiplier,
          globalExposureCap: settings.globalExposureCap,
          assetExposureCap: settings.assetExposureCaps[event.asset] || null,
          dailyLossLimit: settings.dailyLossLimit,
        },
      };

      await this.saveStrategyDecision(decision);

      if (settings.mode === 'live' && !systemStatus?.killSwitch) {
        await this.executeOrder(decision, correlationId, mirrorAccount.id);
      } else {
        logger.info({ correlationId, decisionId: decision.id }, 'Simulating close order');
        await this.simulateOrder(decision, mirrorAccount.id);
      }

      return decision;
    }

    // If bot opens new position or increases existing, open/increase inverse
    // Logic: Bot LONG $100 with leverage 5x → We SHORT $5 with leverage 5x
    // Size is 20x smaller by NOTIONAL, not by contract size
    // Leverage stays the same, only notional changes
    
    // Calculate bot's notional value
    const botNotional = botCurrentSize * event.price;
    
    // Our notional is 20x smaller (leverageMultiplier = 0.05 = 1/20)
    const ourNotional = botNotional * leverageMultiplier;
    
    // Calculate our size (contracts) based on our notional
    const inverseSize = ourNotional / event.price;
    
    // Determine inverse side (opposite of bot)
    const inverseSide = event.side === 'long' ? 'short' : 'long';
    
    // Calculate notional value
    let notional = inverseSize * event.price;
    let finalSize = inverseSize;

    // If notional is less than minimum, increase size to reach minimum
    if (notional < FADE_MIN_NOTIONAL_PER_TRADE) {
      // Calculate new size to reach minimum notional
      finalSize = FADE_MIN_NOTIONAL_PER_TRADE / event.price;
      notional = FADE_MIN_NOTIONAL_PER_TRADE;
    }

    // Check minimum size (as backup check) - use finalSize after adjustment
    if (finalSize < FADE_MIN_ABS_SIZE) {
      return this.createSkipDecision(
        event,
        `Size too small: ${finalSize} < ${FADE_MIN_ABS_SIZE}`,
        settings,
        systemStatus,
        riskChecks
      );
    }

    // Check maximum notional per trade (use final notional after adjustment)
    if (notional > FADE_MAX_NOTIONAL_PER_TRADE) {
      return this.createSkipDecision(
        event,
        `Notional per trade exceeded: $${notional.toFixed(2)} > $${FADE_MAX_NOTIONAL_PER_TRADE}`,
        settings,
        systemStatus,
        riskChecks
      );
    }

    // Get asset index (getAssetIndex handles xyz: prefix and stock perps from metaAndAssetCtxs)
    const assetIndex = this.infoClient.getAssetIndex(event.asset);
    
    if (assetIndex === null) {
      logger.warn(
        { 
          asset: event.asset, 
          botId: event.botId,
          assetIndexMapSize: this.infoClient['assetIndexMap']?.size || 0
        }, 
        `Asset ${event.asset} not found in asset index map`
      );
      return this.createSkipDecision(event, `Asset ${event.asset} not found`, settings, systemStatus, riskChecks);
    }

    // Check exposure caps (global and per-symbol)
    // Only check if caps are actually set in settings (null/undefined = no limit)
    const exposureCheck = await this.checkExposureCaps(event.asset, notional, settings);
    riskChecks.withinGlobalExposureCap = exposureCheck.global;
    riskChecks.withinAssetExposureCap = exposureCheck.asset;

    // Only skip if caps are set AND exceeded
    if (!exposureCheck.global || !exposureCheck.asset) {
      logger.warn(
        {
          asset: event.asset,
          notional,
          globalOk: exposureCheck.global,
          assetOk: exposureCheck.asset,
          globalCap: settings.globalExposureCap,
          assetCap: settings.assetExposureCaps[event.asset],
        },
        'Exposure cap check failed - skipping order'
      );
      return this.createSkipDecision(
        event,
        `Exposure cap exceeded: global=${exposureCheck.global}, asset=${exposureCheck.asset}`,
        settings,
        systemStatus,
        riskChecks
      );
    }

    // Check maximum notional per symbol
    const symbolExposure = await this.getSymbolExposure(event.asset);
    if (symbolExposure + notional > FADE_MAX_NOTIONAL_PER_SYMBOL) {
      return this.createSkipDecision(
        event,
        `Symbol notional cap exceeded: ${symbolExposure + notional} > ${FADE_MAX_NOTIONAL_PER_SYMBOL}`,
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

    // Round finalSize to avoid JavaScript floating point errors
    // Round to 8 decimal places (sufficient precision for most assets)
    const roundedSize = Math.round(finalSize * 100000000) / 100000000;
    
    // Generate order request
    const orderRequest: OrderRequest = {
      asset: event.asset,
      assetIndex,
      side: inverseSide,
      size: roundedSize, // Rounded to avoid floating point errors
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

    // Log decision details
    logger.info(
      {
        correlationId,
        decisionId: decision.id,
        botId: event.botId,
        asset: event.asset,
        side: orderRequest.side,
        size: orderRequest.size,
        notional,
        mode: settings.mode,
        killSwitch: systemStatus?.killSwitch,
      },
      'Strategy decision created'
    );

    // Execute order (or simulate)
    if (settings.mode === 'live' && !systemStatus?.killSwitch) {
      await this.executeOrder(decision, correlationId, mirrorAccount.id);
    } else {
      logger.info(
        { correlationId, decisionId: decision.id, mode: settings.mode, killSwitch: systemStatus?.killSwitch },
        'Simulating order (simulation mode or kill switch)'
      );
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

    // Get wallet address from mirror account for verification
    const mirrorAccount = await this.prisma.mirrorAccount.findUnique({
      where: { id: mirrorAccountId },
    });

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
      
      if (mirrorAccount && mirrorAccount.myWallet) {
        // Check if wallet exists on Hyperliquid before placing order
        // This prevents "User or API Wallet does not exist" errors
        try {
          const walletState = await this.infoClient.getUserState(mirrorAccount.myWallet);
          logger.debug(
            {
              wallet: mirrorAccount.myWallet.substring(0, 10) + '...',
              accountValue: walletState.marginSummary?.accountValue,
            },
            'Wallet exists on Hyperliquid'
          );
        } catch (walletCheckError) {
          const errorMsg = walletCheckError instanceof Error ? walletCheckError.message : String(walletCheckError);
          if (errorMsg.includes('does not exist') || errorMsg.includes('not found')) {
            logger.error(
              {
                wallet: mirrorAccount.myWallet.substring(0, 10) + '...',
                mirrorAccountId,
                error: errorMsg,
              },
              'Wallet does not exist on Hyperliquid - deposit required before trading'
            );
            throw new Error(`Wallet ${mirrorAccount.myWallet.substring(0, 10)}... does not exist on Hyperliquid. Please deposit funds first.`);
          }
          // Other errors - log but continue (might be temporary)
          logger.warn(
            {
              wallet: mirrorAccount.myWallet.substring(0, 10) + '...',
              error: errorMsg,
            },
            'Could not verify wallet existence, proceeding anyway'
          );
        }
      }

      // Place order via Hyperliquid
      try {
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // If wallet doesn't exist, skip this order but don't fail the entire sync
        if (errorMessage.includes('does not exist') || errorMessage.includes('not found') || errorMessage.includes('Must deposit')) {
          logger.warn(
            {
              decisionId: decision.id,
              wallet: mirrorAccount?.myWallet?.substring(0, 10) + '...' || 'unknown',
              mirrorAccountId,
              asset: orderRequest.asset,
              error: errorMessage,
            },
            'Skipping order - wallet does not exist on Hyperliquid (deposit required)'
          );
          
          // Create a rejected order result for tracking
          const rejectedOrderResult: OrderResult = {
            id: crypto.randomUUID(),
            orderRequest,
            timestamp: Date.now(),
            status: 'rejected',
            fillPrice: undefined,
            fillSize: 0,
            hyperliquidOrderId: undefined,
            simulated: false,
          };
          
          // Save rejected trade to DB for tracking
          await this.saveMyTrade(decision, rejectedOrderResult, mirrorAccountId);
          
          // Return early - don't throw to allow other orders to proceed
          return;
        }
        
        logger.error(
          {
            correlationId,
            error,
            errorMessage: errorMessage,
            errorStack: error instanceof Error ? error.stack : undefined,
            decisionId: decision.id,
            orderRequest: decision.orderRequest ? {
              asset: decision.orderRequest.asset,
              assetIndex: decision.orderRequest.assetIndex,
              side: decision.orderRequest.side,
              size: decision.orderRequest.size,
              notional: decision.orderRequest.size * (decision.orderRequest.price || 0),
            } : null,
          },
          'Failed to execute order'
        );

        // Save failed order result
        const orderResult: OrderResult = {
          id: crypto.randomUUID(),
          orderRequest,
          timestamp: Date.now(),
          status: 'rejected',
          error: errorMessage,
          errorCode: 'EXECUTION_ERROR',
          simulated: false,
        };

        await this.saveMyTrade(decision, orderResult, mirrorAccountId);
      }
    } catch (outerError) {
      // Handle errors from wallet check or exchange client creation
      const errorMessage = outerError instanceof Error ? outerError.message : String(outerError);
      
      if (errorMessage.includes('does not exist') || errorMessage.includes('not found') || errorMessage.includes('Must deposit')) {
        logger.warn(
          {
            decisionId: decision.id,
            wallet: mirrorAccount?.myWallet?.substring(0, 10) + '...' || 'unknown',
            mirrorAccountId,
            asset: orderRequest.asset,
            error: errorMessage,
          },
          'Skipping order - wallet does not exist on Hyperliquid (deposit required)'
        );
        
        // Create a rejected order result for tracking
        const rejectedOrderResult: OrderResult = {
          id: crypto.randomUUID(),
          orderRequest,
          timestamp: Date.now(),
          status: 'rejected',
          fillPrice: undefined,
          fillSize: 0,
          hyperliquidOrderId: undefined,
          simulated: false,
        };
        
        // Save rejected trade to DB for tracking
        await this.saveMyTrade(decision, rejectedOrderResult, mirrorAccountId);
        
        // Return early - don't throw to allow other orders to proceed
        return;
      }
      
      // Re-throw other errors
      throw outerError;
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

    // Log skip decision
    logger.warn(
      { 
        botId: event.botId, 
        asset: event.asset, 
        skipReason, 
        decisionId: decision.id,
        mode: settings.mode,
        killSwitch: systemStatus?.killSwitch 
      },
      'Skipping order'
    );

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

    const totalExposure = openTrades.reduce((sum: number, trade: any) => {
      return sum + Number(trade.notional);
    }, 0);

    const assetExposure = openTrades
      .filter((trade: any) => trade.asset === asset)
      .reduce((sum: number, trade: any) => sum + Number(trade.notional), 0);

    const newTotalExposure = totalExposure + notional;
    const newAssetExposure = assetExposure + notional;

    // Check global exposure cap
    const globalOk = settings.globalExposureCap === null || newTotalExposure <= settings.globalExposureCap;
    
    // Check asset exposure cap
    // If asset cap is not set (null or undefined), there's no limit (allow all)
    const assetCap = settings.assetExposureCaps[asset];
    const assetOk = assetCap === null || assetCap === undefined || newAssetExposure <= assetCap;
    
    // Log exposure check details (use info level so we can see it)
    logger.info(
      {
        asset,
        notional,
        totalExposure,
        newTotalExposure,
        assetExposure,
        newAssetExposure,
        globalCap: settings.globalExposureCap,
        assetCap,
        globalOk,
        assetOk,
        openTradesCount: openTrades.length,
      },
      'Exposure cap check'
    );
    
    return {
      global: globalOk,
      asset: assetOk,
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

    return trades.reduce((sum: number, trade: any) => {
      return sum + (trade.pnl ? Number(trade.pnl) : 0);
    }, 0);
  }

  /**
   * Get current exposure for a specific symbol
   */
  private async getSymbolExposure(asset: string): Promise<number> {
    const openTrades = await this.prisma.myTrade.findMany({
      where: {
        asset,
        simulated: false,
        closedAt: null,
      },
    });

    return openTrades.reduce((sum: number, trade: any) => {
      return sum + Math.abs(Number(trade.notional || 0));
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

