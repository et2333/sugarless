import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 创建/更新档案验证schema
const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().transform(str => new Date(str)),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().optional(),
  diabetesType: z.enum(['type_1', 'type_2', 'gestational']).optional(), // 改为optional
  diagnosisDate: z.string().transform(str => new Date(str)).optional(), // 改为optional
  hba1c: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
  fastingGlucose: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
  allergies: z.array(z.string()).optional(),
  dietaryPrefs: z.array(z.string()).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active']).optional(),
  avatarId: z.string().optional()
});

// 部分更新档案验证schema（用于头像更新等）
const partialProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().transform(str => new Date(str)).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  diabetesType: z.enum(['type_1', 'type_2', 'gestational']).optional(),
  diagnosisDate: z.string().transform(str => new Date(str)).optional(),
  hba1c: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
  fastingGlucose: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
  allergies: z.array(z.string()).optional(),
  dietaryPrefs: z.array(z.string()).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active']).optional(),
  avatarId: z.string().optional()
});

// 获取我的档案
router.get('/me', async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.user!.userId }
  });
  
  if (!profile) {
    return res.json({
      success: true,
      data: null,
      message: '档案不存在，请创建档案'
    });
  }
  
  // 解析JSON字段
  const profileData = {
    ...profile,
    allergies: JSON.parse(profile.allergies),
    dietaryPrefs: JSON.parse(profile.dietaryPrefs)
  };
  
  res.json({
    success: true,
    data: profileData
  });
});

// 创建档案
router.post('/me', async (req: AuthRequest, res) => {
  const data = profileSchema.parse(req.body);
  
  // 首先验证用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId }
  });
  
  if (!user) {
    throw new AppError('用户账户不存在，请重新登录', 401, 'USER_NOT_FOUND');
  }
  
  // 检查是否已有档案
  const existing = await prisma.profile.findUnique({
    where: { userId: req.user!.userId }
  });
  
  if (existing) {
    throw new AppError('档案已存在，请使用PUT更新', 400, 'PROFILE_EXISTS');
  }
  
  // 创建档案
  const profile = await prisma.profile.create({
    data: {
      userId: req.user!.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      phone: data.phone,
      diabetesType: data.diabetesType || null,
      diagnosisDate: data.diagnosisDate || null,
      hba1c: data.hba1c,
      fastingGlucose: data.fastingGlucose,
      allergies: JSON.stringify(data.allergies || []),
      dietaryPrefs: JSON.stringify(data.dietaryPrefs || []),
      activityLevel: data.activityLevel || 'moderate',
      avatarId: data.avatarId || 'avatar1'
    }
  });
  
  res.status(201).json({
    success: true,
    data: {
      ...profile,
      allergies: JSON.parse(profile.allergies),
      dietaryPrefs: JSON.parse(profile.dietaryPrefs)
    }
  });
});

// 更新档案
router.put('/me', async (req: AuthRequest, res) => {
  const data = partialProfileSchema.parse(req.body);
  
  // 检查档案是否存在
  const existing = await prisma.profile.findUnique({
    where: { userId: req.user!.userId }
  });
  
  if (!existing) {
    throw new AppError('档案不存在，请先创建', 404, 'PROFILE_NOT_FOUND');
  }
  
  // 构建更新数据，只包含提供的字段
  const updateData: any = {
    version: existing.version + 1
  };
  
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.diabetesType !== undefined) updateData.diabetesType = data.diabetesType;
  if (data.diagnosisDate !== undefined) updateData.diagnosisDate = data.diagnosisDate;
  if (data.hba1c !== undefined) updateData.hba1c = data.hba1c;
  if (data.fastingGlucose !== undefined) updateData.fastingGlucose = data.fastingGlucose;
  if (data.allergies !== undefined) updateData.allergies = JSON.stringify(data.allergies);
  if (data.dietaryPrefs !== undefined) updateData.dietaryPrefs = JSON.stringify(data.dietaryPrefs);
  if (data.activityLevel !== undefined) updateData.activityLevel = data.activityLevel;
  if (data.avatarId !== undefined) updateData.avatarId = data.avatarId;
  
  // 更新档案
  const profile = await prisma.profile.update({
    where: { userId: req.user!.userId },
    data: updateData
  });
  
  res.json({
    success: true,
    data: {
      ...profile,
      allergies: JSON.parse(profile.allergies),
      dietaryPrefs: JSON.parse(profile.dietaryPrefs)
    }
  });
});

export default router;

