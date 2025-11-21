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

const logger = pino({ name: 'HyperliquidClient' });

// ============================================================================
// Info Client (Read-only)
// ============================================================================

export class HyperliquidInfoClient {
  private baseUrl: string;
  private assetIndexMap: AssetIndexMap = new Map();
  private metaCache: HyperliquidMetaResponse | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch asset metadata and build index map
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
      
      // Build asset index map
      response.universe.forEach((asset: { name: string }, index: number) => {
        this.assetIndexMap.set(asset.name, index);
      });

      logger.info({ assetCount: response.universe.length }, 'Fetched asset metadata');
      return response;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch meta');
      throw error;
    }
  }

  /**
   * Get asset index for a coin symbol
   */
  getAssetIndex(coin: string): number | null {
    return this.assetIndexMap.get(coin) ?? null;
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
   */
  async getUserFills(
    wallet: string,
    startTimeMs?: number,
    endTimeMs?: number
  ): Promise<HyperliquidUserFillsResponse> {
    try {
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

      const response = await this.post<HyperliquidUserFillsResponse | HyperliquidFill[]>(payload);
      
      // Handle both array response (userFills) and object response (userFillsByTime)
      if (Array.isArray(response)) {
        // API returned array directly - wrap it in the expected format
        return {
          fills: response,
          closedPnl: '0', // Not available in array response
        } as HyperliquidUserFillsResponse;
      }
      
      return response as HyperliquidUserFillsResponse;
    } catch (error) {
      logger.error({ error, wallet }, 'Failed to get user fills');
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
                pos.leverage?.rawUsd || 
                pos.rawUsd || 
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

  constructor(baseUrl: string, walletAddress: string, privateKey: string) {
    this.baseUrl = baseUrl;
    this.walletAddress = walletAddress;
    this.privateKey = privateKey;
    
    // Initialize ethers wallet for signing
    this.signer = new ethers.Wallet(privateKey);
  }

  /**
   * Place a market order
   * Uses IOC (Immediate or Cancel) for market behavior
   */
  async placeMarketOrder(params: PlaceMarketOrderParams): Promise<HyperliquidOrderResponse> {
    const { assetIndex, isBuy, size, reduceOnly = false, cloid } = params;

    const order = {
      a: assetIndex,
      b: isBuy,
      p: '0', // Price "0" for market orders
      s: size,
      r: reduceOnly,
      t: {
        limit: {
          tif: 'Ioc' as const, // Immediate or Cancel for market behavior
        },
      },
      ...(cloid && { c: cloid }), // Client order ID if provided
    };

    const action = {
      type: 'order' as const,
      orders: [order],
      grouping: 'na' as const,
    };

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
   */
  private async executeAction(action: any, retries = 3): Promise<HyperliquidOrderResponse> {
    const nonce = Date.now();
    
    // Sign the action
    const signature = await this.signAction(action, nonce);

    const payload: HyperliquidOrderRequest = {
      action,
      nonce,
      signature,
    };

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
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json() as HyperliquidOrderResponse;
        
        if (data.status === 'err') {
          throw new Error(data.error || 'Order rejected by exchange');
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          logger.warn({ attempt: attempt + 1, delay, error: lastError }, 'Retrying exchange API call');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Sign an action with the wallet private key
   * 
   * TODO: Implement proper Hyperliquid signing mechanism
   * Hyperliquid uses a specific signing scheme. This is a placeholder.
   * You may need to use their SDK or implement their specific signing format.
   * 
   * Reference: Hyperliquid documentation for exact signing requirements
   */
  private async signAction(action: any, nonce: number): Promise<{ r: string; s: string; v: number }> {
    // Create message to sign
    // Format depends on Hyperliquid's requirements
    const message = JSON.stringify({
      action,
      nonce,
    });

    // Sign with ethers (this may need adjustment based on Hyperliquid's signing scheme)
    const messageHash = ethers.hashMessage(message);
    const signature = await this.signer.signMessage(ethers.getBytes(messageHash));
    
    // Parse signature into r, s, v
    const sig = ethers.Signature.from(signature);
    
    return {
      r: sig.r,
      s: sig.s,
      v: sig.v,
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

