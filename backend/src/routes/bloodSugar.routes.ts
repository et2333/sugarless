/**
 * Blood Sugar Routes
 * From Report: UC-A1.1 Update Profile - Blood sugar tracking
 */

import { Router } from 'express';
import { z } from 'zod';
import { BloodSugarService } from '../services/bloodSugarService';
import { GeminiService } from '../services/ai/geminiService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 血糖记录验证schema
const bloodSugarRecordSchema = z.object({
  value: z.number().min(20).max(600, '血糖值超出正常范围'),
  unit: z.enum(['mg/dL', 'mmol/L']).default('mg/dL'),
  type: z.enum(['fasting', 'post_prandial', 'random', 'hba1c']),
  measurementTime: z.string().transform(str => new Date(str)),
  mealContext: z.object({
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
    timeFromMeal: z.number().optional(),
    mealSize: z.enum(['small', 'medium', 'large']).optional(),
    mealCarbs: z.number().optional(),
  }).optional(),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  device: z.object({
    type: z.enum(['glucometer', 'cgm', 'manual']),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
  }).optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * POST /api/blood-sugar/record
 * 记录新的血糖读数
 */
router.post('/record', async (req: AuthRequest, res) => {
  try {
    const data = bloodSugarRecordSchema.parse(req.body);
    
    const record = await BloodSugarService.recordReading({
      userId: req.user!.userId,
      ...data,
    });

    res.status(201).json({
      success: true,
      data: record,
      message: '血糖记录保存成功',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('血糖记录验证失败:', error.errors);
      console.error('请求数据:', req.body);
      throw new AppError(`输入验证失败: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    throw error;
  }
});

/**
 * GET /api/blood-sugar/trends
 * 获取血糖趋势数据
 */
router.get('/trends', async (req: AuthRequest, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    
    const trends = await BloodSugarService.getTrends(
      req.user!.userId,
      period as any,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: trends,
    });
  } catch (error: any) {
    throw new AppError('获取血糖趋势失败', 500, 'TRENDS_ERROR');
  }
});

/**
 * GET /api/blood-sugar/insights
 * 获取血糖洞察和建议（集成Gemini AI）
 */
router.get('/insights', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { limit = 30 } = req.query; // 增加默认数量以获取更多数据用于AI分析
    
    // 获取最近30条血糖记录用于AI分析
    const glucoseRecords = await prisma.bloodSugarRecord.findMany({
      where: { userId },
      orderBy: { measurementTime: 'desc' },
      take: parseInt(limit as string) || 30,
      select: {
        id: true,
        value: true,
        measurementTime: true,
        type: true,
        notes: true,
      },
    });

    // 如果数据不足，返回传统洞察
    if (glucoseRecords.length < 3) {
      const insights = await BloodSugarService.getInsights(userId, 10);
      return res.json({
        success: true,
        data: insights,
        aiAnalysis: null,
        message: '数据量不足，显示传统分析结果',
      });
    }

    // 准备数据给Gemini AI分析
    const glucoseData = glucoseRecords.map(record => ({
      value: record.value,
      time: record.measurementTime.toISOString(),
      type: record.type,
      notes: record.notes,
    }));

    // 使用Gemini AI分析
    const aiAnalysis = await GeminiService.analyzeGlucose(glucoseData);

    // 同时获取传统洞察作为备用
    const traditionalInsights = await BloodSugarService.getInsights(userId, 10);

    res.json({
      success: true,
      data: {
        aiAnalysis,
        traditionalInsights,
        recordCount: glucoseRecords.length,
        lastUpdated: new Date().toISOString(),
      },
      message: 'AI分析完成',
    });
  } catch (error: any) {
    console.error('血糖洞察分析失败:', error);
    
    // 如果AI分析失败，回退到传统方法
    try {
      const insights = await BloodSugarService.getInsights(req.user!.userId, 10);
      return res.json({
        success: true,
        data: {
          aiAnalysis: null,
          traditionalInsights: insights,
        },
        message: 'AI服务暂时不可用，显示传统分析结果',
      });
    } catch (fallbackError: any) {
      throw new AppError('获取血糖洞察失败', 500, 'INSIGHTS_ERROR');
    }
  }
});

/**
 * GET /api/blood-sugar/alerts
 * 获取血糖警报
 */
router.get('/alerts', async (req: AuthRequest, res) => {
  try {
    const { activeOnly = 'true' } = req.query;
    
    const alerts = await BloodSugarService.getAlerts(
      req.user!.userId,
      activeOnly === 'true'
    );

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error: any) {
    throw new AppError('获取血糖警报失败', 500, 'ALERTS_ERROR');
  }
});

/**
 * PUT /api/blood-sugar/alerts/:alertId/acknowledge
 * 确认血糖警报
 */
router.put('/alerts/:alertId/acknowledge', async (req: AuthRequest, res) => {
  try {
    const { alertId } = req.params;
    
    const updated = await prisma.bloodSugarAlert.updateMany({
      where: {
        id: alertId,
        userId: req.user!.userId,
      },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new AppError('警报未找到', 404, 'ALERT_NOT_FOUND');
    }

    res.json({
      success: true,
      message: '警报已确认',
    });
  } catch (error: any) {
    throw new AppError('确认警报失败', 500, 'ACKNOWLEDGE_ERROR');
  }
});

/**
 * GET /api/blood-sugar/records
 * 获取血糖记录列表
 */
router.get('/records', async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    
    const where: any = {
      userId: req.user!.userId,
    };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.measurementTime = {};
      if (startDate) where.measurementTime.gte = new Date(startDate as string);
      if (endDate) where.measurementTime.lte = new Date(endDate as string);
    }

    const [records, total] = await Promise.all([
      prisma.bloodSugarRecord.findMany({
        where,
        orderBy: { measurementTime: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.bloodSugarRecord.count({ where }),
    ]);

    const mappedRecords = records.map(record => ({
      id: record.id,
      value: record.value,
      unit: record.unit,
      type: record.type,
      measurementTime: record.measurementTime,
      mealContext: record.mealContext ? JSON.parse(record.mealContext) : null,
      symptoms: record.symptoms ? JSON.parse(record.symptoms) : null,
      notes: record.notes,
      device: record.device ? JSON.parse(record.device) : null,
      location: record.location,
      tags: record.tags ? JSON.parse(record.tags) : null,
      createdAt: record.createdAt,
    }));

    res.json({
      success: true,
      data: {
        records: mappedRecords,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    throw new AppError('获取血糖记录失败', 500, 'RECORDS_ERROR');
  }
});

/**
 * DELETE /api/blood-sugar/records/:recordId
 * 删除血糖记录
 */
router.delete('/records/:recordId', async (req: AuthRequest, res) => {
  try {
    const { recordId } = req.params;
    
    const deleted = await prisma.bloodSugarRecord.deleteMany({
      where: {
        id: recordId,
        userId: req.user!.userId,
      },
    });

    if (deleted.count === 0) {
      throw new AppError('记录未找到', 404, 'RECORD_NOT_FOUND');
    }

    res.json({
      success: true,
      message: '血糖记录已删除',
    });
  } catch (error: any) {
    throw new AppError('删除血糖记录失败', 500, 'DELETE_ERROR');
  }
});

export default router;
