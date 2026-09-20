import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { triggerTestReminder } from '../services/reminderScheduler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 创建提醒验证schema
const reminderSchema = z.object({
  type: z.enum(['medication', 'glucose_check', 'meal', 'exercise', 'appointment', 'review']),
  title: z.string().min(1, '标题不能为空'),
  message: z.string().min(1, '消息不能为空'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  scheduleType: z.enum(['once', 'daily', 'weekly', 'custom']),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式必须为HH:MM'),
  daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  relatedId: z.string().optional()
});

// 获取用户所有提醒
router.get('/', async (req: AuthRequest, res) => {
  const { type, isActive } = req.query;
  
  const where: any = {
    userId: req.user!.userId
  };
  
  if (type) {
    where.type = type;
  }
  
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }
  
  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      completions: {
        orderBy: { completedAt: 'desc' },
        take: 7  // 最近7次完成记录
      }
    }
  });
  
  // 解析JSON字段并计算完成率
  const remindersData = reminders.map(reminder => {
    let daysOfWeek: number[] = [];
    try {
      daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
    } catch (e) {
      console.error('Failed to parse daysOfWeek for reminder:', reminder.id, e);
      daysOfWeek = [];
    }
    const completionRate = calculateCompletionRate(reminder.completions);
    
    return {
      ...reminder,
      daysOfWeek,
      completionRate
    };
  });
  
  res.json({
    success: true,
    data: remindersData
  });
});

// 获取今日提醒
router.get('/today', async (req: AuthRequest, res) => {
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 转换为1-7（周一到周日）
  
  const reminders = await prisma.reminder.findMany({
    where: {
      userId: req.user!.userId,
      isActive: true,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } }
      ]
    },
    orderBy: { scheduleTime: 'asc' }
  });
  
  // 过滤出今天有效的提醒
  const todayReminders = reminders.filter(reminder => {
    let daysOfWeek: number[] = [];
    try {
      daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
    } catch (e) {
      console.error('Failed to parse daysOfWeek for reminder:', reminder.id, e);
      daysOfWeek = [];
    }
    
    if (reminder.scheduleType === 'daily') {
      return daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek);
    } else if (reminder.scheduleType === 'weekly') {
      return daysOfWeek.includes(dayOfWeek);
    } else if (reminder.scheduleType === 'once') {
      // 检查是否是今天
      const startDate = new Date(reminder.startDate);
      return startDate.toDateString() === now.toDateString();
    }
    
    return false;
  }).map(reminder => {
    let daysOfWeek: number[] = [];
    try {
      daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
    } catch (e) {
      daysOfWeek = [];
    }
    return {
      ...reminder,
      daysOfWeek
    };
  });
  
  res.json({
    success: true,
    data: todayReminders
  });
});

// 获取需要特别关注的提醒（连续3次没有反馈）
router.get('/no-response-reminders', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  
  // 查找连续3次或以上没有反馈的提醒
  const reminders = await prisma.reminder.findMany({
    where: {
      userId,
      isActive: true,
      noResponseCount: {
        gte: 3
      }
    },
    include: {
      completions: {
        orderBy: { completedAt: 'desc' },
        take: 5
      }
    },
    orderBy: [
      { noResponseCount: 'desc' },
      { createdAt: 'asc' }
    ]
  });
  
  res.json({
    success: true,
    data: reminders.map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      message: reminder.message,
      type: reminder.type,
      priority: reminder.priority,
      noResponseCount: reminder.noResponseCount,
      lastRemindedAt: reminder.lastRemindedAt,
      createdAt: reminder.createdAt
    })),
    message: `找到 ${reminders.length} 个需要特别关注的提醒`
  });
});

// 获取提醒统计
router.get('/stats/summary', async (req: AuthRequest, res) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // 获取本周提醒完成情况
  const weeklyCompletions = await prisma.reminderCompletion.findMany({
    where: {
      reminder: {
        userId: req.user!.userId
      },
      completedAt: {
        gte: startOfWeek
      }
    },
    include: {
      reminder: {
        select: {
          type: true
        }
      }
    }
  });
  
  // 按类型统计
  const stats = weeklyCompletions.reduce((acc: any, completion) => {
    const type = completion.reminder.type;
    if (!acc[type]) {
      acc[type] = { completed: 0, skipped: 0 };
    }
    
    if (completion.skipped) {
      acc[type].skipped++;
    } else {
      acc[type].completed++;
    }
    
    return acc;
  }, {});
  
  // 获取活跃提醒数
  const activeReminders = await prisma.reminder.count({
    where: {
      userId: req.user!.userId,
      isActive: true
    }
  });
  
  // 计算总体完成率
  const totalCompleted = weeklyCompletions.filter(c => !c.skipped).length;
  const totalRecords = weeklyCompletions.length;
  const completionRate = totalRecords > 0 ? (totalCompleted / totalRecords * 100).toFixed(1) : '0.0';
  
  res.json({
    success: true,
    data: {
      activeReminders,
      weeklyStats: stats,
      completionRate: parseFloat(completionRate),
      period: 'this_week'
    }
  });
});

