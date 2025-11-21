import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed default Settings (singleton)
  // Note: Prisma doesn't support upsert with custom ID, so we use findFirst + create/update
  let defaultSettings = await prisma.settings.findFirst();
  
  if (!defaultSettings) {
    // Read mode from environment or default to simulation
    const mode = process.env.FADEARENA_MODE || 'simulation';
    defaultSettings = await prisma.settings.create({
      data: {
        id: 'default',
        mode: mode === 'live' ? 'live' : 'simulation',
        globalExposureCap: null,
        dailyLossLimit: null,
        botConfigs: JSON.stringify([
          { id: 'gemini-3-pro', enabled: true, leverageMultiplier: 1.0 },
          { id: 'grok-4', enabled: true, leverageMultiplier: 1.0 },
          { id: 'qwen3-max', enabled: true, leverageMultiplier: 1.0 },
          { id: 'kimi-k2-thinking', enabled: true, leverageMultiplier: 1.0 },
          { id: 'deepseek-chat-v3.1', enabled: true, leverageMultiplier: 1.0 },
          { id: 'claude-sonnet', enabled: true, leverageMultiplier: 1.0 },
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
      console.log(`⚠ Skipping ${config.id}: mirror wallet not configured (using placeholder)`);
    }

    // Use placeholder if myWallet is not set (for development)
    const finalMyWallet = myWallet || '0x0000000000000000000000000000000000000000';

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
          leverageMultiplier: null, // Will use default from bot config
          allocationUsd: null,
        },
      });
      console.log(`✓ Created mirror account: ${config.id}`);
    }
  }

  console.log('✓ MirrorAccounts seeded');

  // Seed default SystemStatus (singleton)
  let systemStatus = await prisma.systemStatus.findFirst();
  
  if (!systemStatus) {
    // Read kill switch from environment
    const killSwitch = process.env.FADEARENA_KILL_SWITCH === 'true';
    systemStatus = await prisma.systemStatus.create({
      data: {
        id: 'default',
        killSwitch,
        hyperliquidConnected: false,
      },
    });
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

