/**
 * Hyperliquid API Client
 * 
 * Two-layer client:
 * - infoClient: Read-only operations (user state, fills, meta)
 * - exchangeClient: Trading operations (orders, leverage, cancels)
 */

import { ethers } from 'ethers';
import pino from 'pino';
import type {
  HyperliquidMetaResponse,
  HyperliquidUserStateResponse,
  HyperliquidRawUserState,
  HyperliquidUserFillsResponse,
  HyperliquidFill,
  HyperliquidOrderRequest,
  HyperliquidOrderResponse,
  AssetIndexMap,
  HyperliquidSubAccount,
  HyperliquidPerpDex,
  HyperliquidClearinghouseState,
  HyperliquidPerpFill,
  NormalizedPerpPosition,
  NormalizedFill,
} from '@fadearena/shared';
import { HyperliquidSigningService } from './hyperliquidSigningService';

const logger = pino({ name: 'HyperliquidClient' });

// ============================================================================
// Info Client (Read-only)
// ============================================================================

export class HyperliquidInfoClient {
  private baseUrl: string;
  private assetIndexMap: AssetIndexMap = new Map();
  private metaCache: HyperliquidMetaResponse | null = null;
  private perpDexIndexMap: Map<string, number> = new Map(); // dex name -> perp_dex_index
  private dexMetaCache: Map<string, any> = new Map(); // dex name -> meta response

  constructor(baseUrl: string) {
    // Ensure we're using the official Hyperliquid Info API
    const expectedUrl = 'https://api.hyperliquid.xyz/info';
    
    if (!baseUrl || !baseUrl.includes('api.hyperliquid.xyz/info')) {
      logger.warn(
        {
          providedUrl: baseUrl,
          expectedUrl,
          usingUrl: expectedUrl,
        },
        'Info client URL is not the official Hyperliquid API - using official URL instead'
      );
      this.baseUrl = expectedUrl;
    } else {
      this.baseUrl = baseUrl;
    }
    
    logger.info(
      {
        infoUrl: this.baseUrl,
        urlCorrect: this.baseUrl === expectedUrl,
      },
      'HyperliquidInfoClient initialized'
    );
  }

  /**
   * Fetch asset metadata and build index map
   * Also tries to get stock perps from metaAndAssetCtxs
   */
  async getMeta(): Promise<HyperliquidMetaResponse> {
    if (this.metaCache) {
      return this.metaCache;
    }

    try {
      const response = await this.post<HyperliquidMetaResponse>({
        type: 'meta',
      });

      this.metaCache = response;
      
      // Build asset index map from universe (for default perp DEX, asset = index)
      response.universe.forEach((asset: { name: string }, index: number) => {
        this.assetIndexMap.set(asset.name, index);
      });
      
      // Load perp DEXs to get perp_dex_index for builder-deployed perps
      await this.loadPerpDexs();
      
      // Load meta for xyz DEX and map stock perps correctly
      await this.loadDexMeta('xyz');

      logger.info({ assetCount: response.universe.length }, 'Fetched asset metadata');
      return response;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch meta');
      throw error;
    }
  }

