import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/**
 * Diagnostic endpoint for reminder issues
 */
router.get('/debug/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
      include: {
        responses: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const today = now.toISOString().split('T')[0];
    
    let daysOfWeek: number[] = [];
    try {
      daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
    } catch (e) {
      daysOfWeek = [];
    }

    // Check various conditions
    const checks = {
      isActive: reminder.isActive,
      scheduleTime: reminder.scheduleTime,
      currentTime,
      timeMatches: reminder.scheduleTime === currentTime,
      scheduleType: reminder.scheduleType,
      daysOfWeek,
      currentDayOfWeek: dayOfWeek,
      isDayIncluded: (() => {
        if (reminder.scheduleType === 'daily') {
          return daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek);
        } else if (reminder.scheduleType === 'weekly') {
          return daysOfWeek.includes(dayOfWeek);
        } else if (reminder.scheduleType === 'once') {
          const startDate = new Date(reminder.startDate);
          return startDate.toISOString().split('T')[0] === today;
        }
        return false;
      })(),
      startDate: reminder.startDate,
      endDate: reminder.endDate,
      isInDateRange: reminder.startDate <= now && (!reminder.endDate || reminder.endDate >= now),
      lastRemindedAt: reminder.lastRemindedAt,
      lastRemindedToday: reminder.lastRemindedAt ? 
        new Date(reminder.lastRemindedAt).toISOString().split('T')[0] === today : false,
      shouldTrigger: (() => {
        if (!reminder.isActive) return false;
        if (reminder.scheduleTime !== currentTime) return false;
        if (!(reminder.startDate <= now && (!reminder.endDate || reminder.endDate >= now))) return false;
        
        let dayMatches = false;
        if (reminder.scheduleType === 'daily') {
          dayMatches = daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek);
        } else if (reminder.scheduleType === 'weekly') {
          dayMatches = daysOfWeek.includes(dayOfWeek);
        } else if (reminder.scheduleType === 'once') {
          const startDate = new Date(reminder.startDate);
          dayMatches = startDate.toISOString().split('T')[0] === today;
        }
        
        if (!dayMatches) return false;
        
        // Check if already reminded today
        const lastReminded = reminder.lastRemindedAt;
        const shouldNotify = !lastReminded || 
          new Date(lastReminded).toISOString().split('T')[0] !== today;
        
        return shouldNotify;
      })()
    };

    res.json({
      success: true,
      reminder: {
        id: reminder.id,
        title: reminder.title,
        message: reminder.message,
        type: reminder.type,
        priority: reminder.priority,
      },
      checks,
      suggestion: !checks.shouldTrigger ? 
        getSuggestion(checks) : 
        '✅ Reminder should be able to trigger normally'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reset reminder's lastRemindedAt field, allowing re-triggering
 */
router.post('/reset/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await prisma.reminder.update({
      where: { id },
      data: {
        lastRemindedAt: null,
        noResponseCount: 0
      }
    });

    res.json({
      success: true,
      message: 'Reminder status has been reset, can now be triggered again'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function getSuggestion(checks: any): string {
  if (!checks.isActive) {
    return '❌ Reminder is not active, please enable it first';
  }
  if (!checks.timeMatches) {
    return `⏰ Current time ${checks.currentTime} does not match reminder time ${checks.scheduleTime}`;
  }
  if (!checks.isInDateRange) {
    return '📅 Current date is not within the reminder\'s valid date range';
  }
  if (!checks.isDayIncluded) {
    if (checks.scheduleType === 'once') {
      return `📅 This is a one-time reminder, start date is ${checks.startDate}, not today`;
    }
    return `📅 Today (Day ${checks.currentDayOfWeek}) is not in the reminder's repeat days. Configured days: ${checks.daysOfWeek.join(', ')}`;
  }
  if (checks.lastRemindedToday) {
    return `⚠️ Already reminded today (${checks.lastRemindedAt}). The system only triggers once per day to avoid duplicate reminders. You can use POST /api/reminders/reset/:id to reset the status for testing.`;
  }
  return 'Unknown issue';
}

export default router;
