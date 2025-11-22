/**
 * Check if trading is enabled and ready
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Use require for Prisma client (works better with tsx)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔍 Проверка настроек торговли...\n');

  // Check Settings
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    console.log('❌ Settings не найдены! Запустите: pnpm db:seed');
    process.exit(1);
  }

  console.log('📋 Settings:');
  console.log(`   Mode: ${settings.mode}`);
  console.log(`   Mode должен быть "live" для реальных покупок!`);

  // Check SystemStatus
  const systemStatus = await prisma.systemStatus.findUnique({
    where: { id: 'default' },
  });

  if (!systemStatus) {
    console.log('❌ SystemStatus не найден! Запустите: pnpm db:seed');
    process.exit(1);
  }

  console.log('\n🛡️  SystemStatus:');
  console.log(`   Kill Switch: ${systemStatus.killSwitch}`);
  console.log(`   Kill Switch должен быть false для торговли!`);

  // Check MirrorAccounts
  const mirrorAccounts = await prisma.mirrorAccount.findMany();
  console.log(`\n👥 Mirror Accounts: ${mirrorAccounts.length}`);

  // Map bot IDs to env var names (support both _PK and _PRIVATE_KEY)
  const envVarMap: Record<string, string[]> = {
    'gemini-3-pro': ['MY_GEMINI_FADE_PK', 'MY_GEMINI_FADE_PRIVATE_KEY'],
    'grok-4': ['MY_GROK_FADE_PK', 'MY_GROK_FADE_PRIVATE_KEY'],
    'qwen3-max': ['MY_QWEN_FADE_PK', 'MY_QWEN_FADE_PRIVATE_KEY'],
    'kimi-k2-thinking': ['MY_KIMI_FADE_PK', 'MY_KIMI_FADE_PRIVATE_KEY'],
    'deepseek-chat-v3.1': ['MY_DEEPSEEK_FADE_PK', 'MY_DEEPSEEK_FADE_PRIVATE_KEY'],
    'claude-sonnet': ['MY_CLAUDE_FADE_PK', 'MY_CLAUDE_FADE_PRIVATE_KEY'],
  };

  for (const account of mirrorAccounts) {
    console.log(`   ${account.id}:`);
    console.log(`     Enabled: ${account.enabled}`);
    console.log(`     Wallet: ${account.myWallet}`);
    console.log(`     Leverage: ${account.leverageMultiplier}x`);
    
    // Check if private key exists - try both naming conventions
    const variants = envVarMap[account.id] || [
      `MY_${account.id.toUpperCase().replace(/-/g, '_')}_FADE_PK`,
      `MY_${account.id.toUpperCase().replace(/-/g, '_')}_FADE_PRIVATE_KEY`,
    ];
    
    let hasKey = false;
    let foundVar = '';
    for (const variant of variants) {
      if (process.env[variant]) {
        hasKey = true;
        foundVar = variant;
        break;
      }
    }
    
    console.log(`     Private Key: ${hasKey ? '✅ Найден' : '❌ НЕ НАЙДЕН'}`);
    if (hasKey) {
      console.log(`     Env Var: ${foundVar}`);
    } else {
      console.log(`     Пробовали: ${variants.join(' или ')}`);
    }
  }

  // Check if trading will work
  const willTrade = 
    settings.mode === 'live' &&
    !systemStatus.killSwitch &&
    mirrorAccounts.some(acc => acc.enabled);

  console.log('\n' + '='.repeat(60));
  if (willTrade) {
    console.log('✅ СИСТЕМА ГОТОВА К ТОРГОВЛЕ!');
    console.log('   Ордера будут размещаться на Hyperliquid');
  } else {
    console.log('⚠️  СИСТЕМА НЕ ГОТОВА К ТОРГОВЛЕ');
    console.log('\nПроверьте:');
    if (settings.mode !== 'live') {
      console.log(`   ❌ Mode = "${settings.mode}" (должно быть "live")`);
      console.log('      Обновите через API: POST /api/settings { "mode": "live" }');
    }
    if (systemStatus.killSwitch) {
      console.log('   ❌ Kill Switch = true (должно быть false)');
      console.log('      Обновите через API: POST /api/kill-switch { "active": false }');
    }
    if (!mirrorAccounts.some(acc => acc.enabled)) {
      console.log('   ❌ Нет включенных mirror accounts');
    }
  }
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(console.error);