  /**
   * Load perp DEXs to get perp_dex_index mapping
   */
  private async loadPerpDexs(): Promise<void> {
    try {
      const response = await this.post<any>({
        type: 'perpDexs',
      });
      
      if (Array.isArray(response)) {
        response.forEach((dex: any, index: number) => {
          if (dex && dex.name) {
            this.perpDexIndexMap.set(dex.name, index);
            logger.info({ dexName: dex.name, perpDexIndex: index }, 'Loaded perp DEX');
          }
        });
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to load perp DEXs');
    }
  }

  /**
   * Load meta for a specific DEX and map its assets
   */
  private async loadDexMeta(dexName: string): Promise<void> {
    try {
      const response = await this.post<any>({
        type: 'meta',
        dex: dexName,
      });
      
      if (response && response.universe) {
        this.dexMetaCache.set(dexName, response);
        
        const perpDexIndex = this.perpDexIndexMap.get(dexName);
        if (perpDexIndex === undefined) {
          logger.warn({ dexName }, 'Perp DEX index not found for dex');
          return;
        }
        
        // Map each asset in this DEX's universe
        response.universe.forEach((asset: { name: string }, indexInMeta: number) => {
          // Formula: asset = 100000 + perp_dex_index * 10000 + index_in_meta
          const assetId = 100000 + perpDexIndex * 10000 + indexInMeta;
          
          // Map both "xyz:TSLA" and "TSLA" to the same asset ID
          this.assetIndexMap.set(`${dexName}:${asset.name}`, assetId);
          this.assetIndexMap.set(asset.name, assetId);
          
          logger.debug(
            { dexName, coin: asset.name, indexInMeta, perpDexIndex, assetId },
            'Mapped builder-deployed perp asset'
          );
        });
      }
    } catch (error) {
      logger.warn({ error, dexName }, 'Failed to load meta for DEX');
    }
  }

  /**
   * Get asset index for a coin symbol
   * Handles:
   * - Regular perps (BTC, ETH): asset = index in default meta.universe
   * - Builder-deployed perps (xyz:TSLA): asset = 100000 + perp_dex_index * 10000 + index_in_meta
   */
  getAssetIndex(coin: string): number | null {
    // Check if it's a builder-deployed perp (has "dex:coin" format)
    if (coin.includes(':')) {
      const [dexName, coinName] = coin.split(':');
      
      // Try exact match first
      let assetId = this.assetIndexMap.get(coin);
      if (assetId !== undefined) {
        return assetId;
      }
      
      // Try without dex prefix (just coin name)
      assetId = this.assetIndexMap.get(coinName);
      if (assetId !== undefined) {
        return assetId;
      }
      
      // If not found, try to load meta for this DEX
      if (!this.dexMetaCache.has(dexName)) {
        // Load meta asynchronously (but don't wait)
        this.loadDexMeta(dexName).catch(err => 
          logger.warn({ error: err, dexName }, 'Failed to load DEX meta')
        );
      }
      
      logger.warn({ coin, dexName, coinName }, 'Builder-deployed perp not found in asset index map');
      return null;
    }
    
    // Regular perp (no ":" separator) - asset = index in default meta.universe
    const index = this.assetIndexMap.get(coin);
    if (index !== undefined) {
      return index;
    }
    
    logger.warn({ coin, mapSize: this.assetIndexMap.size }, 'Asset not found in index map');
    return null;
  }

  /**
   * Get user state (positions and margin summary)
   * Uses clearinghouseState format which works with Hyperliquid API
   */
  async getUserState(wallet: string): Promise<HyperliquidUserStateResponse> {
    try {
      const response = await this.post<HyperliquidUserStateResponse>({
        type: 'clearinghouseState',
        user: wallet,
      });
      return response;
    } catch (error) {
      logger.error({ error, wallet }, 'Failed to get user state');
      throw error;
    }
  }

  /**
   * Get user fills (recent trades)
   * 
   * IMPORTANT: Uses master/sub-account address, NOT agent wallet address
   */
  async getUserFills(
    wallet: string,
    startTimeMs?: number,
    endTimeMs?: number
  ): Promise<HyperliquidUserFillsResponse> {
    let payload: any;
    
    if (startTimeMs !== undefined || endTimeMs !== undefined) {
      payload = {
        type: 'userFillsByTime',
        user: wallet,
        ...(startTimeMs !== undefined && { startTime: startTimeMs }),
        ...(endTimeMs !== undefined && { endTime: endTimeMs }),
      };
    } else {
      payload = {
        type: 'userFills',
        user: wallet,
      };
    }

    try {
      // Make direct fetch call to get detailed error information
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      // Log detailed response for debugging
      logger.info(
        {
          url: this.baseUrl,
          status: response.status,
          statusText: response.statusText,
          requestBody: payload,
          responseText: responseText.substring(0, 500), // First 500 chars to avoid huge logs
          responseLength: responseText.length,
          wallet: wallet.substring(0, 10) + '...',
        },
        'Hyperliquid userFills response'
      );

      if (!response.ok) {
        const errorMsg = `HTTP ${response.status} ${response.statusText}: ${responseText}`;
        logger.error(
          {
            url: this.baseUrl,
            status: response.status,
            statusText: response.statusText,
            responseText,
            requestBody: payload,
            wallet: wallet.substring(0, 10) + '...',
            errorMessage: errorMsg,
          },
          'HTTP error from Hyperliquid Info API (userFills)'
        );
        throw new Error(errorMsg);
      }

      // Parse response
      let data: HyperliquidUserFillsResponse | HyperliquidFill[];
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(
          {
            responseText,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            wallet: wallet.substring(0, 10) + '...',
          },
          'Failed to parse userFills response as JSON'
        );
        throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Handle both array response (userFills) and object response (userFillsByTime)
      if (Array.isArray(data)) {
        // API returned array directly - wrap it in the expected format
        return {
          fills: data,
          closedPnl: '0', // Not available in array response
        } as HyperliquidUserFillsResponse;
      }
      
      return data as HyperliquidUserFillsResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(
        {
          errorMessage,
          errorStack,
          wallet: wallet.substring(0, 10) + '...',
          requestBody: payload,
          url: this.baseUrl,
        },
        'Failed to get user fills'
      );
      throw error;
    }
  }

  /**
   * Get subaccounts for a user
   */
  async getSubAccounts(user: string): Promise<HyperliquidSubAccount[]> {
    try {
      const response = await this.post<HyperliquidSubAccount[]>({
        type: 'subAccounts',
        user,
      });
      return response;
    } catch (error) {
      logger.error({ error, user }, 'Failed to get subaccounts');
      throw error;
    }
  }

  /**
   * Get list of perp DEX exchanges
   */
  async getPerpDexs(): Promise<HyperliquidPerpDex[]> {
    try {
      const response = await this.post<HyperliquidPerpDex[]>({
        type: 'perpDexs',
      });
      return response;
    } catch (error) {
      logger.error({ error }, 'Failed to get perp DEXs');
      throw error;
    }
  }

  /**
   * Get clearinghouse state for a user on a specific DEX
   */
  async getClearinghouseState(params: {
    user: string;
    dex?: string;
  }): Promise<HyperliquidClearinghouseState> {
    try {
      const payload: any = {
        type: 'clearinghouseState',
        user: params.user,
      };
      
      if (params.dex !== undefined) {
        payload.dex = params.dex;
      }

      const response = await this.post<HyperliquidClearinghouseState>(payload);
      return response;
    } catch (error) {
      logger.error({ error, user: params.user, dex: params.dex }, 'Failed to get clearinghouse state');
      throw error;
    }
  }

  /**
   * Get recent perp fills for a user
   */
  async getUserRecentPerpFills(params: {
    user: string;
    dex?: string;
    limit?: number;
  }): Promise<HyperliquidPerpFill[]> {
    try {
      const payload: any = {
        type: 'userRecentPerpFills',
        user: params.user,
      };
      
      if (params.dex !== undefined) {
        payload.dex = params.dex;
      }
      
      if (params.limit !== undefined) {
        payload.limit = params.limit;
      }

      const response = await this.post<HyperliquidPerpFill[]>(payload);
      return response;
    } catch (error) {
      // Fallback to userFills if userRecentPerpFills doesn't work
      logger.warn({ error, user: params.user }, 'Failed to get recent perp fills, trying userFills');
      try {
        const fillsResponse = await this.getUserFills(params.user);
        return (fillsResponse.fills || []) as HyperliquidPerpFill[];
      } catch (fallbackError) {
        logger.error({ error: fallbackError, user: params.user }, 'Failed to get user fills as fallback');
        throw fallbackError;
      }
    }
  }

  /**
   * Get normalized list of open perp positions for an account
   * Checks all perp DEXs (including xyz for stock perps) to find positions
   */
  async getPerpPositions(address: string): Promise<NormalizedPerpPosition[]> {
    try {
      const allPositions: NormalizedPerpPosition[] = [];

      // First, get list of perp DEXs
      let perpDexs: string[] = [];
      try {
        const dexList = await this.getPerpDexs();
        perpDexs = dexList
          .filter((dex): dex is HyperliquidPerpDex => dex !== null)
          .map((dex) => dex.name);
      } catch (error) {
        logger.warn({ error }, 'Failed to get perp DEXs, will try default and xyz');
        // Fallback: try default (empty) and xyz
        perpDexs = ['', 'xyz'];
      }

      // If no DEXs found, try default and xyz
      if (perpDexs.length === 0) {
        perpDexs = ['', 'xyz'];
      }

      // Check each DEX for positions
      for (const dex of perpDexs) {
        try {
          const clearinghouseState = await this.getClearinghouseState({
            user: address,
            // Pass empty string as-is for default DEX, undefined means no dex param
            dex: dex === '' ? '' : dex || undefined,
          });

          // Extract positions from assetPositions
          if (clearinghouseState.assetPositions && Array.isArray(clearinghouseState.assetPositions)) {
            for (const assetPos of clearinghouseState.assetPositions) {
              const pos = assetPos.position || assetPos;
              const coin = pos.coin || '';
              // Use szi for perp DEX positions (xyz), sz for regular positions
              // szi is signed integer size (negative = short, positive = long)
              const sz = Number(pos.szi ?? pos.sz ?? 0);
              
              if (sz === 0) continue; // Skip zero positions

              const side: 'long' | 'short' = sz >= 0 ? 'long' : 'short';
              const size = Math.abs(sz);
              const entryPx = Number(pos.entryPx || 0);
              // Use positionValue for notional in perp DEX responses (xyz)
              // positionValue is the current value of the position
              const notional = Number(
                pos.positionValue || 
                pos.notional || 
                (pos as any).rawUsd || 
                0
              );
              const unrealizedPnl = Number(pos.unrealizedPnl || 0);
              
              // Determine margin mode from leverage or default to isolated
              const leverage = pos.leverage ? Number(pos.leverage.value || 1) : undefined;
              const marginMode: 'cross' | 'isolated' = pos.leverage?.type === 'cross' ? 'cross' : 'isolated';
              
              allPositions.push({
                coin,
                side,
                size,
                entryPx,
                notional,
                unrealizedPnl,
                marginMode,
                leverage,
                marginUsed: pos.marginUsed ? Number(pos.marginUsed) : undefined,
                liquidationPx: pos.liquidationPx ? Number(pos.liquidationPx) : undefined,
                dex: dex || undefined, // Store which DEX this position is on
              });
            }
          }
        } catch (error) {
          // Log but continue - some DEXs might not have positions
          logger.debug({ error, dex, address }, 'No positions found on DEX or error fetching');
        }
      }

      return allPositions;
    } catch (error) {
      logger.error({ error, address }, 'Failed to get perp positions');
      throw error;
    }
  }

  /**
   * Get recent fills normalized format
   * Gets fills from all DEXs (including xyz for stock perps)
   */
  async getRecentFills(address: string, opts?: { limit?: number }): Promise<NormalizedFill[]> {
    try {
      const limit = opts?.limit || 10;
      
      // Try getting fills without time range first (gets all fills)
      // This includes fills from all DEXs including xyz
      let fillsResponse: HyperliquidUserFillsResponse;
      try {
        // Get all fills (no time range) - this includes xyz:* fills
        fillsResponse = await this.getUserFills(address);
      } catch (error) {
        // Fallback: try with time range
        const endTime = Date.now();
        const startTime = endTime - 30 * 24 * 60 * 60 * 1000; // Last 30 days
        fillsResponse = await this.getUserFills(address, startTime, endTime);
      }
      
      const fills = fillsResponse.fills || [];

      const normalized: NormalizedFill[] = fills
        .sort((a: HyperliquidFill, b: HyperliquidFill) => b.time - a.time)
        .slice(0, limit)
        .map((fill: HyperliquidFill) => ({
          time: fill.time,
          coin: fill.coin,
          side: fill.side === 'A' ? 'buy' : 'sell',
          size: Number(fill.sz),
          price: Number(fill.px),
          realizedPnl: fill.closedPnl ? Number(fill.closedPnl) : undefined,
          hash: fill.hash,
          orderId: fill.oid,
        }));

      return normalized;
    } catch (error) {
      logger.error({ error, address }, 'Failed to get recent fills');
      throw error;
    }
  }

  /**
   * Generic POST request with retry logic
   */
  private async post<T>(payload: any, retries = 3): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          // Log detailed error info for debugging
          const responseText = await response.text();
          
          // Handle rate limiting (429) with exponential backoff
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(1000 * Math.pow(2, attempt), 30000);
            
            logger.warn({
              status: response.status,
              responseBody: responseText,
              attempt: attempt + 1,
              retryAfter,
              delay,
              url: this.baseUrl,
            }, 'Rate limited by Hyperliquid Info API - will retry');
            
            // If this is the last attempt, throw error
            if (attempt >= retries - 1) {
              throw new Error(`HTTP ${response.status}: ${responseText}`);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            lastError = new Error(`HTTP ${response.status}: ${responseText}`);
            continue;
          }
          
          logger.error({
            status: response.status,
            statusText: response.statusText,
            responseBody: responseText,
            requestBody: JSON.stringify(payload),
            url: this.baseUrl,
          }, 'HTTP error from Hyperliquid API');
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          logger.warn({ attempt: attempt + 1, delay, error: lastError }, 'Retrying API call');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }
}

