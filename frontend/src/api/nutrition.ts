import apiClient from './client';

export interface DailyNutrition {
  date: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}

export interface NutritionStats {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  dailyNutrition: DailyNutrition[];
  averageStats: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  totalStats: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  nutritionGoals: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  goalsAchievement: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  mealPlansCount: number;
}

export interface MealDistribution {
  type: string;
  calories: number;
  average: number;
  percentage: number;
}

export interface DistributionData {
  distribution: MealDistribution[];
  totalCalories: number;
}

export const nutritionAPI = {
  // 获取营养统计数据
  async getStats(period: number = 7): Promise<NutritionStats> {
    const response = await apiClient.get('/nutrition/stats', {
      params: { period }
    });
    return response.data;
  },

  // 获取营养分布
  async getDistribution(period: number = 30): Promise<DistributionData> {
    const response = await apiClient.get('/nutrition/distribution', {
      params: { period }
    });
    return response.data;
  },
};

