/**
 * Personalized Supplement Recommendation Service
 * AI-powered personalized supplement recommendations based on user health profile
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { GeminiService } from './ai/geminiService';
import { getSupplementByName, CompleteSupplementData } from '../data/completeSupplementData';

const prisma = new PrismaClient();

interface UserHealthProfile {
  diabetesType: string;
  hba1c?: number;
  medications: string[];
  allergies: string[];
  age: number;
  recentBloodSugar?: number[];
  complications: string[];
  dietaryRestrictions: string[];
  fastingGlucose?: number;
}

interface AIRecommendation {
  name: string;
  type: string;
  dosage: string;
  benefits: string[];
  priority: 'high' | 'medium' | 'low';
  reason: string;
  warnings: string;
}

interface AIAnalysisResult {
  recommendations: AIRecommendation[];
  generalAdvice: string;
}

interface PersonalizedProduct {
  id: string;
  name: string;
  category: string;
  targetConditions: string[];
  diabetesInfo: {
    suitability: 'high' | 'medium' | 'low';
    bloodSugarImpact: 'none' | 'minimal' | 'moderate';
    benefits: string[];
    contraindications?: string[];
    interactions?: string[];
  };
  dosage: string;
  price: number;
  averagePrice?: number;
  inStock: boolean;
  manufacturer?: string;
  brand?: string;
  vendor?: string;
  imageUrl?: string;
  description?: string;
  relevanceScore: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  warnings: string;
}

/**
 * Get comprehensive user health profile
 */
async function getUserHealthProfile(userId: string): Promise<UserHealthProfile> {
  // Get user profile
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError('User profile not found. Please complete your profile first.', 404, 'PROFILE_NOT_FOUND');
  }

  // Get medications
  const medications = await prisma.medication.findMany({
    where: { userId, isActive: true },
    select: { name: true },
  });

  // Get recent blood sugar records (last 10)
  const bloodSugarRecords = await prisma.bloodSugarRecord.findMany({
    where: { userId },
    orderBy: { measurementTime: 'desc' },
    take: 10,
    select: { value: true },
  });

  // Parse allergies and dietary preferences
  const allergies = profile.allergies 
    ? (typeof profile.allergies === 'string' ? JSON.parse(profile.allergies) : profile.allergies)
    : [];
  const dietaryRestrictions = profile.dietaryPrefs
    ? (typeof profile.dietaryPrefs === 'string' ? JSON.parse(profile.dietaryPrefs) : profile.dietaryPrefs)
    : [];

  // Calculate age
  const age = profile.dateOfBirth 
    ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear()
    : 45; // Default age

  return {
    diabetesType: profile.diabetesType || 'Type 2',
    hba1c: profile.hba1c || undefined,
    medications: medications.map(m => m.name),
    allergies: Array.isArray(allergies) ? allergies : [],
    age,
    recentBloodSugar: bloodSugarRecords.map(r => r.value),
    complications: [], // Can be extended later
    dietaryRestrictions: Array.isArray(dietaryRestrictions) ? dietaryRestrictions : [],
    fastingGlucose: profile.fastingGlucose || undefined,
  };
}

/**
 * Call Gemini AI to analyze user profile and generate recommendations
 */
async function analyzeWithAI(
  userProfile: UserHealthProfile,
  category: string
): Promise<AIAnalysisResult> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY || 'REMOVED_GEMINI_API_KEY';
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const modelNames = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let model;
    
    for (const modelName of modelNames) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!model) {
      throw new Error('No Gemini model available');
    }

    const prompt = `You are a professional diabetes healthcare assistant. Based on the following diabetic patient profile, recommend suitable nutritional supplements.

Patient Information:
- Diabetes Type: ${userProfile.diabetesType}
- HbA1c: ${userProfile.hba1c || 'Not measured'}
- Current Medications: ${userProfile.medications.join(', ') || 'None'}
- Age: ${userProfile.age}
- Recent Blood Sugar Readings: ${userProfile.recentBloodSugar?.join(', ') || 'Not available'}
- Complications: ${userProfile.complications.join(', ') || 'None'}
- Allergies: ${userProfile.allergies.join(', ') || 'None'}
- Dietary Restrictions: ${userProfile.dietaryRestrictions.join(', ') || 'None'}
- Recommended Category: ${category} (Blood Sugar Control / Boost Energy / Weight Management)

Please recommend 5-8 supplements, return JSON format ONLY (no markdown, no explanations):
{
  "recommendations": [
    {
      "name": "Product name (e.g., Alpha Lipoic Acid)",
      "type": "Supplement type (e.g., Antioxidant, Vitamin, Mineral)",
      "dosage": "Recommended dosage (e.g., 600mg daily)",
      "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
      "priority": "high|medium|low",
      "reason": "Personalized reason why this is recommended for this specific patient",
      "warnings": "Important warnings or precautions for this patient"
    }
  ],
  "generalAdvice": "Overall personalized advice for this patient"
}

Requirements:
- All text must be in English
- Be specific about why each supplement is recommended for THIS patient
- Consider medication interactions
- Consider blood sugar impact
- Focus on diabetes-specific benefits
- Return valid JSON only`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanText);
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return getFallbackRecommendations(userProfile, category);
    }
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return getFallbackRecommendations(userProfile, category);
  }
}