// 获取单个提醒详情
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const reminder = await prisma.reminder.findFirst({
    where: {
      id,
      userId: req.user!.userId
    },
    include: {
      completions: {
        orderBy: { completedAt: 'desc' },
        take: 30
      }
    }
  });
  
  if (!reminder) {
    throw new AppError('提醒不存在', 404, 'REMINDER_NOT_FOUND');
  }
  
  let daysOfWeek: number[] = [];
  try {
    daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
  } catch (e) {
    console.error('Failed to parse daysOfWeek for reminder:', reminder.id, e);
    daysOfWeek = [];
  }
  
  res.json({
    success: true,
    data: {
      ...reminder,
      daysOfWeek
    }
  });
});

// 创建提醒
router.post('/', async (req: AuthRequest, res) => {
  const data = reminderSchema.parse(req.body);
  
  const reminder = await prisma.reminder.create({
    data: {
      userId: req.user!.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'medium',
      scheduleType: data.scheduleType,
      scheduleTime: data.scheduleTime,
      daysOfWeek: JSON.stringify(data.daysOfWeek || [1,2,3,4,5,6,7]),
      startDate: data.startDate || new Date(),
      endDate: data.endDate,
      relatedId: data.relatedId
    }
  });
  
  let daysOfWeek: number[] = [];
  try {
    daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
  } catch (e) {
    daysOfWeek = [];
  }
  
  res.status(201).json({
    success: true,
    data: {
      ...reminder,
      daysOfWeek
    },
    message: '提醒创建成功'
  });
});

// 更新提醒
router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  // 支持部分更新（例如仅更新时间）
  const data = reminderSchema.partial().parse(req.body);
  
  const existing = await prisma.reminder.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('提醒不存在', 404, 'REMINDER_NOT_FOUND');
  }
  
  const updateData: any = {};
  if (data.type !== undefined) updateData.type = data.type;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.message !== undefined) updateData.message = data.message;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.scheduleType !== undefined) updateData.scheduleType = data.scheduleType;
  if (data.scheduleTime !== undefined) updateData.scheduleTime = data.scheduleTime;
  if (data.daysOfWeek !== undefined) updateData.daysOfWeek = JSON.stringify(data.daysOfWeek);
  if (data.startDate !== undefined) updateData.startDate = data.startDate as any;
  if (data.endDate !== undefined) updateData.endDate = data.endDate as any;
  if (data.relatedId !== undefined) updateData.relatedId = data.relatedId;

  const reminder = await prisma.reminder.update({
    where: { id },
    data: updateData
  });
  
  let daysOfWeek: number[] = [];
  try {
    daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
  } catch (e) {
    daysOfWeek = [];
  }
  
  res.json({
    success: true,
    data: {
      ...reminder,
      daysOfWeek
    },
    message: '提醒更新成功'
  });
});

// 启用/禁用提醒
router.patch('/:id/toggle', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const existing = await prisma.reminder.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('提醒不存在', 404, 'REMINDER_NOT_FOUND');
  }
  
  const reminder = await prisma.reminder.update({
    where: { id },
    data: {
      isActive: !existing.isActive
    }
  });
  
  let daysOfWeek: number[] = [];
  try {
    daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
  } catch (e) {
    daysOfWeek = [];
  }
  
  res.json({
    success: true,
    data: {
      ...reminder,
      daysOfWeek
    },
    message: reminder.isActive ? '提醒已启用' : '提醒已禁用'
  });
});

// 删除提醒
router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const existing = await prisma.reminder.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('提醒不存在', 404, 'REMINDER_NOT_FOUND');
  }
  
  await prisma.reminder.delete({
    where: { id }
  });
  
  res.json({
    success: true,
    message: '提醒已删除'
  });
});

