/**
 * Test script for Hyperliquid API integration
 * 
 * Tests bot wallet addresses by querying Hyperliquid Info API
 * for recent trades and positions without involving DB or worker.
 */
import dotenv from 'dotenv';

dotenv.config();

import { HyperliquidInfoClient } from '../packages/worker/src/hyperliquidClient';

// Bot wallet environment variables
const BOT_ENV_VARS = [
  { label: 'GEMINI_3_PRO', envVar: 'BOT_GEMINI_3_PRO' },
  { label: 'GROK_4', envVar: 'BOT_GROK_4' },
  { label: 'QWEN3_MAX', envVar: 'BOT_QWEN3_MAX' },
  { label: 'KIMI_K2_THINKING', envVar: 'BOT_KIMI_K2_THINKING' },
  { label: 'DEEPSEEK_CHAT_V3_1', envVar: 'BOT_DEEPSEEK_CHAT_V3_1' },
  { label: 'CLAUDE_SONNET_4_5', envVar: 'BOT_CLAUDE_SONNET_4_5' },
] as const;

interface BotWallet {
  label: string;
  wallet: string;
}

/**
 * Collect bot wallets from environment variables
 */
function collectBotWallets(): BotWallet[] {
  const wallets: BotWallet[] = [];

  for (const { label, envVar } of BOT_ENV_VARS) {
    const wallet = process.env[envVar];
    if (wallet && wallet.trim()) {
      wallets.push({ label, wallet: wallet.trim() });
    }
  }

  return wallets;
}

/**
 * Format timestamp to readable string
 */
function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Format number with 2 decimal places
 */
function formatNumber(value: string | number, decimals = 2): string {
  return Number(value).toFixed(decimals);
}

/**
 * Test a single bot wallet
 */
