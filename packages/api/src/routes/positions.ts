import { Router } from 'express';

const FADER_CONFIG = [
  { label: 'GEMINI', envVar: 'MY_GEMINI_FADE_WALLET' },
  { label: 'GROK', envVar: 'MY_GROK_FADE_WALLET' },
  { label: 'QWEN', envVar: 'MY_QWEN_FADE_WALLET' },
  { label: 'KIMI', envVar: 'MY_KIMI_FADE_WALLET' },
  { label: 'DEEPSEEK', envVar: 'MY_DEEPSEEK_FADE_WALLET' },
  { label: 'CLAUDE', envVar: 'MY_CLAUDE_FADE_WALLET' },
];

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

export interface Position {
  asset: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  notional: number;
  unrealizedPnl: number;
  leverage: number;
}

export interface WalletPositions {
  label: string;
  address: string;
  positions: Position[];
  totalNotional: number;
  totalUnrealizedPnl: number;
}

export interface PositionsResponse {
  timestamp: number;
  wallets: WalletPositions[];
}

/**
 * Получить позиции из Hyperliquid API
 */
export async function getUserPositions(address: string): Promise<Position[]> {
  const positions: Position[] = [];

  try {
    // Получаем позиции из default DEX
    const defaultResponse = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
      }),
    });

    if (defaultResponse.ok) {
      const defaultData = await defaultResponse.json();
      if (defaultData.assetPositions) {
        for (const assetPos of defaultData.assetPositions) {
          if (assetPos.position) {
            const pos = assetPos.position;
            const szi = parseFloat(String(pos.szi || 0));
            if (Math.abs(szi) > 0.0001) {
              const side = szi > 0 ? 'LONG' : 'SHORT';
              const entryPx = parseFloat(String(pos.entryPx || 0));
              // Mark price may not be in clearinghouseState, use entry price as fallback
              let markPx = entryPx;
              if (pos.markPx) {
                markPx = parseFloat(String(pos.markPx));
              } else if (defaultData.marginSummary?.markPx) {
                markPx = parseFloat(String(defaultData.marginSummary.markPx));
              }
              const positionValue = parseFloat(String(pos.positionValue || 0));
              const unrealizedPnl = parseFloat(String(pos.unrealizedPnl || 0));
              const leverage = pos.leverage?.value || 1;

              positions.push({
                asset: pos.coin || 'UNKNOWN',
                side,
                size: Math.abs(szi),
                entryPrice: entryPx,
                markPrice: markPx,
                notional: positionValue,
                unrealizedPnl,
                leverage,
              });
            }
          }
        }
      }
    }

    // Получаем позиции из xyz DEX
    const xyzResponse = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
        dex: 'xyz',
      }),
    });

    if (xyzResponse.ok) {
      const xyzData = await xyzResponse.json();
      if (xyzData.assetPositions) {
        for (const assetPos of xyzData.assetPositions) {
          if (assetPos.position) {
            const pos = assetPos.position;
            const szi = parseFloat(String(pos.szi || 0));
            if (Math.abs(szi) > 0.0001) {
              const side = szi > 0 ? 'LONG' : 'SHORT';
              const entryPx = parseFloat(String(pos.entryPx || 0));
              // Try to get mark price from various sources
              let markPx = entryPx;
              if (pos.markPx) {
                markPx = parseFloat(String(pos.markPx));
              } else if (xyzData.marginSummary?.markPx) {
                markPx = parseFloat(String(xyzData.marginSummary.markPx));
              } else {
                // Fallback: use entry price if mark price not available
                markPx = entryPx;
              }
              const positionValue = parseFloat(String(pos.positionValue || 0));
              const unrealizedPnl = parseFloat(String(pos.unrealizedPnl || 0));
              const leverage = pos.leverage?.value || 1;

              // Добавляем префикс xyz: для stock perps
              const assetName = pos.coin || 'UNKNOWN';
              const asset = assetName.startsWith('xyz:') ? assetName : `xyz:${assetName}`;

              positions.push({
                asset,
                side,
                size: Math.abs(szi),
                entryPrice: entryPx,
                markPrice: markPx,
                notional: positionValue,
                unrealizedPnl,
                leverage,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching positions for ${address.substring(0, 10)}...:`, error);
  }

  return positions;
}

export function createPositionsRouter() {
  const router = Router();

  router.get('/api/positions/faders', async (req, res) => {
    req.setTimeout(60000);

    try {
      const wallets = FADER_CONFIG
        .map(({ label, envVar }) => {
          const address = process.env[envVar];
          if (!address || !address.trim()) {
            return null;
          }
          return { label, address: address.trim() };
        })
        .filter((w): w is { label: string; address: string } => w !== null);

      if (wallets.length === 0) {
        return res.json({
          timestamp: Date.now(),
          wallets: [],
        });
      }

      const walletsData: WalletPositions[] = [];

      // Последовательно запрашиваем позиции с задержкой
      for (let i = 0; i < wallets.length; i++) {
        const w = wallets[i];
        try {
          const positions = await getUserPositions(w.address);
          
          const totalNotional = positions.reduce((sum, p) => sum + p.notional, 0);
          const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

          walletsData.push({
            label: w.label,
            address: w.address,
            positions,
            totalNotional,
            totalUnrealizedPnl,
          });

          // Задержка 1 секунда перед следующим запросом
          if (i < wallets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error fetching positions for ${w.label}:`, error);
          walletsData.push({
            label: w.label,
            address: w.address,
            positions: [],
            totalNotional: 0,
            totalUnrealizedPnl: 0,
          });
          if (i < wallets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      const response: PositionsResponse = {
        timestamp: Date.now(),
        wallets: walletsData,
      };

      res.json(response);
    } catch (error) {
      console.error('Positions error:', error);
      res.status(500).json({
        error: 'Failed to fetch positions',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}