// 标记提醒完成
router.post('/:id/complete', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { note, skipped } = z.object({
    note: z.string().optional(),
    skipped: z.boolean().optional().default(false)
  }).parse(req.body);
  
  const reminder = await prisma.reminder.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!reminder) {
    throw new AppError('提醒不存在', 404, 'REMINDER_NOT_FOUND');
  }
  
  // 如果是药物提醒且未跳过，减少库存（支持新库存表）
  if (reminder.type === 'medication' && !skipped && reminder.relatedId) {
    try {
      // 优先按新库存表扣减
      const inv = await prisma.medicationInventory.findFirst({
        where: { id: reminder.relatedId, userId: req.user!.userId }
      });
      if (inv) {
        const dose = Math.max(1, inv.dosagePerTime);
        const newQty = Math.max(0, (inv.currentQuantity || 0) - dose);
        const daily = inv.dosagePerTime * inv.timesPerDay;
        const daysRemain = daily > 0 ? Math.floor(newQty / daily) : null;
        const expectedEmpty = daily > 0 ? new Date(Date.now() + (daysRemain || 0) * 24 * 60 * 60 * 1000) : null;

        await prisma.medicationInventory.update({
          where: { id: inv.id },
          data: {
            currentQuantity: newQty,
            dailyConsumption: daily,
            daysRemaining: daysRemain ?? undefined,
            expectedEmptyDate: expectedEmpty ?? undefined,
            status: newQty <= 0 ? 'empty' : (daysRemain !== null && daysRemain <= (inv.lowStockThreshold || 10) ? 'low_stock' : 'active')
          }
        });

        await prisma.medicationConsumptionLog.create({
          data: {
            medicationInventoryId: inv.id,
            reminderId: reminder.id,
            consumedQuantity: dose,
            consumptionTime: new Date(),
            remainingQuantity: newQty,
            consumptionType: 'reminder_complete'
          }
        });
      } else {
        // 兼容旧Medication表：按1递减
        const medication = await prisma.medication.findFirst({
          where: { id: reminder.relatedId, userId: req.user!.userId }
        });
        if (medication && medication.currentQuantity > 0) {
          await prisma.medication.update({
            where: { id: medication.id },
            data: { currentQuantity: Math.max(0, medication.currentQuantity - 1) }
          });
        }
      }
    } catch (error) {
      console.error('减少药物库存失败:', error);
      // 不阻止提醒完成，只记录错误
    }
  }
  
  const completion = await prisma.reminderCompletion.create({
    data: {
      reminderId: id,
      skipped: skipped || false,
      note
    }
  });

  // 记录到 ReminderResponse（用于 Check-ins 展示）
  try {
    const scheduled = reminder.lastRemindedAt || new Date();
    const actual = new Date();
    const createdResp = await prisma.reminderResponse.create({
      data: {
        reminderId: id,
        userId: req.user!.userId,
        scheduledTime: scheduled,
        actualResponseTime: actual,
        action: skipped ? 'dismiss' : 'complete',
        snoozeDuration: null,
        snoozeCount: 0,
        responseDelay: Math.max(0, Math.round((actual.getTime() - scheduled.getTime()) / 60000)),
        dayOfWeek: actual.getDay() === 0 ? 7 : actual.getDay(),
        isWeekend: [0,6].includes(actual.getDay()),
      }
    });

    // 若存在延迟，且为每日/每周提醒，则将 scheduleTime 向后平移 delay 分钟
    if (!skipped && (reminder.scheduleType === 'daily' || reminder.scheduleType === 'weekly')) {
      const delayMin = createdResp.responseDelay || 0;
      if (delayMin > 0) {
        const [hh, mm] = (reminder.scheduleTime || '00:00').split(':').map((v: string) => parseInt(v, 10));
        const base = new Date();
        base.setHours(hh || 0, mm || 0, 0, 0);
        const newDate = new Date(base.getTime() + delayMin * 60000);
        const newHH = String(newDate.getHours()).padStart(2, '0');
        const newMM = String(newDate.getMinutes()).padStart(2, '0');
        await prisma.reminder.update({
          where: { id },
          data: { scheduleTime: `${newHH}:${newMM}` }
        });
      }
    }
  } catch (e) {
    console.warn('Failed to create reminder response (complete):', (e as any).message);
  }

  // 重置无反馈计数，因为用户已经给出了反馈
  await prisma.reminder.update({
    where: { id },
    data: {
      noResponseCount: 0,
      lastRemindedAt: null
    }
  });
  
  res.json({
    success: true,
    data: completion,
    message: skipped ? '已标记跳过' : '已标记完成'
  });
});