// ============================================================================
// Exchange Client (Trading)
// ============================================================================

export interface PlaceMarketOrderParams {
  assetIndex: number;
  isBuy: boolean;
  size: string; // In base units (e.g., "0.1" for BTC)
  reduceOnly?: boolean;
  cloid?: string; // Client order ID for idempotency
}

export interface UpdateLeverageParams {
  assetIndex: number;
  leverage: number;
}

export class HyperliquidExchangeClient {
  private baseUrl: string;
  private walletAddress: string;
  private privateKey: string;
  private signer: ethers.Wallet;
  private usePythonSigningService: boolean;

  private signingService?: HyperliquidSigningService;

  constructor(baseUrl: string, walletAddress: string, privateKey: string, usePythonSigningService = true) {
    // CRITICAL: Must use Hyperliquid Public RPC endpoint
    // Must be exactly: https://api.hyperliquid.xyz/exchange
    const expectedUrl = 'https://api.hyperliquid.xyz/exchange';
    
    if (!baseUrl || baseUrl !== expectedUrl) {
      logger.error(
        { 
          providedUrl: baseUrl, 
          expectedUrl: expectedUrl,
          note: 'Exchange endpoint MUST be https://api.hyperliquid.xyz/exchange. Custom RPCs do not work for /exchange'
        },
        'CRITICAL: Exchange URL is incorrect!'
      );
      // Force correct URL
      this.baseUrl = expectedUrl;
    } else {
      this.baseUrl = baseUrl;
    }
    
    this.walletAddress = walletAddress.toLowerCase(); // CRITICAL: Lowercase addresses as per Hyperliquid docs
    this.privateKey = privateKey;
    this.usePythonSigningService = usePythonSigningService;
    
    // Initialize ethers wallet for signing (still needed for fallback or validation)
    this.signer = new ethers.Wallet(privateKey);
    
    // CRITICAL: Verify that the signer's address matches the provided wallet address
    const signerAddress = this.signer.address.toLowerCase();
    const providedAddress = walletAddress.toLowerCase();
    
    if (signerAddress !== providedAddress) {
      logger.error(
        {
          providedAddress,
          signerAddress,
          note: 'Private key does not match wallet address! This will cause "User or API Wallet does not exist" errors.',
        },
        'CRITICAL: Address mismatch detected!'
      );
      throw new Error(`Private key does not match wallet address. Provided: ${providedAddress}, Signer: ${signerAddress}`);
    }
    
    // Initialize Python signing service if enabled
    if (this.usePythonSigningService) {
      this.signingService = new HyperliquidSigningService();
      // Check if service is available
      this.signingService.healthCheck().then((healthy: boolean) => {
        if (healthy) {
          logger.info('Python signing service is available');
        } else {
          logger.warn('Python signing service is not available - falling back to local signing');
          this.usePythonSigningService = false;
        }
      }).catch(() => {
        logger.warn('Python signing service health check failed - falling back to local signing');
        this.usePythonSigningService = false;
      });
    }
    
    logger.info(
      { 
        exchangeUrl: this.baseUrl,
        usePythonSigningService: this.usePythonSigningService,
        walletAddress: this.walletAddress.substring(0, 10) + '...',
        signerAddress: signerAddress.substring(0, 10) + '...',
        addressesMatch: signerAddress === this.walletAddress,
        urlCorrect: this.baseUrl === expectedUrl,
      }, 
      'HyperliquidExchangeClient initialized'
    );
  }

