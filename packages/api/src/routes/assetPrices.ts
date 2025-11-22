import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';
import type { AssetPricesResponse } from '@fadearena/shared';

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

// Маппинг тикеров на символы Hyperliquid
const ASSET_CONFIG = [
  { ticker: 'TSLA', symbol: 'TSLA' },
  { ticker: 'NDX', symbol: 'XYZ100' },
  { ticker: 'NVDA', symbol: 'NVDA' },
  { ticker: 'MSFT', symbol: 'MSFT' },
  { ticker: 'AMZN', symbol: 'AMZN' },
  { ticker: 'GOOGL', symbol: 'GOOGL' },
  { ticker: 'PLTR', symbol: 'PLTR' },
];

/**
 * Получить текущие цены всех активов из Hyperliquid API
 * Stock perps находятся на xyz DEX, используем l2Book для получения цен
 */
async function getAssetPrices(): Promise<AssetPricesResponse['prices']> {
  try {
    const prices: AssetPricesResponse['prices'] = [];
    
    // Stock perps находятся на xyz DEX, используем формат "xyz:SYMBOL"
    // Получаем цены через l2Book для каждого актива
    for (const asset of ASSET_CONFIG) {
      try {
        // Формат для stock perps: xyz:TSLA, xyz:NVDA и т.д.
        // Для NDX используем xyz:XYZ100
        const coinSymbol = asset.symbol === 'XYZ100' ? 'xyz:XYZ100' : `xyz:${asset.symbol}`;
        
        const response = await fetch(HYPERLIQUID_INFO_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'l2Book',
            coin: coinSymbol,
          }),
        });

        if (!response.ok) {
          console.warn(`[PRICES] ✗ HTTP ${response.status} for ${coinSymbol}`);
          continue;
        }

        const l2Book: any = await response.json();
        
        // l2Book возвращает { levels: [[{px, sz}, ...], [{px, sz}, ...]] }
        // levels[0] - массив bids (цены покупки, отсортированы по убыванию)
        // levels[1] - массив asks (цены продажи, отсортированы по возрастанию)
        if (l2Book && l2Book.levels && Array.isArray(l2Book.levels) && l2Book.levels.length >= 2) {
          const bids = l2Book.levels[0];
          const asks = l2Book.levels[1];
          
          if (Array.isArray(bids) && Array.isArray(asks) && bids.length > 0 && asks.length > 0) {
            // Лучший bid - первый элемент массива bids (самая высокая цена)
            // Лучший ask - первый элемент массива asks (самая низкая цена)
            const bestBid = parseFloat(bids[0].px || '0');
            const bestAsk = parseFloat(asks[0].px || '0');
            
            if (!isNaN(bestBid) && !isNaN(bestAsk) && bestBid > 0 && bestAsk > 0) {
              const midPrice = (bestBid + bestAsk) / 2;
              
              prices.push({
                ticker: asset.ticker,
                symbol: asset.symbol,
                price: midPrice,
                timestamp: Date.now(),
              });
              
              console.log(`[PRICES] ✓ ${asset.ticker} (${coinSymbol}): $${midPrice.toFixed(2)} (bid: $${bestBid.toFixed(2)}, ask: $${bestAsk.toFixed(2)})`);
            } else {
              console.warn(`[PRICES] ✗ Invalid bid/ask for ${coinSymbol}: bid=${bestBid}, ask=${bestAsk}`);
            }
          } else {
            console.warn(`[PRICES] ✗ Invalid levels structure for ${coinSymbol}`);
          }
        } else {
          console.warn(`[PRICES] ✗ No levels in l2Book for ${coinSymbol}`);
        }
        
        // Небольшая задержка между запросами чтобы не перегружать API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[PRICES] ✗ Error fetching price for ${asset.ticker}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log(`[PRICES] Total prices collected: ${prices.length}/${ASSET_CONFIG.length}`);
    return prices;
  } catch (error) {
    console.error('Error fetching asset prices:', error);
    throw error;
  }
}

