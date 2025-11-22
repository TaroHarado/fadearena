/**
 * Test script to find stock perps in Hyperliquid API
 */

import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_EXCHANGE_URL = 'https://api.hyperliquid.xyz/exchange';

const stockPerps = ['TSLA', 'NVDA', 'PLTR', 'MSFT', 'AMZN', 'GOOGL', 'XYZ100'];

async function testEndpoint(type: string, body?: any) {
  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...body }),
    });
    
    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    return await response.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  console.log('🔍 Testing Hyperliquid API for stock perps...\n');
  
  // 1. Test meta
  console.log('1️⃣ Testing meta endpoint...');
  const meta = await testEndpoint('meta');
  if (meta.error) {
    console.log(`   ❌ Error: ${meta.error}\n`);
  } else {
    console.log(`   ✅ Universe length: ${meta.universe?.length || 0}`);
    console.log(`   ✅ Keys: ${Object.keys(meta).join(', ')}\n`);
  }
  
  // 2. Test metaAndAssetCtxs
  console.log('2️⃣ Testing metaAndAssetCtxs endpoint...');
  const metaAndAssetCtxs = await testEndpoint('metaAndAssetCtxs');
  if (metaAndAssetCtxs.error) {
    console.log(`   ❌ Error: ${metaAndAssetCtxs.error}\n`);
  } else {
    console.log(`   ✅ Keys: ${Object.keys(metaAndAssetCtxs).join(', ')}`);
    
    // Check both '0' and '1' contexts
    ['0', '1'].forEach(ctxKey => {
      const ctx = metaAndAssetCtxs[ctxKey];
      if (ctx) {
        console.log(`   📋 Context ${ctxKey}:`);
        console.log(`      Keys: ${Object.keys(ctx).join(', ')}`);
        
        if (ctx.meta && ctx.meta.universe) {
          console.log(`      Universe length: ${ctx.meta.universe.length}`);
          
          // Search for stock perps
          stockPerps.forEach(ticker => {
            const match = ctx.meta.universe.findIndex((asset: any) => {
              const name = (asset.name || '').toLowerCase();
              return name === ticker.toLowerCase() || name === `xyz:${ticker.toLowerCase()}`;
            });
            if (match !== -1) {
              console.log(`      ✅ ${ticker}: Found at index ${match} as "${ctx.meta.universe[match].name}"`);
            }
          });
        }
        
        if (ctx.assetCtxs && Array.isArray(ctx.assetCtxs)) {
          console.log(`      AssetCtxs length: ${ctx.assetCtxs.length}`);
          
          // Search for stock perps in assetCtxs
          stockPerps.forEach(ticker => {
            const matches = ctx.assetCtxs
              .map((ctx: any, idx: number) => ({ ctx, idx }))
              .filter(({ ctx }) => {
                const name = (ctx.name || ctx.coin || '').toLowerCase();
                return name.includes(ticker.toLowerCase()) || name.includes(`xyz:${ticker.toLowerCase()}`);
              });
            
            if (matches.length > 0) {
              matches.forEach(({ ctx, idx }) => {
                console.log(`      ✅ ${ticker}: Found in assetCtxs[${idx}]:`, JSON.stringify(ctx, null, 2));
              });
            }
          });
        }
      }
    });
    console.log('');
  }
  
  // 3. Test allMids
  console.log('3️⃣ Testing allMids endpoint...');
  const allMids = await testEndpoint('allMids');
  if (allMids.error) {
    console.log(`   ❌ Error: ${allMids.error}\n`);
  } else {
    if (typeof allMids === 'object' && !Array.isArray(allMids)) {
      const keys = Object.keys(allMids);
      console.log(`   ✅ Total keys: ${keys.length}`);
      
      // Search for stock perps
      stockPerps.forEach(ticker => {
        const checks = [ticker, `xyz:${ticker}`, ticker.toLowerCase(), `xyz:${ticker.toLowerCase()}`];
        checks.forEach(check => {
          if (allMids[check] !== undefined) {
            console.log(`   ✅ ${ticker}: Found as "${check}" with price ${allMids[check]}`);
          }
        });
      });
      
      // Show sample keys
      console.log(`   📋 Sample keys (first 30): ${keys.slice(0, 30).join(', ')}`);
    }
    console.log('');
  }
  
  // 4. Test l2Book for stock perps (we know this works)
  console.log('4️⃣ Testing l2Book for stock perps (we know this works)...');
  for (const ticker of stockPerps.slice(0, 2)) { // Test first 2
    const symbol = ticker === 'XYZ100' ? 'xyz:XYZ100' : `xyz:${ticker}`;
    const l2Book = await testEndpoint('l2Book', { coin: symbol });
    if (l2Book.error) {
      console.log(`   ❌ ${ticker} (${symbol}): ${l2Book.error}`);
    } else {
      console.log(`   ✅ ${ticker} (${symbol}): l2Book works`);
    }
  }
  console.log('');
  
  // 5. Test userState to see how stock perps are represented in positions
  console.log('5️⃣ Testing userState (if we have a wallet with stock perp positions)...');
  // We can't test this without a wallet, but we can check the structure
  console.log('   ℹ️  Would need a wallet address with stock perp positions\n');
  
  // 6. Check context 1 in metaAndAssetCtxs - it has keys 0-220 which look like indices!
  console.log('6️⃣ Testing context 1 in metaAndAssetCtxs (has keys 0-220)...');
  if (metaAndAssetCtxs && !metaAndAssetCtxs.error && metaAndAssetCtxs['1']) {
    const ctx1 = metaAndAssetCtxs['1'];
    const ctx1Keys = Object.keys(ctx1).map(k => parseInt(k)).filter(k => !isNaN(k)).sort((a, b) => a - b);
    console.log(`   📋 Context 1 has ${ctx1Keys.length} numeric keys (indices)`);
    console.log(`   📋 Key range: ${ctx1Keys[0]} to ${ctx1Keys[ctx1Keys.length - 1]}`);
    
    // Check a few entries to see structure
    console.log(`   📋 Sample entries:`);
    [0, 1, 2, 100, 200, 220].forEach(idx => {
      if (ctx1[idx]) {
        console.log(`      [${idx}]:`, JSON.stringify(ctx1[idx], null, 2));
      }
    });
    
    // Search for stock perps in context 1
    console.log(`   🔍 Searching for stock perps in context 1...`);
    stockPerps.forEach(ticker => {
      const checks = [ticker, `xyz:${ticker}`, ticker.toLowerCase(), `xyz:${ticker.toLowerCase()}`];
      
      // Search through all entries
      for (const key of ctx1Keys) {
        const entry = ctx1[key];
        if (entry && typeof entry === 'object') {
          const entryStr = JSON.stringify(entry).toLowerCase();
          if (checks.some(check => entryStr.includes(check.toLowerCase()))) {
            console.log(`   ✅ ${ticker}: Found in context 1[${key}]:`, JSON.stringify(entry, null, 2));
            break;
          }
        }
      }
    });
  }
  console.log('');
  
  // 7. Check allMids for stock perps - it has 475 keys!
  console.log('7️⃣ Testing allMids for stock perps (has 475 keys vs 221 in universe)...');
  if (allMids && !allMids.error && typeof allMids === 'object') {
    const allMidsKeys = Object.keys(allMids);
    console.log(`   📋 Total keys in allMids: ${allMidsKeys.length}`);
    
    // Search for stock perps
    stockPerps.forEach(ticker => {
      const checks = [ticker, `xyz:${ticker}`, ticker.toLowerCase(), `xyz:${ticker.toLowerCase()}`];
      checks.forEach(check => {
        if (allMids[check] !== undefined) {
          console.log(`   ✅ ${ticker}: Found in allMids as "${check}" with price ${allMids[check]}`);
        }
      });
      
      // Also search for partial matches
      const partialMatches = allMidsKeys.filter(key => 
        key.toLowerCase().includes(ticker.toLowerCase()) || 
        ticker.toLowerCase().includes(key.toLowerCase().replace('xyz:', ''))
      );
      if (partialMatches.length > 0) {
        console.log(`   ⚠️  ${ticker}: Partial matches in allMids:`, partialMatches.slice(0, 5).join(', '));
      }
    });
    
    // Show keys that might be stock perps (contain letters and look like tickers)
    const tickerLikeKeys = allMidsKeys.filter(key => 
      /^[A-Z]{2,5}$/i.test(key) || /^xyz:[A-Z]{2,5}$/i.test(key)
    );
    console.log(`   📋 Ticker-like keys in allMids (${tickerLikeKeys.length}):`, tickerLikeKeys.slice(0, 30).join(', '));
    
    // Search for xyz: keys
    const xyzKeys = allMidsKeys.filter(key => key.toLowerCase().startsWith('xyz:'));
    console.log(`   📋 Keys starting with xyz: (${xyzKeys.length}):`, xyzKeys.slice(0, 20).join(', '));
    
    // Check if stock perps are in xyz: keys
    stockPerps.forEach(ticker => {
      const xyzKey = `xyz:${ticker}`;
      if (allMidsKeys.includes(xyzKey) || allMidsKeys.includes(xyzKey.toLowerCase())) {
        console.log(`   ✅ ${ticker}: Found in allMids as "${xyzKey}" with price ${allMids[xyzKey] || allMids[xyzKey.toLowerCase()]}`);
      }
    });
    
    // Also check all keys that contain stock ticker names
    console.log(`   🔍 All keys containing stock tickers:`);
    stockPerps.forEach(ticker => {
      const matches = allMidsKeys.filter(key => 
        key.toLowerCase().includes(ticker.toLowerCase()) && 
        !key.startsWith('@') && 
        !key.match(/^\d/)
      );
      if (matches.length > 0) {
        matches.forEach(match => {
          console.log(`      ${ticker}: "${match}" = ${allMids[match]}`);
        });
      }
    });
  }
  console.log('');
  
  console.log('✅ Testing complete!');
}

main().catch(console.error);

