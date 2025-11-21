import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';
import type { Settings } from '@fadearena/shared';

const router = Router();

export function createSettingsRouter(prisma: PrismaClient) {
  // GET /api/settings
  router.get('/api/settings', async (req, res) => {
    try {
      const settingsRecord = await prisma.settings.findUnique({
        where: { id: 'default' },
      });

      if (!settingsRecord) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      const systemStatus = await prisma.systemStatus.findUnique({
        where: { id: 'default' },
      });

      // Parse JSON strings for SQLite compatibility
      const botConfigs = typeof settingsRecord.botConfigs === 'string' 
        ? JSON.parse(settingsRecord.botConfigs) 
        : (settingsRecord.botConfigs as any[]) || [];
      const assetExposureCaps = typeof settingsRecord.assetExposureCaps === 'string'
        ? JSON.parse(settingsRecord.assetExposureCaps)
        : (settingsRecord.assetExposureCaps as Record<string, number | null>) || {};

      const settings: Settings = {
        mode: settingsRecord.mode as 'simulation' | 'live',
        globalExposureCap: settingsRecord.globalExposureCap
          ? Number(settingsRecord.globalExposureCap)
          : null,
        dailyLossLimit: settingsRecord.dailyLossLimit
          ? Number(settingsRecord.dailyLossLimit)
          : null,
        bots: botConfigs,
        assetExposureCaps,
        killSwitch: systemStatus?.killSwitch || false,
      };

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  // POST /api/settings
  router.post('/api/settings', async (req, res) => {
    try {
      const updates: any = req.body;
      const errors: string[] = [];

      // Validate mode
      if (updates.mode && !['simulation', 'live'].includes(updates.mode)) {
        errors.push('mode must be "simulation" or "live"');
      }

      // Validate leverage multipliers
      if (updates.bots) {
        for (const bot of updates.bots) {
          if (bot.leverageMultiplier !== undefined) {
            if (bot.leverageMultiplier < 0.1 || bot.leverageMultiplier > 10.0) {
              errors.push(`leverageMultiplier for ${bot.id} must be between 0.1 and 10.0`);
            }
          }
        }
      }

      // Validate caps
      if (updates.globalExposureCap !== undefined && updates.globalExposureCap !== null) {
        if (updates.globalExposureCap <= 0) {
          errors.push('globalExposureCap must be positive');
        }
      }

      if (updates.dailyLossLimit !== undefined && updates.dailyLossLimit !== null) {
        if (updates.dailyLossLimit <= 0) {
          errors.push('dailyLossLimit must be positive');
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      // Get current settings
      const current = await prisma.settings.findUnique({
        where: { id: 'default' },
      });

      if (!current) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      // Parse current JSON strings
      const currentBotConfigs = typeof current.botConfigs === 'string' 
        ? JSON.parse(current.botConfigs) 
        : (current.botConfigs as any[]);
      const currentAssetCaps = typeof current.assetExposureCaps === 'string'
        ? JSON.parse(current.assetExposureCaps)
        : (current.assetExposureCaps as Record<string, number | null>);

      // Update settings (serialize JSON for SQLite)
      const updated = await prisma.settings.update({
        where: { id: 'default' },
        data: {
          mode: updates.mode || current.mode,
          globalExposureCap: updates.globalExposureCap !== undefined ? updates.globalExposureCap : current.globalExposureCap,
          dailyLossLimit: updates.dailyLossLimit !== undefined ? updates.dailyLossLimit : current.dailyLossLimit,
          botConfigs: updates.bots ? JSON.stringify(updates.bots) : JSON.stringify(currentBotConfigs),
          assetExposureCaps: updates.assetExposureCaps ? JSON.stringify(updates.assetExposureCaps) : JSON.stringify(currentAssetCaps),
        },
      });

      // Build response
      const systemStatus = await prisma.systemStatus.findUnique({
        where: { id: 'default' },
      });

      // Parse JSON strings
      const updatedBotConfigs = typeof updated.botConfigs === 'string'
        ? JSON.parse(updated.botConfigs)
        : (updated.botConfigs as any[]) || [];
      const updatedAssetCaps = typeof updated.assetExposureCaps === 'string'
        ? JSON.parse(updated.assetExposureCaps)
        : (updated.assetExposureCaps as Record<string, number | null>) || {};

      const settings: Settings = {
        mode: updated.mode as 'simulation' | 'live',
        globalExposureCap: updated.globalExposureCap ? Number(updated.globalExposureCap) : null,
        dailyLossLimit: updated.dailyLossLimit ? Number(updated.dailyLossLimit) : null,
        bots: updatedBotConfigs,
        assetExposureCaps: updatedAssetCaps,
        killSwitch: systemStatus?.killSwitch || false,
      };

      res.json({ success: true, settings });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
  });

  return router;
}

