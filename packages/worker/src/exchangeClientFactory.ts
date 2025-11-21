/**
 * Exchange Client Factory
 * 
 * Manages multiple HyperliquidExchangeClient instances, one per mirror account.
 * Provides a way to get the appropriate client for a given mirror account ID.
 */

import pino from 'pino';
import { HyperliquidExchangeClient } from './hyperliquidClient';
import type { PrismaClient } from '@fadearena/shared';

const logger = pino({ name: 'ExchangeClientFactory' });

export class ExchangeClientFactory {
  private clients: Map<string, HyperliquidExchangeClient> = new Map();
  private infoUrl: string;
  private exchangeUrl: string;
  private prisma: PrismaClient;
  private simulationMode: boolean;

  constructor(
    infoUrl: string,
    exchangeUrl: string,
    prisma: PrismaClient,
    simulationMode: boolean = false
  ) {
    this.infoUrl = infoUrl;
    this.exchangeUrl = exchangeUrl;
    this.prisma = prisma;
    this.simulationMode = simulationMode;
  }

  /**
   * Get or create an exchange client for a given mirror account ID
   */
  async getClient(mirrorAccountId: string): Promise<HyperliquidExchangeClient | null> {
    // Check cache first
    if (this.clients.has(mirrorAccountId)) {
      return this.clients.get(mirrorAccountId)!;
    }

    // Load mirror account from database
    const mirrorAccount = await this.prisma.mirrorAccount.findUnique({
      where: { id: mirrorAccountId },
    });

    if (!mirrorAccount) {
      logger.warn({ mirrorAccountId }, 'Mirror account not found');
      return null;
    }

    if (!mirrorAccount.enabled) {
      logger.debug({ mirrorAccountId }, 'Mirror account is disabled');
      return null;
    }

    // In simulation mode, we still create a client but it won't place real orders
    // The actual order placement logic in strategyEngine will handle simulation
    if (this.simulationMode) {
      // Create a client with dummy credentials for simulation
      // The client will be created but orders will be simulated
      const client = new HyperliquidExchangeClient(
        this.exchangeUrl,
        mirrorAccount.myWallet,
        '0x0000000000000000000000000000000000000000000000000000000000000000' // Dummy key
      );
      this.clients.set(mirrorAccountId, client);
      logger.info({ mirrorAccountId, myWallet: mirrorAccount.myWallet }, 'Created exchange client (simulation mode)');
      return client;
    }

    // In live mode, we need the private key from environment
    const privateKeyEnvVar = this.getPrivateKeyEnvVar(mirrorAccountId);
    const privateKey = process.env[privateKeyEnvVar];

    if (!privateKey) {
      logger.error(
        { mirrorAccountId, envVar: privateKeyEnvVar },
        'Private key not found in environment for mirror account'
      );
      return null;
    }

    // Create and cache the client
    const client = new HyperliquidExchangeClient(
      this.exchangeUrl,
      mirrorAccount.myWallet,
      privateKey
    );
    this.clients.set(mirrorAccountId, client);
    logger.info({ mirrorAccountId, myWallet: mirrorAccount.myWallet }, 'Created exchange client (live mode)');
    return client;
  }

  /**
   * Get the environment variable name for a mirror account's private key
   */
  private getPrivateKeyEnvVar(mirrorAccountId: string): string {
    // Map bot IDs to env var names
    const envVarMap: Record<string, string> = {
      'gemini-3-pro': 'MY_GEMINI_FADE_PRIVATE_KEY',
      'grok-4': 'MY_GROK_FADE_PRIVATE_KEY',
      'qwen3-max': 'MY_QWEN_FADE_PRIVATE_KEY',
      'kimi-k2-thinking': 'MY_KIMI_FADE_PRIVATE_KEY',
      'deepseek-chat-v3.1': 'MY_DEEPSEEK_FADE_PRIVATE_KEY',
      'claude-sonnet': 'MY_CLAUDE_FADE_PRIVATE_KEY',
    };

    return envVarMap[mirrorAccountId] || `MY_${mirrorAccountId.toUpperCase().replace(/-/g, '_')}_FADE_PRIVATE_KEY`;
  }

  /**
   * Clear the client cache (useful for testing or when mirror accounts are updated)
   */
  clearCache(): void {
    this.clients.clear();
    logger.info('Cleared exchange client cache');
  }

  /**
   * Remove a specific client from cache
   */
  removeClient(mirrorAccountId: string): void {
    this.clients.delete(mirrorAccountId);
    logger.info({ mirrorAccountId }, 'Removed exchange client from cache');
  }
}

