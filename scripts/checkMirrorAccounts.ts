/**
 * Check and fix MirrorAccount records in database
 * Ensures all mirror accounts match .env file
 */

import { PrismaClient } from '@fadearena/shared';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const MIRROR_ACCOUNT_CONFIGS = [
  {
    id: 'gemini-3-pro',
    label: 'GEMINI_3_PRO',
    botWalletEnv: 'BOT_GEMINI_3_PRO',
    myWalletEnv: 'MY_GEMINI_FADE_WALLET',
  },
  {
    id: 'grok-4',
    label: 'GROK_4',
    botWalletEnv: 'BOT_GROK_4',
    myWalletEnv: 'MY_GROK_FADE_WALLET',
  },
  {
    id: 'qwen3-max',
    label: 'QWEN3_MAX',
    botWalletEnv: 'BOT_QWEN3_MAX',
    myWalletEnv: 'MY_QWEN_FADE_WALLET',
  },
  {
    id: 'kimi-k2-thinking',
    label: 'KIMI_K2_THINKING',
    botWalletEnv: 'BOT_KIMI_K2_THINKING',
    myWalletEnv: 'MY_KIMI_FADE_WALLET',
  },
  {
    id: 'deepseek-chat-v3.1',
    label: 'DEEPSEEK_CHAT_V3_1',
    botWalletEnv: 'BOT_DEEPSEEK_CHAT_V3_1',
    myWalletEnv: 'MY_DEEPSEEK_FADE_WALLET',
  },
  {
    id: 'claude-sonnet',
    label: 'CLAUDE_SONNET_4_5',
    botWalletEnv: 'BOT_CLAUDE_SONNET_4_5',
    myWalletEnv: 'MY_CLAUDE_FADE_WALLET',
  },
];

async function main() {
  console.log('Checking MirrorAccount records...\n');

  for (const config of MIRROR_ACCOUNT_CONFIGS) {
    const botWallet = process.env[config.botWalletEnv];
    const myWallet = process.env[config.myWalletEnv];

    console.log(`\n${config.label}:`);
    console.log(`  Bot Wallet ENV: ${config.botWalletEnv} = ${botWallet || 'NOT SET'}`);
    console.log(`  My Wallet ENV: ${config.myWalletEnv} = ${myWallet || 'NOT SET'}`);

    const existing = await prisma.mirrorAccount.findUnique({
      where: { id: config.id },
    });

    if (existing) {
      console.log(`  DB Record:`);
      console.log(`    botWallet: ${existing.botWallet}`);
      console.log(`    myWallet: ${existing.myWallet}`);
      console.log(`    enabled: ${existing.enabled}`);

      // Check if wallets match
      const botWalletMatch = !botWallet || existing.botWallet === botWallet;
      const myWalletMatch = !myWallet || existing.myWallet === myWallet;

      if (!botWalletMatch || !myWalletMatch) {
        console.log(`  ⚠ MISMATCH DETECTED!`);
        
        if (botWallet && myWallet) {
          console.log(`  Updating database to match .env...`);
          await prisma.mirrorAccount.update({
            where: { id: config.id },
            data: {
              botWallet,
              myWallet,
              label: config.label,
            },
          });
          console.log(`  ✓ Updated`);
        } else {
          console.log(`  ⚠ Cannot update - missing env vars`);
        }
      } else {
        console.log(`  ✓ Matches .env`);
      }
    } else {
      console.log(`  DB Record: NOT FOUND`);
      if (botWallet && myWallet) {
        console.log(`  Creating new record...`);
        await prisma.mirrorAccount.create({
          data: {
            id: config.id,
            botWallet,
            myWallet,
            label: config.label,
            enabled: true,
            leverageMultiplier: '0.05',
          },
        });
        console.log(`  ✓ Created`);
      } else {
        console.log(`  ⚠ Cannot create - missing env vars`);
      }
    }
  }

  // Check for orphaned records (not in config)
  const allRecords = await prisma.mirrorAccount.findMany();
  const configIds = new Set(MIRROR_ACCOUNT_CONFIGS.map(c => c.id));
  const orphaned = allRecords.filter(r => !configIds.has(r.id));

  if (orphaned.length > 0) {
    console.log(`\n⚠ Found ${orphaned.length} orphaned MirrorAccount records:`);
    for (const record of orphaned) {
      console.log(`  - ${record.id}: ${record.myWallet}`);
      console.log(`    This wallet might be the unknown one: ${record.myWallet}`);
    }
    console.log(`\nTo remove orphaned records, run:`);
    for (const record of orphaned) {
      console.log(`  DELETE FROM mirror_accounts WHERE id = '${record.id}';`);
    }
  }

  console.log('\n✓ Check complete');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


