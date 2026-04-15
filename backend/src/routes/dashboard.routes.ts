import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取Dashboard统计数据
router.get('/stats', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  
  // 获取用户档案
  const profile = await prisma.profile.findUnique({
    where: { userId }
  });
  
  // 获取膳食计划数量
  const mealPlansCount = await prisma.mealPlan.count({
    where: { userId }
  });
  
  // 获取最近的膳食计划
  const latestMealPlan = await prisma.mealPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  // 计算健康状态
  let healthStatus = '待评估';
  let healthColor = '#999';
  
  if (profile?.hba1c) {
    if (profile.hba1c < 5.7) {
      healthStatus = '正常';
      healthColor = '#52c41a';
    } else if (profile.hba1c < 6.5) {
      healthStatus = '注意';
      healthColor = '#faad14';
    } else {
      healthStatus = '需控制';
      healthColor = '#ff4d4f';
    }
  }
  
  res.json({
    success: true,
    data: {
      hasProfile: !!profile,
      profile: profile ? {
        firstName: profile.firstName,
        lastName: profile.lastName,
        diabetesType: profile.diabetesType,
        hba1c: profile.hba1c,
        fastingGlucose: profile.fastingGlucose,
        activityLevel: profile.activityLevel
      } : null,
      mealPlans: {
        count: mealPlansCount,
        latest: latestMealPlan ? {
          id: latestMealPlan.id,
          createdAt: latestMealPlan.createdAt,
          duration: latestMealPlan.duration
        } : null
      },
      health: {
        status: healthStatus,
        color: healthColor
      }
    }
  });
});

export default router;

