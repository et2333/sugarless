import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 创建药物验证schema
const medicationSchema = z.object({
  name: z.string().min(1, '药物名称不能为空'),
  genericName: z.string().optional(),
  brand: z.string().optional(),
  dosage: z.string(),
  form: z.enum(['tablet', 'capsule', 'liquid', 'injection']),
  prescribedDose: z.number().min(1),
  frequency: z.enum(['once_daily', 'twice_daily', 'three_times_daily', 'as_needed']),
  timings: z.array(z.string()),
  currentQuantity: z.number().min(0),
  refillThreshold: z.number().min(1).optional(),
  prescribedBy: z.string().optional(),
  prescriptionDate: z.string().transform(str => new Date(str)).optional(),
  validUntil: z.string().transform(str => new Date(str)).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  notes: z.string().optional()
});

// 获取用户所有药物
router.get('/', async (req: AuthRequest, res) => {
  const { includeInactive } = req.query;
  
  const where: any = { 
    userId: req.user!.userId
  };
  
  // 默认只显示活跃的药物，除非明确请求包含停用的
  if (includeInactive !== 'true') {
    where.isActive = true;
  }
  
  const medications = await prisma.medication.findMany({
    where,
    orderBy: [
      { isActive: 'desc' }, // 活跃的排在前面
      { createdAt: 'desc' }
    ],
    include: {
      refillAlerts: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  // 解析JSON字段
  const medicationsData = medications.map(med => ({
    ...med,
    timings: JSON.parse(med.timings)
  }));
  
  res.json({
    success: true,
    data: medicationsData
  });
});

// 获取所有补充提醒
router.get('/alerts/refill', async (req: AuthRequest, res) => {
  const alerts = await prisma.refillAlert.findMany({
    where: {
      userId: req.user!.userId,
      status: 'pending'
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      medication: {
        select: {
          id: true,
          name: true,
          dosage: true,
          currentQuantity: true
        }
      }
    }
  });
  
  res.json({
    success: true,
    data: alerts
  });
});

// 获取单个药物详情
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const medication = await prisma.medication.findFirst({
    where: {
      id,
      userId: req.user!.userId
    },
    include: {
      refillAlerts: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });
  
  if (!medication) {
    throw new AppError('药物不存在', 404, 'MEDICATION_NOT_FOUND');
  }
  
  res.json({
    success: true,
    data: {
      ...medication,
      timings: JSON.parse(medication.timings)
    }
  });
});

// 添加新药物
router.post('/', async (req: AuthRequest, res) => {
  const data = medicationSchema.parse(req.body);
  
  const medication = await prisma.medication.create({
    data: {
      userId: req.user!.userId,
      name: data.name,
      genericName: data.genericName,
      brand: data.brand,
      dosage: data.dosage,
      form: data.form,
      prescribedDose: data.prescribedDose,
      frequency: data.frequency,
      timings: JSON.stringify(data.timings),
      currentQuantity: data.currentQuantity,
      refillThreshold: data.refillThreshold || 7,
      prescribedBy: data.prescribedBy,
      prescriptionDate: data.prescriptionDate,
      validUntil: data.validUntil,
      isActive: data.isActive !== undefined ? data.isActive : true,
      startDate: data.startDate || new Date(),
      endDate: data.endDate,
      notes: data.notes
    }
  });
  
  // 检查是否需要创建补充提醒
  await checkAndCreateRefillAlert(medication);
  
  res.status(201).json({
    success: true,
    data: {
      ...medication,
      timings: JSON.parse(medication.timings)
    },
    message: '药物添加成功'
  });
});

// 更新药物
router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = medicationSchema.parse(req.body);
  
  // 检查药物是否存在且属于当前用户
  const existing = await prisma.medication.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('药物不存在', 404, 'MEDICATION_NOT_FOUND');
  }
  
  const medication = await prisma.medication.update({
    where: { id },
    data: {
      name: data.name,
      genericName: data.genericName,
      brand: data.brand,
      dosage: data.dosage,
      form: data.form,
      prescribedDose: data.prescribedDose,
      frequency: data.frequency,
      timings: JSON.stringify(data.timings),
      currentQuantity: data.currentQuantity,
      refillThreshold: data.refillThreshold || existing.refillThreshold,
      prescribedBy: data.prescribedBy,
      prescriptionDate: data.prescriptionDate,
      validUntil: data.validUntil,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      startDate: data.startDate || existing.startDate,
      endDate: data.endDate,
      notes: data.notes
    }
  });
  
  // 检查是否需要更新补充提醒
  await checkAndCreateRefillAlert(medication);
  
  res.json({
    success: true,
    data: {
      ...medication,
      timings: JSON.parse(medication.timings)
    },
    message: '药物更新成功'
  });
});

