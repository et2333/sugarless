import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GeminiService } from '../services/ai/geminiService';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 生成膳食计划验证schema
const generateSchema = z.object({
  duration: z.number().min(1).max(30),
  caloriesTarget: z.number().min(1000).max(4000).optional(),
  carbsTarget: z.number().min(15).max(75).optional(),
  diabetesType: z.string().optional(),
  glucoseControl: z.string().optional()
});

// 简单的膳食生成逻辑（MVP版本）
const generateSimpleMealPlan = async (
  userId: string,
  duration: number,
  caloriesTarget: number
) => {
  // 获取用户档案
  const profile = await prisma.profile.findUnique({
    where: { userId }
  });
  
  // 根据用户活动水平计算营养目标
  const activityMultiplierMap: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  const activityMultiplier = activityMultiplierMap[profile?.activityLevel || 'moderate'] || 1.55;
  
  const targetCalories = caloriesTarget || Math.round(2000 * activityMultiplier);
  
  // 营养宏量目标（糖尿病患者推荐比例）
  const carbsMin = Math.round(targetCalories * 0.40 / 4); // 40%碳水
  const carbsMax = Math.round(targetCalories * 0.45 / 4);
  const proteinMin = Math.round(targetCalories * 0.20 / 4); // 20%蛋白质
  const proteinMax = Math.round(targetCalories * 0.25 / 4);
  
  // 获取可用食谱
  const breakfastRecipes = await prisma.recipe.findMany({
    where: { category: 'breakfast' },
    take: duration
  });
  
  const lunchRecipes = await prisma.recipe.findMany({
    where: { category: 'lunch' },
    take: duration
  });
  
  const dinnerRecipes = await prisma.recipe.findMany({
    where: { category: 'dinner' },
    take: duration
  });
  
  // 生成每日膳食计划
  const meals: any = {};
  for (let i = 0; i < duration; i++) {
    const dayKey = `day${i + 1}`;
    meals[dayKey] = {
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      breakfast: breakfastRecipes[i % breakfastRecipes.length] || null,
      lunch: lunchRecipes[i % lunchRecipes.length] || null,
      dinner: dinnerRecipes[i % dinnerRecipes.length] || null,
      totalCalories: 0,
      totalCarbs: 0,
      totalProtein: 0
    };
    
    // 计算当天总营养
    ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
      const recipe = meals[dayKey][mealType];
      if (recipe) {
        meals[dayKey].totalCalories += recipe.calories;
        meals[dayKey].totalCarbs += recipe.carbs;
        meals[dayKey].totalProtein += recipe.protein;
      }
    });
  }
  
  return {
    meals: JSON.stringify(meals),
    caloriesTarget: targetCalories,
    carbsMin,
    carbsMax,
    proteinMin,
    proteinMax
  };
};