  /**
   * Place a market order
   * Uses IOC (Immediate or Cancel) for market behavior
   */
  async placeMarketOrder(params: PlaceMarketOrderParams): Promise<HyperliquidOrderResponse> {
    const { assetIndex, isBuy, size, reduceOnly = false, cloid } = params;

    // Ensure assetIndex is a number (not string)
    const assetIndexNum = typeof assetIndex === 'number' ? assetIndex : Number(assetIndex);
    
    // Format size as string, rounding to avoid JavaScript floating point errors
    // Round to 8 decimal places (sufficient for most assets) and remove trailing zeros
    const sizeNum = typeof size === 'string' ? parseFloat(size) : size;
    const sizeStr = sizeNum.toFixed(8).replace(/\.?0+$/, ''); // Round to 8 decimals, remove trailing zeros
    
    // CRITICAL: Order of fields matters for msgpack!
    // Python SDK creates order as: {"a": ..., "b": ..., "p": ..., "s": ..., "r": ..., "t": {...}}
    // We must maintain this exact order for msgpack encoding to match Python SDK
    const order: any = {};
    order.a = assetIndexNum; // Must be number
    order.b = isBuy; // Must be boolean
    order.p = '0'; // Price "0" for market orders (string)
    order.s = sizeStr; // Size as string (properly formatted, no floating point errors)
    order.r = reduceOnly; // Must be boolean
    order.t = {
      limit: {
        tif: 'Ioc' as const, // Immediate or Cancel for market behavior
      },
    };
    
    // Add cloid only if provided (optional field)
    // Note: According to docs, cloid should be 128-bit hex string (0x...)
    // Our format "fadearena-..." is not valid hex, so we skip it for now
    // TODO: Convert cloid to proper 128-bit hex format if needed
    // if (cloid) {
    //   order.c = cloid;
    // }

    // CRITICAL: Order of fields matters for msgpack!
    // Python SDK creates action as: {"type": "order", "orders": [...], "grouping": "na"}
    // We must maintain this exact order for msgpack encoding to match Python SDK
    const action: any = {};
    action.type = 'order';
    action.orders = [order];
    action.grouping = 'na';

    return this.executeAction(action);
  }