// 跳过提醒
router.post('/:id/skip', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { note } = z.object({
    note: z.string().optional()
  }).parse(req.body);
  
  const reminder = await prisma.reminder.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!reminder) {
    throw new AppError('提醒不存在', 404, 'REMINDER_NOT_FOUND');
  }
  
  const completion = await prisma.reminderCompletion.create({
    data: {
      reminderId: id,
      skipped: true,
      note
    }
  });
  
  res.json({
    success: true,
    data: completion,
    message: '已跳过'
  });
});


// 增加提醒的无反馈计数（用于系统内部，通常由定时任务调用）
router.post('/:id/increment-no-response', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const reminder = await prisma.reminder.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!reminder) {
    throw new AppError('提醒不存在', 404, 'REMINDER_NOT_FOUND');
  }
  
  // 增加无反馈计数并更新最后提醒时间
  const updatedReminder = await prisma.reminder.update({
    where: { id },
    data: {
      noResponseCount: {
        increment: 1
      },
      lastRemindedAt: new Date()
    }
  });
  
  res.json({
    success: true,
    data: {
      id: updatedReminder.id,
      title: updatedReminder.title,
      noResponseCount: updatedReminder.noResponseCount,
      lastRemindedAt: updatedReminder.lastRemindedAt
    },
    message: `提醒"${updatedReminder.title}"的无反馈次数已增加到 ${updatedReminder.noResponseCount}`
  });
});

// 测试提醒触发
/**
 * POST /api/reminders/trigger
 * Handle reminder trigger actions (complete, snooze, dismiss)
 */
router.post('/trigger', async (req: AuthRequest, res) => {
  try {
    const { reminderId, action, snoozeMinutes, triggeredAt } = req.body;

    if (!reminderId || !action) {
      throw new AppError('reminderId and action are required', 400, 'INVALID_REQUEST');
    }

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId: req.user!.userId,
      },
    });

    if (!reminder) {
      throw new AppError('Reminder not found', 404, 'REMINDER_NOT_FOUND');
    }

    if (action === 'complete') {
      // Mark reminder as completed
      await prisma.reminderCompletion.create({
        data: {
          reminderId: reminder.id,
          // userId: userId, // Removed - not in schema
          completedAt: new Date(),
          // status: "completed", // Removed - status field doesn't exist in schema
        },
      });
    } else if (action === 'snooze') {
      // Create a snooze record - could be stored in a separate table or as a note
      const snoozeMinutesValue = snoozeMinutes || 10;
      const snoozeUntil = new Date(Date.now() + snoozeMinutesValue * 60 * 1000);
      
      // Calculate scheduled time (when the reminder was supposed to trigger)
      const scheduledTime = reminder.scheduleTime ? (() => {
        const [hours, minutes] = reminder.scheduleTime.split(':').map(Number);
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        return today;
      })() : new Date();
      
      // Update reminder with snooze information (if you have a snoozeUntil field)
      // For now, we'll just log it or store in a response record
      await prisma.reminderResponse.create({
        data: {
          reminderId: reminder.id,
          userId: req.user!.userId,
          scheduledTime: scheduledTime,
          actualResponseTime: new Date(),
          action: 'snooze',
          snoozeDuration: snoozeMinutesValue,
        },
      });
    } else if (action === 'dismiss' || action === 'triggered') {
      // Calculate scheduled time (when the reminder was supposed to trigger)
      const scheduledTime = reminder.scheduleTime ? (() => {
        const [hours, minutes] = reminder.scheduleTime.split(':').map(Number);
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        return today;
      })() : (triggeredAt ? new Date(triggeredAt) : new Date());
      
      // Mark as triggered/dismissed
      await prisma.reminderResponse.create({
        data: {
          reminderId: reminder.id,
          userId: req.user!.userId,
          scheduledTime: scheduledTime,
          actualResponseTime: triggeredAt ? new Date(triggeredAt) : new Date(),
          action: action === 'triggered' ? 'triggered' : 'dismissed',
        },
      });
    }

    res.json({
      success: true,
      message: `Reminder ${action} successfully`,
    });
  } catch (error: any) {
    console.error('Trigger reminder error:', error);
    throw error;
  }
});

router.post('/test-trigger', async (req: AuthRequest, res) => {
  try {
    const { reminderId } = req.body;
    const userId = req.user!.userId;
    
    const reminder = await triggerTestReminder(userId, reminderId);
    
    res.json({
      success: true,
      message: 'Test reminder triggered',
      data: reminder
    });
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to trigger test reminder', 400);
  }
});

