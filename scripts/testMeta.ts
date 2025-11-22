/**
 * Test script to check what Hyperliquid meta API returns for stock perps
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

async function testMeta() {
  try {
    // Stock perps we're looking for
    const stockPerps = ['TSLA', 'NVDA', 'PLTR', 'MSFT', 'AMZN', 'GOOGL', 'XYZ100'];
    
    console.log('🔍 Fetching meta from Hyperliquid...\n');
    
    // Try meta, metaAndAssetCtxs, and allMids
    const [metaResponse, metaAndAssetCtxsResponse, allMidsResponse] = await Promise.all([
      fetch(HYPERLIQUID_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' }),
      }),
      fetch(HYPERLIQUID_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      }).catch(() => null),
      fetch(HYPERLIQUID_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' }),
      }).catch(() => null),
    ]);
    
    const response = metaResponse;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const meta = await response.json();
    
    console.log(`✅ Total assets in universe: ${meta.universe.length}\n`);
    
    // Check if meta has other fields
    console.log('📋 Meta response keys:', Object.keys(meta));
    console.log('');
    
    // Try metaAndAssetCtxs if available
    if (metaAndAssetCtxsResponse && metaAndAssetCtxsResponse.ok) {
      const metaAndAssetCtxs = await metaAndAssetCtxsResponse.json();
      console.log('📋 metaAndAssetCtxs response keys:', Object.keys(metaAndAssetCtxs));
      
      if (metaAndAssetCtxs.meta && metaAndAssetCtxs.meta.universe) {
        console.log(`📋 metaAndAssetCtxs.meta.universe length: ${metaAndAssetCtxs.meta.universe.length}`);
        
        // Check for stock perps in metaAndAssetCtxs
        stockPerps.forEach(ticker => {
          const match = metaAndAssetCtxs.meta.universe.findIndex(
            (asset: any) => asset.name.toLowerCase() === ticker.toLowerCase() ||
                           asset.name.toLowerCase() === `xyz:${ticker.toLowerCase()}`
          );
          if (match !== -1) {
            console.log(`  ✅ ${ticker}: Found in metaAndAssetCtxs as "${metaAndAssetCtxs.meta.universe[match].name}" at index ${match}`);
          }
        });
      }
      
      if (metaAndAssetCtxs.assetCtxs) {
        console.log(`📋 assetCtxs length: ${metaAndAssetCtxs.assetCtxs.length}`);
        // Check if assetCtxs contains stock perps
        const stockPerpCtxs = metaAndAssetCtxs.assetCtxs.filter((ctx: any, idx: number) => {
          const name = ctx.name || ctx.coin || '';
          return stockPerps.some(ticker => 
            name.toLowerCase().includes(ticker.toLowerCase())
          );
        });
        if (stockPerpCtxs.length > 0) {
          console.log('📋 Stock perps in assetCtxs:');
          stockPerpCtxs.forEach((ctx: any, idx: number) => {
            console.log(`  [${idx}] ${JSON.stringify(ctx, null, 2)}`);
          });
        }
      }
      console.log('');
    }
    
    // Try allMids - it might contain stock perps with their indices
    if (allMidsResponse && allMidsResponse.ok) {
      const allMids = await allMidsResponse.json();
      console.log('📋 allMids response type:', typeof allMids);
      if (Array.isArray(allMids)) {
        console.log(`📋 allMids array length: ${allMids.length}`);
        // Check if allMids contains stock perps
        stockPerps.forEach(ticker => {
          const match = allMids.findIndex((mid: any) => {
            if (typeof mid === 'string') {
              return mid.toLowerCase().includes(ticker.toLowerCase());
            }
            return false;
          });
          if (match !== -1) {
            console.log(`  ✅ ${ticker}: Found in allMids at index ${match}: "${allMids[match]}"`);
          }
        });
        // Show first 50 entries
        console.log('\n📋 First 50 entries in allMids:');
        allMids.slice(0, 50).forEach((mid: any, idx: number) => {
          console.log(`  [${idx}] ${mid}`);
        });
      } else if (typeof allMids === 'object') {
        console.log('📋 allMids keys:', Object.keys(allMids));
        // Check if it's a map of asset names to prices
        stockPerps.forEach(ticker => {
          const checks = [ticker, `xyz:${ticker}`, ticker.toLowerCase(), `xyz:${ticker.toLowerCase()}`];
          checks.forEach(check => {
            if (allMids[check] !== undefined) {
              console.log(`  ✅ ${ticker}: Found in allMids as "${check}": ${allMids[check]}`);
            }
          });
        });
      }
      console.log('');
    }
    
    console.log('📊 Searching for stock perps in universe:\n');
    
    stockPerps.forEach(ticker => {
      // Try exact match (case-insensitive)
      const exactMatch = meta.universe.findIndex(
        (asset: any) => asset.name.toLowerCase() === ticker.toLowerCase()
      );
      
      // Try with xyz: prefix
      const xyzMatch = meta.universe.findIndex(
        (asset: any) => asset.name.toLowerCase() === `xyz:${ticker.toLowerCase()}`
      );
      
      // Try partial match
      const partialMatches = meta.universe
        .map((asset: any, idx: number) => ({ name: asset.name, index: idx }))
        .filter((asset: any) => 
          asset.name.toLowerCase().includes(ticker.toLowerCase()) ||
          ticker.toLowerCase().includes(asset.name.toLowerCase().replace('xyz:', ''))
        );
      
      if (exactMatch !== -1) {
        console.log(`  ✅ ${ticker}: Found as "${meta.universe[exactMatch].name}" at index ${exactMatch}`);
      } else if (xyzMatch !== -1) {
        console.log(`  ✅ ${ticker}: Found as "${meta.universe[xyzMatch].name}" at index ${xyzMatch}`);
      } else if (partialMatches.length > 0) {
        console.log(`  ⚠️  ${ticker}: Partial matches found:`);
        partialMatches.forEach(m => {
          console.log(`      - "${m.name}" at index ${m.index}`);
        });
      } else {
        console.log(`  ❌ ${ticker}: NOT FOUND in universe`);
      }
    });
    
    console.log('\n📋 Sample assets from universe (first 30):');
    meta.universe.slice(0, 30).forEach((asset: any, idx: number) => {
      console.log(`  [${idx}] ${asset.name}`);
    });
    
    // Check if any assets contain stock tickers
    console.log('\n🔎 All assets containing stock tickers:');
    const allStockMatches = meta.universe
      .map((asset: any, idx: number) => ({ name: asset.name, index: idx }))
      .filter((asset: any) => {
        const nameLower = asset.name.toLowerCase();
        return stockPerps.some(ticker => 
          nameLower.includes(ticker.toLowerCase()) ||
          ticker.toLowerCase().includes(nameLower.replace('xyz:', ''))
        );
      });
    
    if (allStockMatches.length > 0) {
      allStockMatches.forEach(m => {
        console.log(`  [${m.index}] ${m.name}`);
      });
    } else {
      console.log('  ❌ No matches found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testMeta();