  /**
   * Cancel order by client order ID
   */
  async cancelOrderByCloid(assetIndex: number, cloid: string): Promise<HyperliquidOrderResponse> {
    const action = {
      type: 'cancelByCloid' as const,
      cancels: [
        {
          a: assetIndex,
          c: cloid,
        },
      ],
    };

    return this.executeAction(action);
  }

  /**
   * Update leverage for an asset
   */
  async updateLeverage(params: UpdateLeverageParams): Promise<HyperliquidOrderResponse> {
    const { assetIndex, leverage } = params;

    const action = {
      type: 'updateLeverage' as const,
      asset: assetIndex,
      isCross: false, // Isolated margin (can be made configurable)
      leverage: leverage,
    };

    return this.executeAction(action);
  }

  /**
   * Execute an action on the exchange API
   * 
   * IMPORTANT: Each retry must use a NEW nonce and NEW signature.
   * Hyperliquid rejects duplicate nonces, so we generate fresh nonce/signature for each attempt.
   */
  private async executeAction(action: any, retries = 3): Promise<HyperliquidOrderResponse> {
    // Log order details for debugging (before retry loop)
    if (action.type === 'order' && action.orders && action.orders.length > 0) {
      const order = action.orders[0];
      logger.info(
        {
          assetIndex: order.a,
          assetIndexType: typeof order.a,
          isBuy: order.b,
          isBuyType: typeof order.b,
          size: order.s,
          sizeType: typeof order.s,
          price: order.p,
          priceType: typeof order.p,
          reduceOnly: order.r,
          reduceOnlyType: typeof order.r,
          cloid: order.c,
          cloidType: typeof order.c,
          wallet: this.walletAddress.substring(0, 10) + '...',
        },
        'Placing order on Hyperliquid'
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Generate NEW nonce for each attempt (critical for Hyperliquid)
        // Using Date.now() ensures uniqueness, but add small random offset to avoid collisions
        const nonce = Date.now() + (attempt * 10); // Add attempt offset to ensure uniqueness
        
        // Use Python signing service if available, otherwise fall back to local signing
        let signature: { r: string; s: string; v: number };
        if (this.usePythonSigningService && this.signingService) {
          try {
            const signResponse = await this.signingService.signAction({ action, nonce });
            signature = signResponse.signature;
            logger.debug(
              {
                messageHash: signResponse.messageHash?.substring(0, 20) + '...',
                signatureR: signature.r.substring(0, 20) + '...',
                signatureV: signature.v,
              },
              'Action signed via Python service'
            );
          } catch (error) {
            logger.warn(
              {
                error: error instanceof Error ? error.message : String(error),
                note: 'Falling back to local signing',
              },
              'Python signing service failed'
            );
            // Fall back to local signing
            signature = await this.signAction(action, nonce);
          }
        } else {
          signature = await this.signAction(action, nonce);
        }

        // Build payload exactly as per Hyperliquid documentation
        // Only these fields are allowed: action, nonce, signature
        const payload: any = {
          action,
          nonce,
          signature,
        };
        // Serialize payload to JSON string
        const bodyString = JSON.stringify(payload);
        
        // CRITICAL: Log everything before sending
        logger.info(
          {
            url: this.baseUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            bodyString: bodyString, // Full body string for curl testing
            bodyLength: bodyString.length,
            payloadKeys: Object.keys(payload), // Should be ONLY: action, nonce, signature
            payloadStructure: {
              hasAction: !!payload.action,
              actionType: payload.action?.type,
              ordersCount: payload.action?.orders?.length,
              hasNonce: typeof payload.nonce === 'number',
              hasSignature: !!payload.signature,
              signatureKeys: payload.signature ? Object.keys(payload.signature) : [],
            },
            firstOrder: payload.action?.orders?.[0],
            // Check for any extra fields that shouldn't be there
            extraFields: Object.keys(payload).filter(key => !['action', 'nonce', 'signature'].includes(key)),
          },
          'Hyperliquid Exchange API request (FULL DETAILS)'
        );
        
        // Verify URL is correct
        if (!this.baseUrl || !this.baseUrl.includes('api.hyperliquid.xyz/exchange')) {
          logger.error(
            { 
              actualUrl: this.baseUrl, 
              expectedUrl: 'https://api.hyperliquid.xyz/exchange' 
            },
            'CRITICAL: Exchange URL is incorrect!'
          );
          throw new Error(`Invalid exchange URL: ${this.baseUrl}. Must be https://api.hyperliquid.xyz/exchange`);
        }
        
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: bodyString,
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Handle rate limiting (429) with exponential backoff
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(1000 * Math.pow(2, attempt), 30000);
            
            logger.warn(
              {
                status: response.status,
                errorText,
                attempt: attempt + 1,
                retryAfter,
                delay,
                url: this.baseUrl,
              },
              'Rate limited by Hyperliquid Exchange API - will retry'
            );
            
            // If this is the last attempt, throw error
            if (attempt >= retries - 1) {
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            lastError = new Error(`HTTP ${response.status}: ${errorText}`);
            continue;
          }
          
          logger.error(
            {
              status: response.status,
              statusText: response.statusText,
              errorText,
              attempt: attempt + 1,
              url: this.baseUrl,
            },
            'HTTP error from Hyperliquid Exchange API'
          );
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json() as HyperliquidOrderResponse;
        
        // Log response for debugging
        logger.info(
          {
            status: data.status,
            response: JSON.stringify(data, null, 2),
            attempt: attempt + 1,
          },
          'Hyperliquid Exchange API response'
        );
        
        if (data.status === 'err') {
          const errorMsg = data.error || 'Order rejected by exchange';
          
          // If it's a duplicate nonce error, we can retry with a new nonce
          // (which we already do by generating new nonce in the loop)
          if (errorMsg.includes('duplicate nonce') || errorMsg.includes('Invalid nonce')) {
            logger.warn(
              {
                error: errorMsg,
                attempt: attempt + 1,
                nonce,
              },
              'Duplicate nonce detected - will retry with new nonce'
            );
            // Continue to next retry (which will generate new nonce)
            lastError = new Error(`Order rejected by Hyperliquid: ${errorMsg}`);
            continue;
          }
          
          // If wallet doesn't exist, this is a permanent error - don't retry
          if (errorMsg.includes('does not exist') || errorMsg.includes('not found') || errorMsg.includes('Must deposit')) {
            logger.error(
              {
                error: errorMsg,
                wallet: this.walletAddress.substring(0, 10) + '...',
                fullResponse: JSON.stringify(data, null, 2),
                attempt: attempt + 1,
              },
              'Wallet does not exist on Hyperliquid - deposit required (no retry)'
            );
            // Don't retry - this is a permanent error
            throw new Error(`Wallet does not exist on Hyperliquid: ${errorMsg}`);
          }
          
          logger.error(
            {
              error: errorMsg,
              fullResponse: JSON.stringify(data, null, 2),
              payload: JSON.stringify(payload, null, 2),
              attempt: attempt + 1,
            },
            'Order rejected by Hyperliquid'
          );
          throw new Error(`Order rejected by Hyperliquid: ${errorMsg}`);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          logger.warn(
            { 
              attempt: attempt + 1, 
              delay, 
              error: lastError,
              errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
              errorStack: lastError instanceof Error ? lastError.stack : undefined,
            }, 
            'Retrying exchange API call'
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Sign an action with the wallet private key
   * 
   * STRICTLY FOLLOWING Hyperliquid Python SDK sign_l1_action:
   * https://github.com/hyperliquid-dex/hyperliquid-python-sdk
   * 
   * Exact steps from Python SDK:
   * 1. Create array [action, nonce] (order matters for msgpack!)
   * 2. Encode to msgpack bytes
   * 3. Hash with keccak256 (Ethereum standard)
   * 4. Sign the hash with Ethereum private key
   * 5. Return r, s, v components
   * 
   * CRITICAL: The message MUST be [action, nonce] as an array, not an object
   * This ensures correct field order in msgpack encoding
   */
  private async signAction(action: any, nonce: number): Promise<{ r: string; s: string; v: number }> {
    const { encode } = await import('@msgpack/msgpack');
    
    // Step 1: Create message array [action, nonce] - EXACTLY as Python SDK does
    // Python: message = [action, nonce]
    const messageArray = [action, nonce];
    
    // Step 2: Encode to msgpack bytes
    // Python: msgpack_bytes = msgpack.packb(message)
    const msgpackBytes = encode(messageArray);
    
    // Step 3: Hash with keccak256
    // Python: message_hash = Web3.keccak(msgpack_bytes)
    const messageHash = ethers.keccak256(msgpackBytes);
    
    // CRITICAL: Log msgpack bytes for debugging (first 100 bytes)
    logger.info(
      {
        msgpackBytesLength: msgpackBytes.length,
        msgpackBytesHex: Array.from(msgpackBytes.slice(0, 100)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
        actionType: action.type,
        actionKeys: Object.keys(action),
        orderKeys: action.orders?.[0] ? Object.keys(action.orders[0]) : [],
        nonce,
        messageHash: messageHash.substring(0, 20) + '...',
      },
      'Msgpack encoding details (CRITICAL FOR DEBUGGING)'
    );
    
    // Step 4: Sign the hash
    // Python: signature = Account.signHash(message_hash, private_key)
    // CRITICAL: Hyperliquid expects the hash to be signed directly (not with Ethereum message prefix)
    // ethers.js sign() method automatically adds the Ethereum message prefix, so we use signingKey.sign() instead
    const hashBytes = ethers.getBytes(messageHash);
    const signature = await this.signer.signingKey.sign(hashBytes);
    
    // Step 5: Return r, s, v components
    // Python SDK returns (r, s, v) tuple
    // CRITICAL: signature.r and signature.s are already hex strings from ethers.js
    // They may or may not have '0x' prefix, ensure they do
    let r = signature.r;
    let s = signature.s;
    
    // Ensure r and s have '0x' prefix (ethers.js may return without it)
    if (!r.startsWith('0x')) {
      r = '0x' + r;
    }
    if (!s.startsWith('0x')) {
      s = '0x' + s;
    }
    
    // CRITICAL: Verify signature can recover the correct address BEFORE sending
    // This is the same recovery method Hyperliquid uses
    const recoveredAddress = ethers.recoverAddress(messageHash, { r, s, v: signature.v });
    
    if (recoveredAddress.toLowerCase() !== this.walletAddress.toLowerCase()) {
      logger.error(
        {
          expectedAddress: this.walletAddress,
          recoveredAddress: recoveredAddress.toLowerCase(),
          messageHash,
          signatureR: r,
          signatureS: s,
          signatureV: signature.v,
          action: JSON.stringify(action),
          nonce,
          msgpackBytesLength: msgpackBytes.length,
        },
        'CRITICAL: Signature recovery test failed! This will cause "User or API Wallet does not exist" errors.'
      );
      throw new Error(`Signature recovery failed: expected ${this.walletAddress}, got ${recoveredAddress.toLowerCase()}`);
    }
    
    logger.info(
      {
        expectedAddress: this.walletAddress,
        recoveredAddress: recoveredAddress.toLowerCase(),
        addressesMatch: recoveredAddress.toLowerCase() === this.walletAddress.toLowerCase(),
        signatureR: r.substring(0, 20) + '...',
        signatureS: s.substring(0, 20) + '...',
        signatureV: signature.v,
        messageHash: messageHash.substring(0, 20) + '...',
        actionType: action.type,
        nonce,
      },
      'Signature recovery test - BEFORE sending to Hyperliquid'
    );
    
    return {
      r,
      s,
      v: signature.v,
    };
  }
}

// ============================================================================
// Combined Client
// ============================================================================

export class HyperliquidClient {
  public info: HyperliquidInfoClient;
  public exchange: HyperliquidExchangeClient;

  constructor(
    infoUrl: string,
    exchangeUrl: string,
    walletAddress: string,
    privateKey: string
  ) {
    this.info = new HyperliquidInfoClient(infoUrl);
    this.exchange = new HyperliquidExchangeClient(exchangeUrl, walletAddress, privateKey);
  }

  /**
   * Initialize: fetch meta to build asset index map
   */
  async initialize(): Promise<void> {
    await this.info.getMeta();
    logger.info('Hyperliquid client initialized');
  }
}

