/**
 * Hyperliquid Signing Service Client
 * 
 * This client calls a Python microservice that uses the official Hyperliquid Python SDK
 * to generate signatures. This ensures 100% compatibility with Hyperliquid's signing requirements.
 * 
 * The Python service should be running on HYPERLIQUID_SIGNING_SERVICE_URL (default: http://localhost:3003)
 */

import pino from 'pino';

const logger = pino({ name: 'HyperliquidSigningService' });

export interface SignActionRequest {
  action: {
    type: 'order';
    orders: Array<{
      a: number; // asset index
      b: boolean; // isBuy
      p: string; // price ("0" for market)
      s: string; // size (base units)
      r: boolean; // reduceOnly
      t: {
        limit: {
          tif: 'Ioc' | 'Alo' | 'Gtc';
        };
      };
    }>;
    grouping: 'na' | 'normalTpsl' | 'positionTpsl';
  };
  nonce: number; // timestamp ms
}

export interface SignActionResponse {
  signature: {
    r: string;
    s: string;
    v: number;
  };
  messageHash: string; // for debugging
}

export class HyperliquidSigningService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.HYPERLIQUID_SIGNING_SERVICE_URL || 'http://localhost:3003';
    
    logger.info(
      {
        signingServiceUrl: this.baseUrl,
      },
      'HyperliquidSigningService initialized'
    );
  }

  /**
   * Sign an action using the Python signing service
   * This ensures 100% compatibility with Hyperliquid's signing requirements
   */
  async signAction(request: SignActionRequest): Promise<SignActionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            errorText,
            request: JSON.stringify(request),
          },
          'Failed to sign action via Python service'
        );
        throw new Error(`Signing service error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: SignActionResponse = await response.json();
      
      logger.debug(
        {
          messageHash: result.messageHash?.substring(0, 20) + '...',
          signatureR: result.signature.r.substring(0, 20) + '...',
          signatureV: result.signature.v,
        },
        'Action signed successfully via Python service'
      );

      return result;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          request: JSON.stringify(request),
        },
        'Error calling signing service'
      );
      throw error;
    }
  }

  /**
   * Health check for the signing service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          url: this.baseUrl,
        },
        'Signing service health check failed'
      );
      return false;
    }
  }
}


