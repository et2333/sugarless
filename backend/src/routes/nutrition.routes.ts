import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import dayjs from 'dayjs';

const router = Router();
router.use(authenticate);

// 获取营养统计数据
router.get('/stats', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { period = '7' } = req.query; // 默认7天
  
  const days = parseInt(period as string);
  const startDate = dayjs().subtract(days, 'day').startOf('day').toDate();
  const endDate = dayjs().endOf('day').toDate();
  
  // 获取期间内的所有膳食计划
  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      userId,
      planDate: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      planDate: 'asc'
    }
  });
  
  // 计算每日营养摄入
  const dailyNutrition = mealPlans.map(plan => {
    const meals = JSON.parse(plan.meals as string);
    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalFiber = 0;
    
    // 遍历每一天的膳食
    if (Array.isArray(meals)) {
      meals.forEach((day: any) => {
        if (day.meals) {
          // 统计所有餐次的营养
          ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
            const meal = day.meals[mealType];
            if (meal) {
              if (Array.isArray(meal)) {
                // snacks是数组
                meal.forEach((item: any) => {
                  totalCalories += item.calories || 0;
                  totalCarbs += item.carbs || 0;
                  totalProtein += item.protein || 0;
                  totalFat += item.fat || 0;
                  totalFiber += item.fiber || 0;
                });
              } else if (meal.calories) {
                // 单个meal对象
                totalCalories += meal.calories || 0;
                totalCarbs += meal.carbs || 0;
                totalProtein += meal.protein || 0;
                totalFat += meal.fat || 0;
                totalFiber += meal.fiber || 0;
              }
            }
          });
        }
      });
    }
    
    return {
      date: dayjs(plan.planDate).format('YYYY-MM-DD'),
      calories: Math.round(totalCalories),
      carbs: Math.round(totalCarbs),
      protein: Math.round(totalProtein),
      fat: Math.round(totalFat),
      fiber: Math.round(totalFiber)
    };
  });
  
  // 计算总体统计
  const totalStats = dailyNutrition.reduce((acc, day) => ({
    calories: acc.calories + day.calories,
    carbs: acc.carbs + day.carbs,
    protein: acc.protein + day.protein,
    fat: acc.fat + day.fat,
    fiber: acc.fiber + day.fiber
  }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 });
  
  const daysCount = dailyNutrition.length || 1;
  const averageStats = {
    calories: Math.round(totalStats.calories / daysCount),
    carbs: Math.round(totalStats.carbs / daysCount),
    protein: Math.round(totalStats.protein / daysCount),
    fat: Math.round(totalStats.fat / daysCount),
    fiber: Math.round(totalStats.fiber / daysCount)
  };
  
  // 获取用户档案获取目标值
  const profile = await prisma.profile.findUnique({
    where: { userId }
  });
  
  // 默认营养目标（如果用户没有设置）
  const nutritionGoals = {
    calories: 2000,
    carbs: 250,
    protein: 75,
    fat: 65,
    fiber: 30
  };

  // 如果用户有自定义目标，使用用户的目标
  if (profile?.nutritionGoals) {
    const goals = JSON.parse(profile.nutritionGoals);
    if (goals.dailyCalories) nutritionGoals.calories = goals.dailyCalories;
    if (goals.carbohydrates?.max) nutritionGoals.carbs = goals.carbohydrates.max;
    if (goals.protein?.max) nutritionGoals.protein = goals.protein.max;
    if (goals.fat?.max) nutritionGoals.fat = goals.fat.max;
    if (goals.fiber) nutritionGoals.fiber = goals.fiber;
  }
  
  // 计算目标达成率
  const goalsAchievement = {
    calories: Math.min(Math.round((averageStats.calories / nutritionGoals.calories) * 100), 100),
    carbs: Math.min(Math.round((averageStats.carbs / nutritionGoals.carbs) * 100), 100),
    protein: Math.min(Math.round((averageStats.protein / nutritionGoals.protein) * 100), 100),
    fat: Math.min(Math.round((averageStats.fat / nutritionGoals.fat) * 100), 100),
    fiber: Math.min(Math.round((averageStats.fiber / nutritionGoals.fiber) * 100), 100)
  };
  
  res.json({
    success: true,
    data: {
      period: {
        days,
        startDate: dayjs(startDate).format('YYYY-MM-DD'),
        endDate: dayjs(endDate).format('YYYY-MM-DD')
      },
      dailyNutrition,
      averageStats,
      totalStats,
      nutritionGoals,
      goalsAchievement,
      mealPlansCount: mealPlans.length
    }
  });
});

// 获取营养分布
router.get('/distribution', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { period = '30' } = req.query;
  
  const days = parseInt(period as string);
  const startDate = dayjs().subtract(days, 'day').startOf('day').toDate();
  
  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      userId,
      planDate: {
        gte: startDate
      }
    }
  });
  
  // 按餐次统计
  const mealTypeStats = {
    breakfast: { calories: 0, count: 0 },
    lunch: { calories: 0, count: 0 },
    dinner: { calories: 0, count: 0 },
    snacks: { calories: 0, count: 0 }
  };
  
  mealPlans.forEach(plan => {
    const meals = JSON.parse(plan.meals as string);
    if (Array.isArray(meals)) {
      meals.forEach((day: any) => {
        if (day.meals) {
          Object.entries(day.meals).forEach(([mealType, meal]: [string, any]) => {
            if (meal && mealTypeStats[mealType as keyof typeof mealTypeStats]) {
              const stats = mealTypeStats[mealType as keyof typeof mealTypeStats];
              if (Array.isArray(meal)) {
                meal.forEach((item: any) => {
                  stats.calories += item.calories || 0;
                  stats.count++;
                });
              } else if (meal.calories) {
                stats.calories += meal.calories || 0;
                stats.count++;
              }
            }
          });
        }
      });
    }
  });
  
  const distribution = Object.entries(mealTypeStats).map(([type, stats]) => ({
    type,
    calories: Math.round(stats.calories),
    average: stats.count > 0 ? Math.round(stats.calories / stats.count) : 0,
    percentage: 0 // 将在下面计算
  }));
  
  const totalCalories = distribution.reduce((sum, item) => sum + item.calories, 0);
  distribution.forEach(item => {
    item.percentage = totalCalories > 0 ? Math.round((item.calories / totalCalories) * 100) : 0;
  });
  
  res.json({
    success: true,
    data: {
      distribution,
      totalCalories: Math.round(totalCalories)
    }
  });
});

export default router;