// 更新库存（补充药物后）
router.patch('/:id/refill', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { quantity } = z.object({
    quantity: z.number().min(1, '补充数量必须大于0')
  }).parse(req.body);
  
  // 检查药物是否存在
  const existing = await prisma.medication.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('药物不存在', 404, 'MEDICATION_NOT_FOUND');
  }
  
  // 更新库存
  const medication = await prisma.medication.update({
    where: { id },
    data: {
      currentQuantity: existing.currentQuantity + quantity
    }
  });
  
  // 标记相关的提醒为已处理
  await prisma.refillAlert.updateMany({
    where: {
      medicationId: id,
      status: 'pending'
    },
    data: {
      status: 'acknowledged',
      acknowledgedAt: new Date()
    }
  });
  
  res.json({
    success: true,
    data: {
      ...medication,
      timings: JSON.parse(medication.timings)
    },
    message: `已补充 ${quantity} ${existing.dosage}`
  });
});

// 更新药物数量（增加或减少）
router.post('/:id/quantity', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { change } = z.object({
    change: z.number().refine(val => val !== 0, '变化量不能为0')
  }).parse(req.body);
  
  // 检查药物是否存在
  const existing = await prisma.medication.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('药物不存在', 404, 'MEDICATION_NOT_FOUND');
  }
  
  // 计算新数量
  const newQuantity = existing.currentQuantity + change;
  
  if (newQuantity < 0) {
    throw new AppError('库存不足', 400, 'INSUFFICIENT_STOCK');
  }
  
  // 更新库存
  const medication = await prisma.medication.update({
    where: { id },
    data: {
      currentQuantity: newQuantity
    }
  });
  
  // 检查是否需要创建补充提醒
  await checkAndCreateRefillAlert(medication);
  
  res.json({
    success: true,
    data: {
      ...medication,
      timings: JSON.parse(medication.timings)
    },
    message: change > 0 ? `已增加 ${change}` : `已使用 ${Math.abs(change)}`
  });
});

// 停用药物
router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const existing = await prisma.medication.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('药物不存在', 404, 'MEDICATION_NOT_FOUND');
  }
  
  // 软删除：标记为不活跃
  await prisma.medication.update({
    where: { id },
    data: {
      isActive: false,
      endDate: new Date()
    }
  });
  
  res.json({
    success: true,
    message: '药物已停用'
  });
});

// 重新启用药物
router.post('/:id/activate', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const existing = await prisma.medication.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!existing) {
    throw new AppError('药物不存在', 404, 'MEDICATION_NOT_FOUND');
  }
  
  // 重新启用：标记为活跃
  await prisma.medication.update({
    where: { id },
    data: {
      isActive: true,
      endDate: null
    }
  });
  
  res.json({
    success: true,
    message: '药物已启用'
  });
});

// 确认补充提醒
router.post('/alerts/refill/:id/acknowledge', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  // 检查警报是否存在
  const alert = await prisma.refillAlert.findFirst({
    where: {
      id,
      userId: req.user!.userId
    },
    include: {
      medication: {
        select: {
          name: true,
          dosage: true
        }
      }
    }
  });
  
  if (!alert) {
    throw new AppError('提醒不存在', 404, 'ALERT_NOT_FOUND');
  }
  
  // 更新警报状态
  const updatedAlert = await prisma.refillAlert.update({
    where: { id },
    data: {
      status: 'acknowledged',
      acknowledgedAt: new Date()
    },
    include: {
      medication: {
        select: {
          name: true,
          dosage: true
        }
      }
    }
  });
  
  res.json({
    success: true,
    data: updatedAlert,
    message: '提醒已确认'
  });
});

// 获取补充提醒
router.get('/:id/refill-alerts', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const alerts = await prisma.refillAlert.findMany({
    where: {
      medicationId: id,
      userId: req.user!.userId
    },
    orderBy: { createdAt: 'desc' },
    include: {
      medication: {
        select: {
          name: true,
          dosage: true
        }
      }
    }
  });
  
  res.json({
    success: true,
    data: alerts
  });
});

// 辅助函数：检查并创建补充提醒
async function checkAndCreateRefillAlert(medication: any) {
  // 计算每日用量
  const dailyUsage = calculateDailyUsage(medication);
  
  // 计算剩余天数
  const daysRemaining = Math.floor(medication.currentQuantity / dailyUsage);
  
  // 如果剩余天数低于阈值，创建提醒
  if (daysRemaining <= medication.refillThreshold) {
    // 检查是否已有未处理的提醒
    const existingAlert = await prisma.refillAlert.findFirst({
      where: {
        medicationId: medication.id,
        status: 'pending'
      }
    });
    
    if (!existingAlert) {
      const estimatedRunOutDate = new Date();
      estimatedRunOutDate.setDate(estimatedRunOutDate.getDate() + daysRemaining);
      
      await prisma.refillAlert.create({
        data: {
          userId: medication.userId,
          medicationId: medication.id,
          alertType: daysRemaining <= 0 ? 'out_of_stock' : 'low_stock',
          priority: daysRemaining <= 2 ? 'urgent' : daysRemaining <= 5 ? 'high' : 'medium',
          daysRemaining,
          estimatedRunOutDate
        }
      });
    }
  }
}

// 计算每日用量
function calculateDailyUsage(medication: any): number {
  const frequencyMap: Record<string, number> = {
    'once_daily': 1,
    'twice_daily': 2,
    'three_times_daily': 3,
    'as_needed': 1  // 按需时默认1次
  };
  
  const timesPerDay = frequencyMap[medication.frequency] || 1;
  return medication.prescribedDose * timesPerDay;
}

export default router;

