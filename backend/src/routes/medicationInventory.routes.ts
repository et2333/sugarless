import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  medicationName: z.string().min(1),
  dosageStrength: z.string().optional(),
  form: z.string().optional(),
  initialQuantity: z.coerce.number().int().min(0),
  quantityUnit: z.string().optional(),
  dosagePerTime: z.coerce.number().int().min(1),
  timesPerDay: z.coerce.number().int().min(1),
  dosageTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1),
  autoReminderEnabled: z.boolean().optional().default(true),
});

router.post('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const data = createSchema.parse(req.body);

  const daily = data.dosagePerTime * data.timesPerDay;
  const daysRemain = daily > 0 ? Math.floor(data.initialQuantity / daily) : 0;
  const expectedEmpty = daily > 0 ? new Date(Date.now() + daysRemain * 24 * 60 * 60 * 1000) : null;

  const inv = await prisma.medicationInventory.create({
    data: {
      userId,
      medicationName: data.medicationName,
      dosageStrength: data.dosageStrength,
      form: data.form,
      initialQuantity: data.initialQuantity,
      currentQuantity: data.initialQuantity,
      quantityUnit: data.quantityUnit,
      dosagePerTime: data.dosagePerTime,
      timesPerDay: data.timesPerDay,
      dosageTimes: JSON.stringify(data.dosageTimes),
      dailyConsumption: daily,
      daysRemaining: daysRemain,
      expectedEmptyDate: expectedEmpty || undefined,
      autoReminderEnabled: data.autoReminderEnabled,
      status: 'active',
    }
  });

  let reminderIds: string[] = [];
  if (data.autoReminderEnabled) {
    // create reminders for each time
    for (const time of data.dosageTimes) {
      const reminder = await prisma.reminder.create({
        data: {
          userId,
          type: 'medication',
          title: 'Medication Reminder',
          message: `Take ${data.medicationName} (${data.dosagePerTime} ${data.quantityUnit || 'pills'})`,
          priority: 'medium',
          scheduleType: 'daily',
          scheduleTime: time,
          daysOfWeek: JSON.stringify([1,2,3,4,5,6,7]),
          startDate: new Date(),
          endDate: expectedEmpty || null,
          relatedId: inv.id,
          isActive: true,
        }
      });
      reminderIds.push(reminder.id);
    }

    await prisma.medicationInventory.update({
      where: { id: inv.id },
      data: { reminderIds: JSON.stringify(reminderIds) }
    });
  }

  res.status(201).json({ success: true, data: { ...inv, reminderIds } });
});

router.get('/', async (req: AuthRequest, res) => {
  const list = await prisma.medicationInventory.findMany({
    where: { userId: req.user!.userId },
    orderBy: { updatedAt: 'desc' }
  });
  res.json({ success: true, data: list });
});

router.post('/:id/refill', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { quantity, pharmacy, cost, notes } = req.body || {};
  const inv = await prisma.medicationInventory.findFirst({ where: { id, userId: req.user!.userId } });
  if (!inv) throw new AppError('Medication not found', 404);

  const addQty = Number(quantity || 0);
  const newQty = (inv.currentQuantity || 0) + addQty;
  const daily = inv.dosagePerTime * inv.timesPerDay;
  const daysRemain = daily > 0 ? Math.floor(newQty / daily) : null;
  const expectedEmpty = daily > 0 ? new Date(Date.now() + (daysRemain || 0) * 24 * 60 * 60 * 1000) : null;

  await prisma.medicationInventory.update({
    where: { id },
    data: {
      currentQuantity: newQty,
      dailyConsumption: daily,
      daysRemaining: daysRemain ?? undefined,
      expectedEmptyDate: expectedEmpty ?? undefined,
      status: 'active'
    }
  });

  await prisma.medicationRefillLog.create({
    data: {
      medicationInventoryId: id,
      refillQuantity: addQty,
      refillDate: new Date(),
      pharmacy,
      cost: cost ? Number(cost) : null,
      notes,
    }
  });

  res.json({ success: true });
});

router.get('/:id/forecast', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const inv = await prisma.medicationInventory.findFirst({ where: { id, userId: req.user!.userId } });
  if (!inv) throw new AppError('Medication not found', 404);

  const daily = inv.dosagePerTime * inv.timesPerDay;
  const daysRemain = daily > 0 ? Math.floor((inv.currentQuantity || 0) / daily) : 0;
  const expectedEmpty = daily > 0 ? new Date(Date.now() + daysRemain * 24 * 60 * 60 * 1000) : null;
  const suggestedRefill = expectedEmpty ? new Date(expectedEmpty.getTime() - 5 * 24 * 60 * 60 * 1000) : null;

  res.json({
    success: true,
    data: {
      currentQuantity: inv.currentQuantity,
      dailyConsumption: daily,
      daysRemaining: daysRemain,
      expectedEmptyDate: expectedEmpty,
      suggestedRefillDate: suggestedRefill,
      consumptionTrends: [],
    }
  });
});

export default router;