// 生成膳食计划（集成Gemini AI）
router.post('/generate', async (req: AuthRequest, res) => {
  try {
    const { duration, caloriesTarget, carbsTarget, diabetesType, glucoseControl } = generateSchema.parse(req.body);
    const userId = req.user!.userId;
    
    // 检查用户是否有档案
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });
    
    if (!profile) {
      throw new AppError('Please complete your personal profile first', 400, 'PROFILE_REQUIRED');
    }

    // 准备用户档案信息给AI
    const profileData = {
      age: profile.dateOfBirth ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear() : null,
      gender: profile.gender,
      diabetesType: profile.diabetesType,
      hba1c: profile.hba1c,
      fastingGlucose: profile.fastingGlucose,
      allergies: profile.allergies ? JSON.parse(profile.allergies) : [],
      dietaryPrefs: profile.dietaryPrefs ? JSON.parse(profile.dietaryPrefs) : [],
      activityLevel: profile.activityLevel,
      caloriesTarget: caloriesTarget || 2000,
      duration
    };

    let mealPlanResult;
    let aiSuccess = false;

    try {
      // 使用Gemini AI生成膳食计划
      mealPlanResult = await GeminiService.generateMealPlan(profileData);
      aiSuccess = true;
    } catch (aiError) {
      console.error('Gemini AI膳食计划生成失败，使用传统方法:', aiError);
      
      // 回退到传统方法
      const mealPlanData = await generateSimpleMealPlan(
        userId,
        duration,
        caloriesTarget || 2000
      );
      
      // 转换为AI返回格式
      mealPlanResult = {
        plan: [
          {
            day: "AI Generated Plan (Fallback Data)",
            breakfast: {
              name: "Healthy Breakfast",
              ingredients: ["Whole Wheat Bread", "Eggs", "Vegetables"],
              calories: 350,
              carbohydrates: 45
            },
            lunch: {
              name: "Nutritious Lunch", 
              ingredients: ["Lean Meat", "Vegetables", "Brown Rice"],
              calories: 500,
              carbohydrates: 55
            },
            dinner: {
              name: "Light Dinner",
              ingredients: ["Fish", "Vegetables", "Sweet Potato"],
              calories: 400,
              carbohydrates: 40
            }
          }
        ],
        summary: "Traditional method generated meal plan",
        tips: ["Maintain balanced diet", "Regular meals", "More vegetables, less oil and salt"]
      };
    }

    // 将AI生成的计划保存到数据库
    const planJson = JSON.stringify({
      aiGenerated: aiSuccess,
      ...mealPlanResult,
      generatedAt: new Date().toISOString()
    });

    // 计算碳水化合物目标范围
    const targetCarbs = carbsTarget || 45; // 默认每餐45g碳水
    const carbsMin = Math.round(targetCarbs * 0.8); // 最低80%
    const carbsMax = Math.round(targetCarbs * 1.2); // 最高120%
    
    // 计算蛋白质目标 (基于热量目标的15-20%)
    const targetCalories = caloriesTarget || 2000;
    const proteinCalories = targetCalories * 0.175; // 17.5%的热量来自蛋白质
    const proteinGrams = Math.round(proteinCalories / 4); // 1g蛋白质=4卡路里
    const proteinMin = Math.round(proteinGrams * 0.8);
    const proteinMax = Math.round(proteinGrams * 1.2);

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId,
        planDate: new Date(),
        duration,
        meals: planJson,
        caloriesTarget: targetCalories,
        carbsMin,
        carbsMax,
        proteinMin,
        proteinMax
      }
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: mealPlan.id,
        userId: mealPlan.userId,
        duration: mealPlan.duration,
        planDate: mealPlan.planDate,
        caloriesTarget: mealPlan.caloriesTarget,
        aiGenerated: aiSuccess,
        plan: mealPlanResult,
        lastUpdated: new Date().toISOString()
      },
      message: aiSuccess ? 'AI膳食计划生成成功' : '膳食计划生成成功（使用传统方法）'
    });
  } catch (error: any) {
    console.error('膳食计划生成失败:', error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError('膳食计划生成失败', 500, 'MEAL_PLAN_GENERATION_FAILED');
  }
});

// 获取我的膳食计划列表
router.get('/', async (req: AuthRequest, res) => {
  const { limit = '10', offset = '0' } = req.query;
  
  const [mealPlans, total] = await Promise.all([
    prisma.mealPlan.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    }),
    prisma.mealPlan.count({
      where: { userId: req.user!.userId }
    })
  ]);
  
  res.json({
    success: true,
    data: mealPlans.map(plan => {
      const mealsData = JSON.parse(plan.meals);
      return {
        ...plan,
        meals: mealsData,
        isAiGenerated: mealsData.aiGenerated || false // 保持AI生成标识
      };
    }),
    metadata: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    }
  });
});

// 获取膳食计划详情
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!mealPlan) {
    throw new AppError('膳食计划不存在', 404, 'MEAL_PLAN_NOT_FOUND');
  }
  
  const mealsData = JSON.parse(mealPlan.meals);
  res.json({
    success: true,
    data: {
      ...mealPlan,
      meals: mealsData,
      isAiGenerated: mealsData.aiGenerated || false // 保持AI生成标识
    }
  });
});

// 删除膳食计划
router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  // 检查计划是否存在且属于当前用户
  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      id,
      userId: req.user!.userId
    }
  });
  
  if (!mealPlan) {
    throw new AppError('膳食计划不存在', 404, 'MEAL_PLAN_NOT_FOUND');
  }
  
  // 删除计划
  await prisma.mealPlan.delete({
    where: { id }
  });
  
  res.json({
    success: true,
    message: '膳食计划已删除'
  });
});

export default router;

