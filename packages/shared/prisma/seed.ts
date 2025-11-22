// Load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';

// Находим корень проекта (где находится .env)
// .env находится в корне проекта, а мы в packages/shared/prisma
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`Loading .env from: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('Warning: Could not load .env file:', result.error.message);
} else {
  console.log(`Loaded ${Object.keys(result.parsed || {}).length} environment variables from .env`);
}

// Проверяем DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env file');
  console.error('Please set DATABASE_URL in .env file, for example:');
  console.error('DATABASE_URL=file:./packages/shared/prisma/dev.db');
  console.error('');
  console.error('Current .env path:', envPath);
  console.error('File exists:', require('fs').existsSync(envPath));
  if (require('fs').existsSync(envPath)) {
    const envContent = require('fs').readFileSync(envPath, 'utf-8');
    console.error('DATABASE_URL in file:', envContent.includes('DATABASE_URL'));
  }
  process.exit(1);
}

console.log(`DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 50)}...`);

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Seeding database...');

  // Seed default Settings (singleton)
  // Note: Prisma doesn't support upsert with custom ID, so we use findFirst + create/update
  let defaultSettings = await prisma.settings.findFirst();
  
  if (!defaultSettings) {
    // Read mode from environment or default to simulation
    // If FADEARENA_KILL_SWITCH is not set or false, and private keys are present, use live mode
    const killSwitch = process.env.FADEARENA_KILL_SWITCH === 'true';
    const hasPrivateKeys = process.env.MY_GEMINI_FADE_PRIVATE_KEY || process.env.MY_GROK_FADE_PRIVATE_KEY;
    const mode = process.env.FADEARENA_MODE || (hasPrivateKeys && !killSwitch ? 'live' : 'simulation');
    defaultSettings = await prisma.settings.create({
      data: {
        id: 'default',
        mode: mode === 'live' ? 'live' : 'simulation',
        globalExposureCap: null,
        dailyLossLimit: null,
        botConfigs: JSON.stringify([
          { id: 'gemini-3-pro', enabled: true, leverageMultiplier: 0.05 },
          { id: 'grok-4', enabled: true, leverageMultiplier: 0.05 },
          { id: 'qwen3-max', enabled: true, leverageMultiplier: 0.05 },
          { id: 'kimi-k2-thinking', enabled: true, leverageMultiplier: 0.05 },
          { id: 'deepseek-chat-v3.1', enabled: true, leverageMultiplier: 0.05 },
          { id: 'claude-sonnet', enabled: true, leverageMultiplier: 0.05 },
        ]),
        assetExposureCaps: JSON.stringify({}),
      },
    });
  }

  console.log('✓ Settings seeded');

  // Seed MirrorAccounts
  const mirrorAccountConfigs = [
    {
      id: 'gemini-3-pro',
      botWalletEnv: 'BOT_GEMINI_3_PRO',
      myWalletEnv: 'MY_GEMINI_FADE_WALLET',
      label: 'Gemini 3 Pro',
    },
    {
      id: 'grok-4',
      botWalletEnv: 'BOT_GROK_4',
      myWalletEnv: 'MY_GROK_FADE_WALLET',
      label: 'Grok 4',
    },
    {
      id: 'qwen3-max',
      botWalletEnv: 'BOT_QWEN3_MAX',
      myWalletEnv: 'MY_QWEN_FADE_WALLET',
      label: 'Qwen3 Max',
    },
    {
      id: 'kimi-k2-thinking',
      botWalletEnv: 'BOT_KIMI_K2_THINKING',
      myWalletEnv: 'MY_KIMI_FADE_WALLET',
      label: 'Kimi K2 Thinking',
    },
    {
      id: 'deepseek-chat-v3.1',
      botWalletEnv: 'BOT_DEEPSEEK_CHAT_V3_1',
      myWalletEnv: 'MY_DEEPSEEK_FADE_WALLET',
      label: 'DeepSeek Chat v3.1',
    },
    {
      id: 'claude-sonnet',
      botWalletEnv: 'BOT_CLAUDE_SONNET_4_5',
      myWalletEnv: 'MY_CLAUDE_FADE_WALLET',
      label: 'Claude Sonnet 4.5',
    },
  ];

  for (const config of mirrorAccountConfigs) {
    const botWallet = process.env[config.botWalletEnv] || process.env[`${config.id.toUpperCase().replace(/-/g, '_')}_WALLET`];
    const myWallet = process.env[config.myWalletEnv];

    if (!botWallet) {
      console.log(`⚠ Skipping ${config.id}: bot wallet not configured`);
      continue;
    }

    if (!myWallet) {
      console.log(`⚠ Skipping ${config.id}: mirror wallet not configured`);
      continue; // Skip if myWallet is not set - don't create with placeholder
    }

    // Use myWallet from env (required for live trading)
    const finalMyWallet = myWallet;

    // Check if mirror account already exists
    const existing = await prisma.mirrorAccount.findUnique({
      where: { id: config.id },
    });

    if (existing) {
      // Update if bot wallet changed
      if (existing.botWallet !== botWallet || existing.myWallet !== finalMyWallet) {
        await prisma.mirrorAccount.update({
          where: { id: config.id },
          data: {
            botWallet,
            myWallet: finalMyWallet,
            label: config.label,
          },
        });
        console.log(`✓ Updated mirror account: ${config.id}`);
      }
    } else {
      await prisma.mirrorAccount.create({
        data: {
          id: config.id,
          botWallet,
          myWallet: finalMyWallet,
          label: config.label,
          enabled: true,
          leverageMultiplier: '0.05', // 1/20 of bot's position size
          allocationUsd: null,
        },
      });
      console.log(`✓ Created mirror account: ${config.id} with leverageMultiplier=0.05`);
    }
    
    // Update leverageMultiplier to 0.05 if it's null or different (for existing accounts)
    if (existing && (!existing.leverageMultiplier || existing.leverageMultiplier !== '0.05')) {
      await prisma.mirrorAccount.update({
        where: { id: config.id },
        data: {
          leverageMultiplier: '0.05', // 1/20 of bot's position size
        },
      });
      console.log(`✓ Updated leverageMultiplier to 0.05 for ${config.id}`);
    }
  }

  console.log('✓ MirrorAccounts seeded');

  // Seed default SystemStatus (singleton)
  let systemStatus = await prisma.systemStatus.findFirst();
  
  if (!systemStatus) {
    // Read kill switch from environment (default to false if not set)
    const killSwitch = process.env.FADEARENA_KILL_SWITCH === 'true';
    systemStatus = await prisma.systemStatus.create({
      data: {
        id: 'default',
        killSwitch,
        hyperliquidConnected: false,
      },
    });
    console.log(`✓ SystemStatus created with killSwitch=${killSwitch}`);
  } else {
    // Update kill switch from environment if changed
    const killSwitch = process.env.FADEARENA_KILL_SWITCH === 'true';
    if (systemStatus.killSwitch !== killSwitch) {
      await prisma.systemStatus.update({
        where: { id: 'default' },
        data: { killSwitch },
      });
      console.log(`✓ SystemStatus updated: killSwitch=${killSwitch}`);
    }
  }

  console.log('✓ SystemStatus seeded');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

