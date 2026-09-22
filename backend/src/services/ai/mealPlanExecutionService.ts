import prisma from '../../utils/prisma';
import { GeminiService } from './geminiService';

export class MealPlanExecutionService {
  static async generateAndSave(userId: string, days: number, preferences = '') {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const caloriesTarget = 2000;
    const profilePreferences = profile?.dietaryPrefs ? JSON.parse(profile.dietaryPrefs) : [];
    const profileData = {
      age: profile?.dateOfBirth ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear() : null,
      gender: profile?.gender,
      diabetesType: profile?.diabetesType,
      hba1c: profile?.hba1c,
      fastingGlucose: profile?.fastingGlucose,
      allergies: profile?.allergies ? JSON.parse(profile.allergies) : [],
      dietaryPrefs: [...profilePreferences, ...(preferences ? [preferences] : [])],
      activityLevel: profile?.activityLevel,
      caloriesTarget,
      duration: days,
    };

    const generated = await GeminiService.generateMealPlan(profileData);
    const sourceDays = generated.plan || [];
    const normalizedPlan = {
      ...generated,
      plan: Array.from({ length: days }, (_, index) => {
        const source = sourceDays[index % Math.max(1, sourceDays.length)];
        return source ? { ...source, day: `Day ${index + 1}` } : source;
      }).filter(Boolean),
    };
    const targetCarbs = 45;
    const proteinGrams = Math.round((caloriesTarget * 0.175) / 4);
    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId,
        planDate: new Date(),
        duration: days,
        meals: JSON.stringify({ aiGenerated: true, ...normalizedPlan, generatedAt: new Date().toISOString() }),
        caloriesTarget,
        carbsMin: Math.round(targetCarbs * 0.8),
        carbsMax: Math.round(targetCarbs * 1.2),
        proteinMin: Math.round(proteinGrams * 0.8),
        proteinMax: Math.round(proteinGrams * 1.2),
      },
    });
    return { mealPlan, plan: normalizedPlan };
  }
}
