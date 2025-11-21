/**
 * Shared configuration for FadeArena
 */

export interface AppConfig {
  // Hyperliquid API
  hyperliquid: {
    infoUrl: string;
    exchangeUrl: string;
    walletAddress: string;
    privateKey: string; // For signing orders
  };
  
  // Database
  database: {
    url: string;
  };
  
  // Bot configuration
  bots: Array<{
    id: string;
    name: string;
    walletAddress: string;
  }>;
  
  // Polling intervals (ms)
  polling: {
    botStateInterval: number; // How often to poll bot positions
    reconciliationInterval: number; // How often to reconcile our positions
  };
  
  // Risk limits (defaults, can be overridden in DB)
  risk: {
    defaultLeverageMultiplier: number;
    defaultGlobalExposureCap: number | null;
    defaultDailyLossLimit: number | null;
  };
  
  // Server
  server: {
    port: number;
    host: string;
  };
}

export function loadConfig(): AppConfig {
  const bots = [
    { 
      id: 'gemini-3-pro', 
      name: 'Gemini 3 Pro', 
      walletAddress: process.env.BOT_GEMINI_3_PRO || process.env.GEMINI_3_PRO_WALLET || '' 
    },
    { 
      id: 'grok-4', 
      name: 'Grok 4', 
      walletAddress: process.env.BOT_GROK_4 || process.env.GROK_4_WALLET || '' 
    },
    { 
      id: 'qwen3-max', 
      name: 'Qwen3 Max', 
      walletAddress: process.env.BOT_QWEN3_MAX || process.env.QWEN3_MAX_WALLET || '' 
    },
    { 
      id: 'kimi-k2-thinking', 
      name: 'Kimi K2 Thinking', 
      walletAddress: process.env.BOT_KIMI_K2_THINKING || process.env.KIMI_K2_THINKING_WALLET || '' 
    },
    { 
      id: 'deepseek-chat-v3.1', 
      name: 'DeepSeek Chat v3.1', 
      walletAddress: process.env.BOT_DEEPSEEK_CHAT_V3_1 || process.env.DEEPSEEK_CHAT_V3_1_WALLET || '' 
    },
    { 
      id: 'claude-sonnet', 
      name: 'Claude Sonnet', 
      walletAddress: process.env.BOT_CLAUDE_SONNET_4_5 || process.env.CLAUDE_SONNET_WALLET || '' 
    },
  ].filter(bot => bot.walletAddress); // Only include bots with wallet addresses

  return {
    hyperliquid: {
      infoUrl: process.env.HYPERLIQUID_API_URL_INFO || 'https://api.hyperliquid.xyz/info',
      exchangeUrl: process.env.HYPERLIQUID_API_URL_EXCHANGE || 'https://api.hyperliquid.xyz/exchange',
      walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || '',
      privateKey: process.env.HYPERLIQUID_WALLET_PRIVATE_KEY || '',
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/fadearena',
    },
    bots,
    polling: {
      botStateInterval: parseInt(process.env.BOT_STATE_INTERVAL_MS || '5000', 10),
      reconciliationInterval: parseInt(process.env.RECONCILIATION_INTERVAL_MS || '60000', 10),
    },
    risk: {
      defaultLeverageMultiplier: parseFloat(process.env.DEFAULT_LEVERAGE_MULTIPLIER || '1.0'),
      defaultGlobalExposureCap: process.env.DEFAULT_GLOBAL_EXPOSURE_CAP
        ? parseFloat(process.env.DEFAULT_GLOBAL_EXPOSURE_CAP)
        : null,
      defaultDailyLossLimit: process.env.DEFAULT_DAILY_LOSS_LIMIT
        ? parseFloat(process.env.DEFAULT_DAILY_LOSS_LIMIT)
        : null,
    },
    server: {
      port: parseInt(process.env.PORT || '3001', 10),
      host: process.env.HOST || '0.0.0.0',
    },
  };
}