/**
 * Сохранить снапшот цен в БД
 */
async function savePriceSnapshot(prisma: PrismaClient, data: AssetPricesResponse): Promise<void> {
  try {
    // Проверяем, существует ли таблица (fallback если миграция не применена)
    if (!prisma.assetPriceSnapshot) {
      console.warn('[PRICES] assetPriceSnapshot table not found, skipping save');
      return;
    }
    
    await prisma.assetPriceSnapshot.create({
      data: {
        timestamp: new Date(data.timestamp),
        data: JSON.stringify(data),
      },
    });
  } catch (error) {
    // Игнорируем ошибки если таблица не существует
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.warn('[PRICES] Table asset_price_snapshots does not exist yet, skipping save');
    } else {
      console.error('Error saving asset price snapshot:', error);
    }
  }
}

/**
 * Собрать и сохранить снапшот цен (для cron job)
 */
export async function collectAssetPrices(prisma: PrismaClient): Promise<void> {
  try {
    const prices = await getAssetPrices();
    
    const payload: AssetPricesResponse = {
      timestamp: Date.now(),
      prices,
    };

    await savePriceSnapshot(prisma, payload);
    console.log(`[PRICES] Collected prices for ${prices.length} assets`);
  } catch (error) {
    console.error('Error collecting asset prices:', error);
  }
}

export function createAssetPricesRouter(prisma: PrismaClient) {
  const router = Router();
  
  // Текущие цены (сначала пытаемся получить из БД, если нет - запрашиваем API)
  router.get('/api/prices/assets', async (req, res) => {
    try {
      console.log('[PRICES] GET /api/prices/assets called');
      
      // Сначала пытаемся получить последний снапшот из БД (быстрее)
      let latestSnapshot = null;
      try {
        if (prisma.assetPriceSnapshot) {
          latestSnapshot = await prisma.assetPriceSnapshot.findFirst({
            orderBy: { timestamp: 'desc' },
          });
        }
      } catch (dbError) {
        // Таблица может не существовать, игнорируем
        console.debug('[PRICES] Could not query assetPriceSnapshot:', dbError instanceof Error ? dbError.message : String(dbError));
      }

      // Если есть свежий снапшот (менее 20 секунд назад), используем его
      if (latestSnapshot) {
        const snapshotAge = Date.now() - latestSnapshot.timestamp.getTime();
        if (snapshotAge < 20_000) { // 20 секунд
          const data = JSON.parse(latestSnapshot.data) as AssetPricesResponse;
          res.json(data);
          
          // Обновляем в фоне (не блокируем ответ)
          getAssetPrices().then(prices => {
            const payload: AssetPricesResponse = {
              timestamp: Date.now(),
              prices,
            };
            savePriceSnapshot(prisma, payload).catch(err => 
              console.error('Failed to save price snapshot:', err)
            );
          }).catch(err => console.error('Failed to update prices in background:', err));
          
          return;
        }
      }

      // Если нет свежего снапшота, запрашиваем API
      const prices = await getAssetPrices();
      
      const payload: AssetPricesResponse = {
        timestamp: Date.now(),
        prices,
      };

      // Сохраняем снапшот в БД (асинхронно, не блокируем ответ)
      savePriceSnapshot(prisma, payload).catch(err => 
        console.error('Failed to save price snapshot:', err)
      );

      res.json(payload);
    } catch (error) {
      console.error('[PRICES] Asset prices error:', error);
      
      // В случае ошибки пытаемся вернуть последний снапшот из БД
      try {
        if (prisma.assetPriceSnapshot) {
          const latestSnapshot = await prisma.assetPriceSnapshot.findFirst({
            orderBy: { timestamp: 'desc' },
          });
          if (latestSnapshot) {
            const data = JSON.parse(latestSnapshot.data) as AssetPricesResponse;
            res.json(data);
            return;
          }
        }
      } catch (fallbackError) {
        console.error('[PRICES] Failed to get fallback prices:', fallbackError);
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch asset prices',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
}