// 记录提醒响应（complete/snooze/dismiss/ignore）
router.post('/record-response', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { reminderId, action, snoozeDuration, snoozeCount, scheduledTime, actualResponseTime } = req.body;

  try {
    const reminder = await prisma.reminder.findFirst({ where: { id: reminderId, userId } });
    if (!reminder) throw new AppError('Reminder not found', 404);

    const scheduled = scheduledTime ? new Date(scheduledTime) : new Date();
    const actual = actualResponseTime ? new Date(actualResponseTime) : new Date();

    const response = await prisma.reminderResponse.create({
      data: {
        reminderId,
        userId,
        scheduledTime: scheduled,
        actualResponseTime: actual,
        action,
        snoozeDuration: snoozeDuration ?? null,
        snoozeCount: snoozeCount ?? 0,
        responseDelay: Math.max(0, Math.round((actual.getTime() - scheduled.getTime()) / 60000)),
        dayOfWeek: actual.getDay() === 0 ? 7 : actual.getDay(),
        isWeekend: [0,6].includes(actual.getDay()),
      }
    });

    res.json({ success: true, data: response });
  } catch (e: any) {
    throw new AppError(e.message || 'Failed to record response', 400);
  }
});

// 触发AI分析（简版）
router.post('/:id/analyze', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const reminderId = req.params.id;
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const responses = await prisma.reminderResponse.findMany({
      where: { reminderId, userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' }
    });

    const total = responses.length;
    const snoozes = responses.filter(r => r.action === 'snooze');
    if (total < 5 || snoozes.length === 0) {
      return res.json({ success: true, suggestion: null });
    }

    const avgSnooze = Math.round(
      snoozes.reduce((sum, r) => sum + (r.snoozeDuration || 0), 0) / snoozes.length
    );

    // 最常见的实际时间
    const buckets = new Map<number, number>();
    for (const r of snoozes) {
      if (!r.actualResponseTime) continue;
      const dt = new Date(r.actualResponseTime);
      const key = dt.getHours() * 60 + dt.getMinutes();
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    let mostCommon = null as null | number;
    buckets.forEach((v, k) => { if (mostCommon == null || v > (buckets.get(mostCommon) || 0)) mostCommon = k; });

    const suggestion = {
      reminderType: 'general',
      currentTime: '00:00',
      suggestedTime: mostCommon != null ? `${String(Math.floor(mostCommon/60)).padStart(2,'0')}:${String(mostCommon%60).padStart(2,'0')}` : undefined,
      reason: `Average snooze ${avgSnooze} minutes over last 30 days` ,
      snoozeRate: Math.round((snoozes.length / total) * 100),
      avgDelay: avgSnooze,
      patternType: 'consistent_delay'
    };

    res.json({ success: true, suggestion });
  } catch (e: any) {
    throw new AppError(e.message || 'Analysis failed', 400);
  }
});

// 获取最近的提醒响应记录（用户查看打卡）
router.get('/responses/recent', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const limit = Number(req.query.limit || 50);
  try {
    const responses = await prisma.reminderResponse.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: { reminder: true }
    });

    const data = responses.map((r) => ({
      id: r.id,
      action: r.action,
      scheduledTime: r.scheduledTime,
      actualResponseTime: r.actualResponseTime,
      snoozeDuration: r.snoozeDuration,
      responseDelay: r.responseDelay,
      // attach readable content for UI - prioritize content field, then title, then message
      content: r.reminder?.title ||
               r.reminder?.message ||
               r.reminder?.type ||
               'Reminder',
      type: r.reminder?.type || 'other',
      category: r.reminder?.type || 'other',
      // Include full reminder object for detailed access
      reminder: r.reminder ? {
        id: r.reminder.id,
        content: r.reminder.message,
        message: r.reminder.message,
        title: r.reminder.title,
        type: r.reminder.type,
        category: r.reminder.type,
        priority: r.reminder.priority,
      } : null,
    }));

    res.json({ success: true, data });
  } catch (e: any) {
    throw new AppError(e.message || 'Failed to fetch responses', 400);
  }
});

// 辅助函数：计算完成率
function calculateCompletionRate(completions: any[]): number {
  if (completions.length === 0) return 0;
  
  const completed = completions.filter(c => !c.skipped).length;
  return Math.round((completed / completions.length) * 100);
}

export default router;

