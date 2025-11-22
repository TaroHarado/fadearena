/**
 * Test script to check how stock perps are represented in userState
 */

import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

async function testUserState(wallet: string) {
  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: wallet,
      }),
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
  console.log('🔍 Testing userState for stock perp positions...\n');
  
  // Get first bot wallet from .env
  const botWallets: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const wallet = process.env[`BOT_GEMINI_3_PRO_WALLET`] || 
                   process.env[`BOT_GROK_4_WALLET`] ||
                   process.env[`BOT_QWEN3_MAX_WALLET`] ||
                   process.env[`BOT_KIMI_K2_THINKING_WALLET`] ||
                   process.env[`BOT_DEEPSEEK_CHAT_V3_1_WALLET`] ||
                   process.env[`BOT_CLAUDE_SONNET_WALLET`];
    if (wallet && !botWallets.includes(wallet)) {
      botWallets.push(wallet);
      break;
    }
  }
  
  // Try to find bot wallets
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('BOT_') && key.endsWith('_WALLET')) {
      const wallet = process.env[key];
      if (wallet && !botWallets.includes(wallet)) {
        botWallets.push(wallet);
      }
    }
  });
  
  if (botWallets.length === 0) {
    console.log('❌ No bot wallets found in .env');
    return;
  }
  
  console.log(`📋 Found ${botWallets.length} bot wallet(s)\n`);
  
  for (const wallet of botWallets.slice(0, 3)) { // Test first 3
    console.log(`🔍 Testing wallet: ${wallet.substring(0, 10)}...`);
    const state = await testUserState(wallet);
    
    if (state.error) {
      console.log(`   ❌ Error: ${state.error}\n`);
      continue;
    }
    
    // Check assetPositions
    if (state.assetPositions && Array.isArray(state.assetPositions)) {
      console.log(`   📋 Asset positions: ${state.assetPositions.length}`);
      
      // Look for stock perps
      const stockPerps = ['TSLA', 'NVDA', 'PLTR', 'MSFT', 'AMZN', 'GOOGL', 'XYZ100'];
      const stockPerpPositions = state.assetPositions.filter((pos: any) => {
        const coin = (pos.position?.coin || '').toLowerCase();
        return stockPerps.some(ticker => 
          coin.includes(ticker.toLowerCase()) || 
          coin.includes(`xyz:${ticker.toLowerCase()}`)
        );
      });
      
      if (stockPerpPositions.length > 0) {
        console.log(`   ✅ Found ${stockPerpPositions.length} stock perp position(s):`);
        stockPerpPositions.forEach((pos: any) => {
          console.log(`      - ${pos.position?.coin}: size=${pos.position?.sz}, entry=${pos.position?.entryPx}`);
        });
      } else {
        console.log(`   ℹ️  No stock perp positions found`);
      }
      
      // Show all positions to see format
      if (state.assetPositions.length > 0) {
        console.log(`   📋 All positions (first 10):`);
        state.assetPositions.slice(0, 10).forEach((pos: any) => {
          const coin = pos.position?.coin || 'unknown';
          const size = pos.position?.sz || '0';
          console.log(`      - ${coin}: size=${size}`);
        });
      }
    }
    
    console.log('');
  }
}

main().catch(console.error);