/**
 * Fallback recommendations when AI fails
 */
function getFallbackRecommendations(
  userProfile: UserHealthProfile,
  category: string
): AIAnalysisResult {
  const recommendations: AIRecommendation[] = [];

  if (category === 'Blood Sugar Control' || category === 'blood_sugar') {
    recommendations.push(
      {
        name: 'Alpha Lipoic Acid',
        type: 'Antioxidant',
        dosage: '600mg daily',
        benefits: ['Improve insulin sensitivity', 'Reduce nerve pain', 'Lower blood sugar levels'],
        priority: userProfile.hba1c && userProfile.hba1c > 7 ? 'high' : 'medium',
        reason: `Your HbA1c is ${userProfile.hba1c || 'elevated'}. Alpha Lipoic Acid helps improve insulin sensitivity and may lower blood sugar levels.`,
        warnings: 'May interact with diabetes medications. Monitor blood sugar closely.',
      },
      {
        name: 'Chromium Picolinate',
        type: 'Mineral',
        dosage: '200mcg daily',
        benefits: ['Enhance insulin sensitivity', 'Regulate blood sugar', 'Support glucose metabolism'],
        priority: 'medium',
        reason: 'Chromium helps improve how your body uses insulin, which is important for Type 2 diabetes management.',
        warnings: 'May cause stomach upset in some people.',
      },
      {
        name: 'Cinnamon Extract',
        type: 'Herbal Supplement',
        dosage: '1000mg daily',
        benefits: ['Lower fasting blood sugar', 'Improve insulin sensitivity', 'Antioxidant support'],
        priority: 'medium',
        reason: 'Cinnamon has been shown to help lower fasting blood glucose levels in people with diabetes.',
        warnings: 'Avoid if taking blood-thinning medications.',
      }
    );
  } else if (category === 'Boost Energy' || category === 'energy') {
    recommendations.push(
      {
        name: 'Vitamin B12',
        type: 'Vitamin',
        dosage: '1000mcg daily',
        benefits: ['Boost energy', 'Support nerve health', 'Improve metabolism'],
        priority: 'high',
        reason: 'People with diabetes, especially those on Metformin, may have low B12 levels which can cause fatigue.',
        warnings: 'Generally safe, but consult doctor if you have any concerns.',
      },
      {
        name: 'CoQ10',
        type: 'Antioxidant',
        dosage: '100mg daily',
        benefits: ['Cell energy production', 'Heart health', 'Antioxidant support'],
        priority: 'medium',
        reason: 'CoQ10 helps produce energy at the cellular level and may be beneficial for diabetes patients.',
        warnings: 'May interact with blood-thinning medications.',
      },
      {
        name: 'Magnesium',
        type: 'Mineral',
        dosage: '400mg daily',
        benefits: ['Energy metabolism', 'Blood sugar control', 'Muscle function'],
        priority: 'high',
        reason: 'Magnesium deficiency is common in diabetes and can contribute to fatigue and poor blood sugar control.',
        warnings: 'May cause diarrhea in high doses. Start with lower dose.',
      }
    );
  } else if (category === 'Weight Management' || category === 'weight') {
    recommendations.push(
      {
        name: 'Green Tea Extract',
        type: 'Herbal Supplement',
        dosage: '500mg daily',
        benefits: ['Boost metabolism', 'Support weight loss', 'Antioxidant support'],
        priority: 'medium',
        reason: 'Green tea extract may help boost metabolism and support healthy weight management in diabetes patients.',
        warnings: 'Contains caffeine. Avoid if sensitive to caffeine.',
      },
      {
        name: 'Fiber Supplement',
        type: 'Fiber',
        dosage: 'As directed on package',
        benefits: ['Increase satiety', 'Improve blood sugar control', 'Support digestion'],
        priority: 'high',
        reason: 'Fiber helps you feel full longer, stabilizes blood sugar, and supports healthy digestion.',
        warnings: 'Increase fiber intake gradually to avoid digestive discomfort.',
      },
      {
        name: 'Probiotics',
        type: 'Probiotic',
        dosage: '50 billion CFU daily',
        benefits: ['Improve digestion', 'Support gut health', 'May help with weight management'],
        priority: 'medium',
        reason: 'A healthy gut microbiome may support better blood sugar control and weight management.',
        warnings: 'Start with lower dose if you have a sensitive stomach.',
      }
    );
  }

  return {
    recommendations: recommendations.slice(0, 5),
    generalAdvice: `Based on your ${userProfile.diabetesType} diabetes profile, we recommend focusing on ${category}. Always consult your doctor before starting any new supplements, especially if you are taking medications.`,
  };
}