async function testBotWallet(
  client: HyperliquidInfoClient,
  bot: BotWallet,
  isFirst: boolean
): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Bot: ${bot.label}`);
  console.log(`Wallet: ${bot.wallet}`);
  console.log(`${'='.repeat(80)}`);

  const debug = process.env.HYPERLIQUID_DEBUG === '1' && isFirst;

  try {
    // Get user state (simplified - only basic getUserState)
    console.log('\n📊 User State:');
    try {
      const userState = await client.getUserState(bot.wallet);
      
      if (debug) {
        console.log('\n[DEBUG] Raw user state response:');
        console.log(JSON.stringify(userState, null, 2));
      }

      const margin = userState.marginSummary;
      console.log(`  Account Value: $${formatNumber(margin.accountValue)}`);
      console.log(`  Total Margin Used: $${formatNumber(margin.totalMarginUsed)}`);
      console.log(`  Total Notional Position: $${formatNumber(margin.totalNtlPos)}`);
      if (margin.totalRawUsd !== undefined) {
        console.log(`  Total Raw USD: $${formatNumber(margin.totalRawUsd)}`);
      }

      // Get perp positions from all DEXs (including xyz for stock perps)
      console.log('\n📂 Perp Positions (all DEXs):');
      try {
        const perpPositions = await client.getPerpPositions(bot.wallet);
        
        if (debug) {
          console.log('\n[DEBUG] Raw perp positions:');
          console.log(JSON.stringify(perpPositions, null, 2));
        }

        if (perpPositions && perpPositions.length > 0) {
          // Group by DEX
          const byDex = new Map<string, typeof perpPositions>();
          for (const pos of perpPositions) {
            const dex = pos.dex || 'default';
            if (!byDex.has(dex)) {
              byDex.set(dex, []);
            }
            byDex.get(dex)!.push(pos);
          }

          for (const [dex, positions] of byDex.entries()) {
            console.log(`\n  DEX: ${dex} (${positions.length} position(s)):`);
            for (const pos of positions) {
              const side = pos.side.toUpperCase();
              const leverageStr = pos.leverage ? `${pos.leverage}x` : '?';
              const marginModeStr = pos.marginMode === 'cross' ? 'cross' : 'isolated';
              console.log(
                `    ${pos.coin.padEnd(15)} | ${side.padEnd(5)} | ` +
                `size: ${pos.size.toFixed(4)} | entry: $${formatNumber(pos.entryPx)} | ` +
                `notional: $${formatNumber(pos.notional)} | uPnL: $${formatNumber(pos.unrealizedPnl)} | ` +
                `${leverageStr} ${marginModeStr}`
              );
            }
          }
        } else {
          console.log('  No open perp positions found');
        }
      } catch (e) {
        console.error('  ❌ Failed to get perp positions:', e instanceof Error ? e.message : String(e));
      }
    } catch (e) {
      console.error('  ❌ Failed to get user state:', e instanceof Error ? e.message : String(e));
      if (debug && e instanceof Error && e.stack) {
        console.error('  Stack:', e.stack);
      }
      return;
    }

    // Get recent fills (use getUserFills without time range to get all fills including xyz:*)
    console.log('\n📈 Recent Fills:');
    try {
      // Get all fills (no time range) - this includes fills from all DEXs including xyz
      const fillsResponse = await client.getUserFills(bot.wallet);
      
      if (debug) {
        console.log('\n[DEBUG] Raw fills response:');
        console.log(JSON.stringify(fillsResponse, null, 2));
        console.log('\n[DEBUG] fillsResponse type:', Array.isArray(fillsResponse) ? 'array' : typeof fillsResponse);
      }

      // Handle both array response and object with fills property
      let fills: any[] = [];
      if (Array.isArray(fillsResponse)) {
        fills = fillsResponse;
      } else if (fillsResponse && fillsResponse.fills && Array.isArray(fillsResponse.fills)) {
        fills = fillsResponse.fills;
      }

      if (fills.length > 0) {
        // Filter for xyz:* fills and sort by time
        const xyzFills = fills.filter((fill: any) => fill.coin?.startsWith('xyz:'));
        const recentFills = xyzFills
          .sort((a: any, b: any) => b.time - a.time)
          .slice(0, 10);

        if (recentFills.length > 0) {
          console.log(`  Last ${recentFills.length} fill(s) for xyz:* assets:\n`);
          for (const fill of recentFills) {
            const side = fill.side === 'A' ? 'BUY' : 'SELL';
            const pnlStr = fill.closedPnl ? ` | PnL: ${Number(fill.closedPnl) >= 0 ? '+' : ''}$${formatNumber(fill.closedPnl)}` : '';
            console.log(
              `    ${formatTimestamp(fill.time)} | ${fill.coin.padEnd(12)} | ${side.padEnd(4)} | ` +
              `size: ${Number(fill.sz).toFixed(4)} | px: $${formatNumber(fill.px)}${pnlStr}`
            );
          }

          // Check for closedPnl in response (if it's an object)
          if (fillsResponse && typeof fillsResponse === 'object' && !Array.isArray(fillsResponse) && 'closedPnl' in fillsResponse) {
            console.log(`\n  Total Closed PnL: $${formatNumber((fillsResponse as any).closedPnl)}`);
          }
          
          // Show summary
          console.log(`\n  Total fills: ${fills.length} (${xyzFills.length} for xyz:* assets)`);
        } else {
          console.log(`  No recent fills for xyz:* assets (total fills: ${fills.length})`);
        }
      } else {
        console.log('  No recent fills found');
        if (debug) {
          console.log('  [DEBUG] fillsResponse:', JSON.stringify(fillsResponse, null, 2).substring(0, 500));
        }
      }
    } catch (e) {
      console.error('  ❌ Failed to get recent fills:', e instanceof Error ? e.message : String(e));
    }

  } catch (error) {
    console.error(`\n❌ Error querying wallet ${bot.wallet}:`);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack && debug) {
        console.error(`   Stack: ${error.stack}`);
      }
    } else {
      console.error(`   ${String(error)}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Hyperliquid API Test Script');
  console.log('Testing bot wallet addresses...\n');

  // Collect bot wallets
  const botWallets = collectBotWallets();

  if (botWallets.length === 0) {
    console.error('❌ No bot wallets found in environment variables.');
    console.error('Please set at least one of the following:');
    for (const { envVar } of BOT_ENV_VARS) {
      console.error(`  - ${envVar}`);
    }
    process.exit(1);
  }

  console.log(`Found ${botWallets.length} bot wallet(s) to test\n`);

  // Initialize Hyperliquid client
  const infoUrl = process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info';
  console.log(`Using API URL: ${infoUrl}\n`);
  const client = new HyperliquidInfoClient(infoUrl);

  // Fetch meta to initialize asset index map
  try {
    console.log('📡 Connecting to Hyperliquid API...');
    await client.getMeta();
    console.log('✅ Connected successfully\n');
  } catch (error) {
    console.error('❌ Failed to connect to Hyperliquid API:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${String(error)}`);
    }
    process.exit(1);
  }

  // Test each bot wallet
  for (let i = 0; i < botWallets.length; i++) {
    await testBotWallet(client, botWallets[i], i === 0);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Test completed');
  console.log(`${'='.repeat(80)}\n`);
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
