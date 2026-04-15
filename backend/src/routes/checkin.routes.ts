import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function normalizeType(t: string): 'medication'|'blood_sugar'|'exercise'|'followup'|'other' {
  if (t === 'glucose_check') return 'blood_sugar';
  if (t === 'appointment' || t === 'review' || t === 'followup') return 'followup';
  if (t === 'medication' || t === 'exercise' || t === 'blood_sugar') return t as any;
  return 'other';
}

// 今日打卡状态（从 ReminderResponse 推导）
router.get('/today', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(start.getTime() + 24*60*60*1000);
  const responses = await prisma.reminderResponse.findMany({
    where: { userId, actualResponseTime: { gte: start, lt: end } },
    include: { reminder: true },
  });
  const status: any = { medication: false, blood_sugar: false, exercise: false, followup: false };
  responses.forEach(r => {
    const t = normalizeType(r.reminder?.type || 'other');
    if (t !== 'other') status[t] = true;
  });
  res.json({ success: true, data: status });
});

// 连续天数（按类型计算）
router.get('/streaks', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const types: Array<'medication'|'blood_sugar'|'exercise'|'followup'> = ['medication','blood_sugar','exercise','followup'];
  const result: Record<string, number> = {};

  for (const t of types) {
    // 自今天倒推统计连续天数
    let streak = 0;
    for (let i=0; i<60; i++) { // 最多看两个月
      const day = new Date(); day.setHours(0,0,0,0); day.setDate(day.getDate()-i);
      const next = new Date(day.getTime()+24*60*60*1000);
      const dayCount = await prisma.reminderResponse.count({
        where: {
          userId,
          actualResponseTime: { gte: day, lt: next },
          reminder: { type: t === 'blood_sugar' ? 'glucose_check' : (t === 'followup' ? undefined : t) }
        }
      });
      if (dayCount>0) streak++; else break;
    }
    result[t] = streak;
  }

  res.json({ success: true, data: result });
});

// 按月历史（日历用）
router.get('/history', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const year = Number(req.query.year), month = Number(req.query.month); // month 1-12
  const start = new Date(year, month-1, 1); start.setHours(0,0,0,0);
  const end = new Date(year, month, 0); end.setHours(23,59,59,999);
  const responses = await prisma.reminderResponse.findMany({
    where: { userId, actualResponseTime: { gte: start, lte: end } },
    include: { reminder: true }, orderBy: { actualResponseTime: 'asc' }
  });
  const calendar: Record<string, any> = {};
  responses.forEach(r => {
    const d = new Date(r.actualResponseTime || r.scheduledTime);
    const key = d.toISOString().split('T')[0];
    if (!calendar[key]) calendar[key] = { medication:false, blood_sugar:false, exercise:false, followup:false };
    const t = normalizeType(r.reminder?.type || 'other');
    if (t !== 'other') calendar[key][t] = true;
  });
  res.json({ success: true, data: calendar });
});

/**
 * POST /api/check-ins/auto-create
 * Automatically create a check-in record when reminder is triggered
 */
router.post('/auto-create', async (req: AuthRequest, res) => {
  try {
    const { reminderId, triggeredAt, status } = req.body;
    const userId = req.user!.userId;

    if (!reminderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REMINDER_ID', message: 'reminderId is required' },
      });
    }

    // Verify reminder exists and belongs to user
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: { code: 'REMINDER_NOT_FOUND', message: 'Reminder not found' },
      });
    }

    // Calculate scheduled time from reminder
    let scheduledTime: Date;
    if (triggeredAt) {
      scheduledTime = new Date(triggeredAt);
    } else if (reminder.scheduleTime) {
      const [hours, minutes] = reminder.scheduleTime.split(':').map(Number);
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      scheduledTime = today;
    } else {
      scheduledTime = new Date();
    }

    // Create reminder response record with content
    const response = await prisma.reminderResponse.create({
      data: {
        reminderId,
        userId,
        scheduledTime: scheduledTime,
        actualResponseTime: new Date(),
        action: req.body.action || 'triggered',
        // status: status || 'pending', // Removed - status field doesn't exist in schema
        snoozeDuration: req.body.snoozeMinutes || null,
      },
      include: {
        reminder: true,
      },
    });

    res.json({
      success: true,
      data: response,
      message: 'Check-in record created automatically',
    });
  } catch (error: any) {
    console.error('Auto-create check-in error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTO_CREATE_FAILED',
        message: error.message || 'Failed to auto-create check-in',
      },
    });
  }
});

export default router;