/**
 * Match products from database based on AI recommendations
 */
async function matchProductsFromDB(
  aiRecommendations: AIAnalysisResult,
  userProfile: UserHealthProfile
): Promise<PersonalizedProduct[]> {
  const products: PersonalizedProduct[] = [];

  for (const aiRec of aiRecommendations.recommendations) {
    // First, try to find complete data from our complete database
    const completeData = getSupplementByName(aiRec.name);
    
    if (completeData) {
      // Use complete data if available
      const score = calculateRecommendationScore(
        {
          type: completeData.category,
          category: completeData.category,
          targetConditions: completeData.diabetesInfo.targetConditions,
          diabetesInfo: completeData.diabetesInfo,
        },
        userProfile
      );

      products.push({
        id: completeData.id,
        name: completeData.name,
        category: completeData.category,
        targetConditions: completeData.diabetesInfo.targetConditions,
        diabetesInfo: completeData.diabetesInfo,
        dosage: aiRec.dosage || completeData.basicInfo.dosage,
        price: completeData.basicInfo.price,
        averagePrice: completeData.basicInfo.price,
        inStock: true,
        manufacturer: completeData.basicInfo.manufacturer,
        brand: completeData.basicInfo.brand,
        imageUrl: undefined,
        description: completeData.basicInfo.description,
        relevanceScore: score,
        priority: aiRec.priority,
        reason: aiRec.reason,
        warnings: aiRec.warnings,
      });
      continue;
    }

    // Search for matching supplements in database
    const supplements = await prisma.supplement.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: aiRec.name } },
          { nameEn: { contains: aiRec.name } },
          { category: { contains: aiRec.type } },
        ],
      },
      take: 3,
    });

    // Also search in products table
    const productsFromDB = await prisma.product.findMany({
      where: {
        inStock: true,
        OR: [
          { name: { contains: aiRec.name } },
          { category: { contains: aiRec.type } },
        ],
      },
      take: 2,
    });

    // Process supplements
    for (const supplement of supplements) {
      const score = calculateRecommendationScore(
        {
          type: supplement.type,
          category: supplement.category,
          targetConditions: [supplement.category, supplement.type],
          diabetesInfo: {
            suitability: 'high' as const,
            bloodSugarImpact: 'minimal' as const,
            benefits: JSON.parse(supplement.benefits || '[]'),
            contraindications: JSON.parse(supplement.contraindications || '[]'),
            interactions: [],
          },
        },
        userProfile
      );

      products.push({
        id: supplement.id,
        name: supplement.nameEn || supplement.name,
        category: supplement.category,
        targetConditions: [supplement.category, supplement.type],
        diabetesInfo: {
          suitability: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
          bloodSugarImpact: 'minimal',
          benefits: JSON.parse(supplement.benefits || '[]'),
          contraindications: JSON.parse(supplement.contraindications || '[]'),
          interactions: [],
        },
        dosage: aiRec.dosage || supplement.dosage || 'As directed',
        price: supplement.averagePrice || 0,
        averagePrice: supplement.averagePrice,
        inStock: supplement.isActive !== false,
        manufacturer: supplement.nameEn || supplement.name,
        imageUrl: supplement.imageUrl || undefined,
        description: supplement.descriptionEn || supplement.description || 'Supplement for diabetes management',
        relevanceScore: score,
        priority: aiRec.priority,
        reason: aiRec.reason,
        warnings: aiRec.warnings,
      });
    }

    // Process products
    for (const product of productsFromDB) {
      const score = calculateRecommendationScore(
        {
          type: 'product',
          category: product.category,
          targetConditions: [product.category],
          diabetesInfo: {
            suitability: 'medium' as const,
            bloodSugarImpact: 'none' as const,
            benefits: [],
            contraindications: [],
            interactions: [],
          },
        },
        userProfile
      );

      products.push({
        id: product.id,
        name: product.name,
        category: product.category,
        targetConditions: [product.category],
        diabetesInfo: {
          suitability: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
          bloodSugarImpact: 'none',
          benefits: [],
          contraindications: [],
          interactions: [],
        },
        dosage: aiRec.dosage || product.dosage || 'As directed',
        price: product.price,
        averagePrice: product.price,
        inStock: product.inStock,
        brand: product.brand,
        vendor: product.vendor,
        imageUrl: product.imageUrl || undefined,
        description: product.description || 'Product for diabetes management',
        relevanceScore: score,
        priority: aiRec.priority,
        reason: aiRec.reason,
        warnings: aiRec.warnings,
      });
    }
  }

  // Sort by relevance score and remove duplicates
  const uniqueProducts = products.filter((product, index, self) =>
    index === self.findIndex(p => p.id === product.id)
  );

  return uniqueProducts.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 8);
}

