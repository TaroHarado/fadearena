import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';

const router = Router();

export function createKillSwitchRouter(prisma: PrismaClient) {
  router.post('/api/kill-switch', async (req, res) => {
    try {
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        return res.status(400).json({ error: 'active must be a boolean' });
      }

      const now = new Date();

      const systemStatus = await prisma.systemStatus.update({
        where: { id: 'default' },
        data: {
          killSwitch: active,
          ...(active
            ? { killSwitchActivatedAt: now }
            : { killSwitchDeactivatedAt: now }),
        },
      });

      res.json({
        success: true,
        killSwitch: systemStatus.killSwitch,
        message: active ? 'Kill switch activated' : 'Kill switch deactivated',
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update kill switch' });
    }
  });

  return router;
}