/**
 * Calculate recommendation score based on user profile
 */
function calculateRecommendationScore(
  product: {
    type: string;
    category: string;
    targetConditions: string[];
    diabetesInfo: {
      suitability: 'high' | 'medium' | 'low';
      bloodSugarImpact: 'none' | 'minimal' | 'moderate';
      benefits: string[];
      contraindications?: string[];
      interactions?: string[];
    };
  },
  userProfile: UserHealthProfile
): number {
  let score = 0;

  // Base relevance
  if (userProfile.diabetesType === 'Type 2' && 
      (product.targetConditions.includes('type2_diabetes') || 
       product.targetConditions.includes('diabetes'))) {
    score += 30;
  }

  // HbA1c level
  if (userProfile.hba1c && userProfile.hba1c > 7) {
    if (product.diabetesInfo.benefits.some(b => 
      b.toLowerCase().includes('blood sugar') || 
      b.toLowerCase().includes('insulin') ||
      b.toLowerCase().includes('glucose'))) {
      score += 25;
    }
  }

  // Complications match
  userProfile.complications.forEach(comp => {
    if (product.targetConditions.some(tc => 
      tc.toLowerCase().includes(comp.toLowerCase()))) {
      score += 20;
    }
  });

  // Medication interactions check
  const hasInteraction = checkDrugInteractions(
    userProfile.medications,
    product.diabetesInfo.interactions || []
  );
  if (hasInteraction) {
    score -= 30; // Reduce recommendation score
  }

  // Age factor
  if (userProfile.age > 50) {
    if (product.category.includes('Vitamin') || product.category.includes('Mineral')) {
      score += 10;
    }
  }

  // Suitability bonus
  if (product.diabetesInfo.suitability === 'high') {
    score += 15;
  } else if (product.diabetesInfo.suitability === 'medium') {
    score += 10;
  }

  // Blood sugar impact (lower is better)
  if (product.diabetesInfo.bloodSugarImpact === 'none') {
    score += 10;
  } else if (product.diabetesInfo.bloodSugarImpact === 'minimal') {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Check for drug interactions
 */
function checkDrugInteractions(
  medications: string[],
  interactions: string[]
): boolean {
  // Check if parameters are valid
  if (!interactions || !Array.isArray(interactions) || interactions.length === 0) return false;
  if (!medications || !Array.isArray(medications) || medications.length === 0) return false;

  const medNames = medications.map(m => m.toLowerCase());
  const interactionText = interactions.join(' ').toLowerCase();

  return medNames.some(med => interactionText.includes(med));
}

/**
 * Generate personalized recommendations
 */
export async function generatePersonalizedRecommendations(
  userId: string,
  category: string = 'general'
): Promise<{
  recommendations: (PersonalizedProduct & { completeData?: CompleteSupplementData })[];
  generalAdvice: string;
  userProfile: UserHealthProfile;
}> {
  // 1. Get user health profile
  const userProfile = await getUserHealthProfile(userId);

  // 2. Analyze with AI
  const aiAnalysis = await analyzeWithAI(userProfile, category);

  // 3. Match products from database
  const products = await matchProductsFromDB(aiAnalysis, userProfile);

  // 4. Enrich products with complete data
  const enrichedProducts = products.map(product => {
    const completeData = getSupplementByName(product.name);
    if (completeData) {
      return {
        ...product,
        completeData,
        // Add complete data fields for frontend
        basicInfo: completeData.basicInfo,
        precautions: completeData.precautions,
        scientificEvidence: completeData.scientificEvidence,
      };
    }
    return product;
  });

  return {
    recommendations: enrichedProducts,
    generalAdvice: aiAnalysis.generalAdvice,
    userProfile,
  };
}

