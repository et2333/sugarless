/**
 * B2: OTC与补充剂推荐服务
 * 基于用户档案生成个性化补充剂推荐
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// ==================== 类型定义 ====================

interface HealthNeeds {
  priorities: {
    category: string;
    severity: 'low' | 'medium' | 'high';
    target?: any;
  }[];
  deficiencies: string[];
  goals: string[];
}

interface GenerateRecommendationRequest {
  userId: string;
  focus?: 'blood_sugar' | 'weight' | 'energy' | 'general';
}

interface SupplementWithScore {
  supplement: any;
  relevanceScore: number;
  reasons: string[];
  expectedImpact: any;
  interactions: any[];
}

// ==================== 核心推荐引擎 ====================

/**
 * 生成个性化推荐
 */
export async function generateRecommendations(
  request: GenerateRecommendationRequest
): Promise<any> {
  const { userId, focus } = request;

  // 1. 获取用户档案
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError('Please complete your personal profile first', 400, 'PROFILE_REQUIRED');
  }

  // 2. 分析健康需求
  const needs = analyzeHealthNeeds(profile, focus);

  // 3. 获取候选补充剂
  const candidates = await getCandidateSupplements(needs);

  // 评分和排序（如果有候选补充剂）
  let scored: SupplementWithScore[] = [];
  if (candidates.length > 0) {
    scored = await scoreAndRankSupplements(candidates, profile, needs);
  }
  
  // 如果数据库中的补充剂不足（少于5个），补充基础推荐
  if (scored.length < 5) {
    const basicRecs = createBasicRecommendations(needs, focus);
    // 合并基础推荐，避免重复
    const existingIds = new Set(scored.map(s => s.supplement.id));
    const additionalRecs = basicRecs.filter(rec => !existingIds.has(rec.supplement.id));
    scored = [...scored, ...additionalRecs].slice(0, 10); // Limit to 10 recommendations
  }

    // 5. 检查药物相互作用
  const userMedications = await prisma.medication.findMany({
    where: { userId, isActive: true },
  });
  
  const filtered = await checkDrugInteractions(scored, userMedications);

  // 6. 计算预期影响
  const withImpact = await calculateImpacts(filtered, profile);

  // 7. 创建推荐记录
  // 确保至少有3-5个推荐
  if (withImpact.length === 0) {
    // 如果没有任何推荐，至少返回基础推荐
    const fallbackRecs = createBasicRecommendations(needs, focus);
    withImpact.push(...fallbackRecs.slice(0, 5));
  }
  
  // 分离数据库补充剂和基础推荐
  const dbSupplements = withImpact.filter(item => !item.supplement?.id?.includes('-supplement'));
  const basicSupplements = withImpact.filter(item => item.supplement?.id?.includes('-supplement'));

  const recommendation = await prisma.recommendation.create({
    data: {
      userId,
      focus: focus || 'general',
      rationale: generateRationale(needs, withImpact),
      aiModel: 'rule-based-v1', // 可以后续升级为AI模型
      confidence: calculateOverallConfidence(withImpact),
      items: {
        create: dbSupplements.slice(0, 10).map((item, index) => ({
          supplementId: item.supplement.id,
          rank: index + 1,
          strength: item.relevanceScore > 0.8 ? 'strong' : item.relevanceScore > 0.5 ? 'moderate' : 'weak',
          reasons: JSON.stringify(item.reasons),
          expectedImpact: JSON.stringify(item.expectedImpact),
          evidenceLevel: item.supplement.evidenceLevel,
          evidenceSources: item.supplement.evidenceSources,
          interactions: JSON.stringify(item.interactions),
          pricing: JSON.stringify({
            averagePrice: item.supplement.averagePrice,
          }),
          relevanceScore: item.relevanceScore,
        })),
      },
    },
    include: {
      items: {
        include: {
          supplement: true,
        },
        orderBy: {
          rank: 'asc',
        },
      },
    },
  });

  // 如果是基础推荐（没有数据库补充剂），将基础推荐转换为items格式
  if (candidates.length === 0 && basicSupplements.length > 0) {
    // 手动构建items，因为基础推荐不在数据库中
    // 确保每个item都有唯一的ID和完整的supplement数据
    // 去重：确保每个supplement只出现一次
    const seenSupplements = new Set<string>();
    const uniqueBasicSupplements = basicSupplements.filter(item => {
      const supplementId = item.supplement.id;
      if (seenSupplements.has(supplementId)) {
        return false;
      }
      seenSupplements.add(supplementId);
      return true;
    });
    
    (recommendation as any).items = uniqueBasicSupplements.map((item, index) => ({
      id: `${recommendation.id}-basic-${index}-${Date.now()}`,
      recommendationId: recommendation.id,
      supplementId: item.supplement.id,
      rank: index + 1,
      strength: item.relevanceScore > 0.8 ? 'strong' : item.relevanceScore > 0.5 ? 'moderate' : 'weak',
      reasons: JSON.stringify(item.reasons),
      expectedImpact: JSON.stringify(item.expectedImpact),
      evidenceLevel: item.supplement.evidenceLevel || 'C',
      evidenceSources: item.supplement.evidenceSources || JSON.stringify([]),
      interactions: JSON.stringify(item.interactions),
      pricing: JSON.stringify({
        averagePrice: item.supplement.averagePrice || 0,
      }),
      relevanceScore: item.relevanceScore,
      createdAt: new Date().toISOString(),
      supplement: item.supplement, // Ensure supplement data is included
    }));
  }

  // Ensure all items have supplement data and use English names before returning
  if (recommendation.items) {
    recommendation.items = recommendation.items
      .filter((item: any) => 
        item.supplement !== null && item.supplement !== undefined
      )
      .map((item: any) => ({
        ...item,
        supplement: {
          ...item.supplement,
          name: item.supplement.nameEn || item.supplement.name,
        },
      }));
  }

  return recommendation;
}

/**
 * 分析健康需求
 */
function analyzeHealthNeeds(profile: any, focus?: string): HealthNeeds {
  const needs: HealthNeeds = {
    priorities: [],
    deficiencies: [],
    goals: [],
  };

  // 血糖控制需求
  if (profile.hba1c && profile.hba1c > 7.0) {
    needs.priorities.push({
      category: 'blood_sugar',
      severity: profile.hba1c > 9.0 ? 'high' : 'medium',
      target: { hba1c: 7.0 },
    });
  }

  // 根据糖尿病类型推荐
  if (profile.diabetesType === 'type_1') {
    needs.deficiencies.push('insulin_support');
  } else if (profile.diabetesType === 'type_2') {
    needs.deficiencies.push('insulin_sensitivity');
  }

  // 基于焦点调整优先级
  if (focus === 'blood_sugar') {
    needs.priorities.unshift({
      category: 'blood_sugar',
      severity: 'high',
    });
  } else if (focus === 'weight') {
    needs.goals.push('weight_management');
  } else if (focus === 'energy') {
    needs.goals.push('energy_boost');
  }

  return needs;
}

/**
 * 获取候选补充剂
 */
async function getCandidateSupplements(needs: HealthNeeds): Promise<any[]> {
  // 根据需求查询适合的补充剂
  const supplements = await prisma.supplement.findMany({
    where: {
      isActive: true,
    },
  });

  return supplements;
}

/**
 * 创建基础推荐（当数据库中没有补充剂时）
 */
function createBasicRecommendations(needs: HealthNeeds, focus?: string): SupplementWithScore[] {
  const basicRecommendations: SupplementWithScore[] = [];

  // 基础推荐逻辑 - 针对用户提到的"缺钙"场景
  if (focus === 'general' || !focus) {
    // 钙补充剂推荐
    basicRecommendations.push({
      supplement: {
        id: 'calcium-supplement',
        name: 'Calcium Supplement',
        nameEn: 'Calcium Supplement',
        category: 'Minerals',
        type: 'mineral',
        evidenceLevel: 'A',
        activeIngredients: JSON.stringify([{ name: 'Calcium Carbonate', amount: 600, unit: 'mg' }]),
        benefits: JSON.stringify(['Bone health', 'Osteoporosis prevention', 'Muscle and nerve function']),
        indications: JSON.stringify(['Osteoporosis prevention', 'Calcium deficiency']),
        suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
        expectedImpact: JSON.stringify(['Improve bone density', 'Enhance muscle function']),
        dosage: JSON.stringify({ amount: 1, unit: 'tablets', frequency: 'Twice daily', timing: 'With meals' }),
        sideEffects: JSON.stringify({ common: ['Mild constipation', 'Bloating'], rare: ['Kidney stones (high doses)'] }),
        averagePrice: 25.99,
        evidenceSources: JSON.stringify(['Multiple clinical trials demonstrate the importance of calcium for bone health']),
        contraindications: JSON.stringify([]),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      relevanceScore: 0.9,
      reasons: ['Diabetics are prone to calcium deficiency', 'Daily calcium supplementation recommended to maintain bone health'],
      expectedImpact: { benefits: ['Bone health', 'Osteoporosis prevention'] },
      interactions: [],
    });

    // 维生素D推荐
    basicRecommendations.push({
      supplement: {
        id: 'vitamin-d-supplement',
        name: 'Vitamin D3',
        nameEn: 'Vitamin D3',
        category: 'Vitamins',
        type: 'vitamin',
        evidenceLevel: 'A',
        activeIngredients: JSON.stringify([{ name: 'Vitamin D3 (Cholecalciferol)', amount: 1000, unit: 'IU' }]),
        benefits: JSON.stringify(['Promotes calcium absorption', 'Immune system support', 'Bone health']),
        indications: JSON.stringify(['Vitamin D deficiency', 'Osteoporosis prevention', 'Immune function support']),
        suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
        expectedImpact: JSON.stringify(['Enhance calcium absorption', 'Improve immune function']),
        dosage: JSON.stringify({ amount: 1, unit: 'capsules', frequency: 'Once daily', timing: 'With meals' }),
        sideEffects: JSON.stringify({ common: ['Occasional nausea'], rare: ['Hypercalcemia (overdose)'] }),
        averagePrice: 19.99,
        evidenceSources: JSON.stringify(['Multiple studies show the importance of vitamin D for diabetic patients']),
        contraindications: JSON.stringify([]),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      relevanceScore: 0.8,
      reasons: ['Vitamin D aids calcium absorption', 'Diabetics commonly lack vitamin D'],
      expectedImpact: { benefits: ['Promote calcium absorption', 'Immune support'] },
      interactions: [],
    });
  }

  // 根据焦点添加特定推荐
  if (focus === 'blood_sugar') {
    basicRecommendations.push({
      supplement: {
        id: 'chromium-supplement',
        name: 'Chromium Picolinate',
        nameEn: 'Chromium Picolinate',
        category: 'Minerals',
        type: 'mineral',
        evidenceLevel: 'B',
        activeIngredients: JSON.stringify([{ name: 'Chromium Picolinate', amount: 200, unit: 'mcg' }]),
        benefits: JSON.stringify(['Blood sugar control', 'Insulin sensitivity']),
        indications: JSON.stringify(['Type 2 diabetes adjunct therapy', 'Blood sugar control']),
        suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 75 }),
        expectedImpact: JSON.stringify(['Improve blood sugar control', 'Enhance insulin sensitivity']),
        dosage: JSON.stringify({ amount: 1, unit: 'tablets', frequency: 'Once daily', timing: 'With meals' }),
        sideEffects: JSON.stringify({ common: ['Headache', 'Insomnia'], rare: ['Allergic reactions'] }),
        averagePrice: 15.99,
        evidenceSources: JSON.stringify(['Some studies show chromium helps with blood sugar control in type 2 diabetics']),
        contraindications: JSON.stringify([]),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      relevanceScore: 0.7,
      reasons: ['Chromium helps improve insulin sensitivity', 'Beneficial for type 2 diabetics'],
      expectedImpact: { benefits: ['Blood sugar control'] },
      interactions: [],
    });
  }

  return basicRecommendations;
}

/**
 * 评分和排序补充剂
 */
async function scoreAndRankSupplements(
  supplements: any[],
  profile: any,
  needs: HealthNeeds
): Promise<SupplementWithScore[]> {
  const scored: SupplementWithScore[] = [];
  
  // Remove duplicates by supplement ID to avoid duplicate recommendations
  const uniqueSupplements = supplements.filter((supplement, index, self) => 
    index === self.findIndex(s => s.id === supplement.id)
  );

  for (const supplement of uniqueSupplements) {
    let score = 0;
    const reasons: string[] = [];

    // 解析适用人群
    const suitableFor = JSON.parse(supplement.suitableFor);
    const diabetesTypes = suitableFor.diabetesType || [];

    // 糖尿病类型匹配
    if (diabetesTypes.includes(profile.diabetesType)) {
      score += 0.3;
      reasons.push(`Suitable for ${profile.diabetesType === 'type_1' ? 'type 1' : 'type 2'} diabetes patients`);
    }

    // HbA1c高，推荐血糖控制补充剂
    if (profile.hba1c && profile.hba1c > 7.0) {
      const benefits = JSON.parse(supplement.benefits);
      if (benefits.some((b: string) => b.includes('血糖') || b.includes('HbA1c') || b.includes('blood sugar') || b.includes('glucose'))) {
        score += 0.4;
        reasons.push('Your HbA1c is elevated; this supplement helps improve blood sugar control');
      }
    }

    // 类型匹配
    if (supplement.type === 'vitamin' && needs.deficiencies.includes('vitamin_d')) {
      score += 0.2;
      reasons.push('Possible vitamin deficiency');
    }

    // 循证等级加分
    if (supplement.evidenceLevel === 'A') {
      score += 0.1;
      reasons.push('Has high-level evidence-based medical evidence');
    } else if (supplement.evidenceLevel === 'B') {
      score += 0.05;
    }

    scored.push({
      supplement,
      relevanceScore: Math.min(score, 1.0),
      reasons,
      expectedImpact: JSON.parse(supplement.expectedImpact),
      interactions: [],
    });
  }

  // 按相关性评分排序
  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * 检查药物相互作用
 */
async function checkDrugInteractions(
  supplements: SupplementWithScore[],
  medications: any[]
): Promise<SupplementWithScore[]> {
  // 简化版：标记潜在相互作用
  // 实际生产中应该调用药物相互作用数据库API

  const medicationNames = medications.map(m => m.name.toLowerCase());

  for (const item of supplements) {
    // 安全地解析 contraindications，如果不存在或为空则使用空数组
    let contraindications: string[] = [];
    try {
      if (item.supplement.contraindications) {
        contraindications = JSON.parse(item.supplement.contraindications);
      }
    } catch (error) {
      console.warn('无法解析补充剂禁忌症:', item.supplement.name, error);
      contraindications = [];
    }
    
    for (const med of medicationNames) {
      // 检查禁忌症中是否包含该药物
      const hasInteraction = contraindications.some((c: string) => 
        c.toLowerCase().includes(med)
      );

      if (hasInteraction) {
        item.interactions.push({
          drug: med,
          severity: 'moderate',
          description: 'Possible interaction, please consult your doctor',
          recommendation: 'Please consult your doctor before use',
        });
      }
    }

    // 二甲双胍的常见相互作用
    if (medicationNames.includes('metformin') || medicationNames.includes('二甲双胍')) {
      const supplementName = item.supplement.nameEn || item.supplement.name;
      if (supplementName.includes('Vitamin B12') || supplementName.includes('B12')) {
        item.interactions.push({
          drug: 'Metformin',
          severity: 'mild',
          description: 'Long-term metformin use may affect vitamin B12 absorption',
          recommendation: 'Vitamin B12 supplementation recommended',
        });
        // 这种情况反而应该加分
        item.relevanceScore += 0.1;
        item.reasons.push('You are taking metformin; vitamin B12 supplementation is recommended');
      }
    }
  }

  return supplements;
}

/**
 * 计算预期影响
 */
async function calculateImpacts(
  supplements: SupplementWithScore[],
  profile: any
): Promise<SupplementWithScore[]> {
  for (const item of supplements) {
    const baseImpact = item.expectedImpact;

    // 根据用户基线调整影响
    if (profile.hba1c && profile.hba1c > 8.0 && baseImpact.hba1c) {
      // 基线越高，改善空间越大
      const multiplier = 1.2;
      baseImpact.hba1c = baseImpact.hba1c * multiplier;
    }

    // 考虑依从性（假设70%）
    const adherenceMultiplier = 0.7;
    if (baseImpact.hba1c) {
      baseImpact.hba1c = baseImpact.hba1c * adherenceMultiplier;
    }
    if (baseImpact.glucose) {
      baseImpact.glucose = baseImpact.glucose * adherenceMultiplier;
    }

    // 计算置信度
    baseImpact.confidence = calculateImpactConfidence(item.supplement);

    item.expectedImpact = baseImpact;
  }

  return supplements;
}

/**
 * 计算影响置信度
 */
function calculateImpactConfidence(supplement: any): number {
  let confidence = 0.5;

  // 基于循证等级
  if (supplement.evidenceLevel === 'A') {
    confidence = 0.9;
  } else if (supplement.evidenceLevel === 'B') {
    confidence = 0.7;
  } else if (supplement.evidenceLevel === 'C') {
    confidence = 0.5;
  } else {
    confidence = 0.3;
  }

  return confidence;
}

/**
 * 生成推荐理由
 */
function generateRationale(needs: HealthNeeds, supplements: SupplementWithScore[]): string {
  const parts: string[] = [];

  if (needs.priorities.length > 0) {
    const highPriority = needs.priorities.filter(p => p.severity === 'high');
    if (highPriority.length > 0) {
      const categoryNames = highPriority.map(p => {
        const categoryMap: Record<string, string> = {
          'blood_sugar': 'blood sugar control',
          'weight': 'weight management',
          'energy': 'energy boost',
          'general': 'general health',
        };
        return categoryMap[p.category] || p.category;
      });
      parts.push(`Based on your current health status, we focused on ${categoryNames.join(', ')} needs.`);
    }
  }

  if (supplements.length > 0) {
    parts.push(`We recommend ${supplements.length} scientifically validated supplements that have shown positive effects on diabetic patients in clinical studies.`);
  }

  parts.push('Please note that supplements cannot replace drug treatment; please consult your doctor before use.');

  return parts.join(' ');
}

/**
 * 计算整体置信度
 */
function calculateOverallConfidence(supplements: SupplementWithScore[]): number {
  if (supplements.length === 0) return 0;

  const avgScore = supplements.reduce((sum, s) => sum + s.relevanceScore, 0) / supplements.length;
  return avgScore;
}

// ==================== 查询API ====================

/**
 * 获取推荐详情
 */
export async function getRecommendation(recommendationId: string) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    include: {
      items: {
        include: {
          supplement: true,
        },
        orderBy: {
          rank: 'asc',
        },
      },
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!recommendation) {
    throw new Error('Recommendation not found');
  }

  // 标记为已查看
  if (!recommendation.viewedAt) {
    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: { viewedAt: new Date() },
    });
  }

  // Ensure supplement names use English
  if (recommendation.items) {
    recommendation.items = recommendation.items.map(item => ({
      ...item,
      supplement: item.supplement ? {
        ...item.supplement,
        name: item.supplement.nameEn || item.supplement.name,
      } : item.supplement,
    }));
  }

  return recommendation;
}

/**
 * 获取用户的推荐历史
 */
export async function getUserRecommendations(userId: string, limit: number = 10) {
  const recommendations = await prisma.recommendation.findMany({
    where: {
      userId,
      status: 'active',
    },
    include: {
      items: {
        include: {
          supplement: true,
        },
        orderBy: {
          rank: 'asc',
        },
        // Return all items, not just 3
      },
    },
    orderBy: {
      generatedAt: 'desc',
    },
    take: limit,
  });

  // Filter out items without supplement data and ensure all have unique keys
  return recommendations.map(rec => ({
    ...rec,
    items: rec.items
      .filter(item => item.supplement !== null && item.supplement !== undefined)
      .map((item, index) => ({
        ...item,
        // Ensure unique key by adding index if needed
        id: item.id || `${rec.id}-item-${index}`,
        // Ensure supplement uses English name
        supplement: item.supplement ? {
          ...item.supplement,
          name: item.supplement.nameEn || item.supplement.name,
        } : item.supplement,
      }))
  }));
}

/**
 * 获取补充剂详情
 */
export async function getSupplementDetail(supplementId: string) {
  const supplement = await prisma.supplement.findUnique({
    where: { id: supplementId },
  });

  if (!supplement) {
    throw new Error('Supplement not found');
  }

  // Ensure English name is used
  return {
    ...supplement,
    name: supplement.nameEn || supplement.name,
  };
}

/**
 * 提交用户反馈
 */
export async function submitFeedback(
  recommendationId: string,
  feedback: {
    rating: number;
    accepted: boolean;
    comment?: string;
  }
) {
  const recommendation = await prisma.recommendation.update({
    where: { id: recommendationId },
    data: {
      feedback: JSON.stringify(feedback),
    },
  });

  return recommendation;
}

/**
 * 添加到关注列表
 */
export async function addToWatchlist(
  userId: string,
  supplementId: string,
  notes?: string,
  targetPrice?: number
) {
  const watchlistItem = await prisma.supplementWatchlist.create({
    data: {
      userId,
      supplementId,
      notes,
      targetPrice,
      notifyOnPrice: !!targetPrice,
    },
  });

  return watchlistItem;
}

/**
 * 获取用户关注列表
 */
export async function getUserWatchlist(userId: string) {
  const watchlist = await prisma.supplementWatchlist.findMany({
    where: { userId },
    orderBy: {
      addedAt: 'desc',
    },
  });

  // 获取补充剂详情
  const supplementIds = watchlist.map(w => w.supplementId);
  const supplements = await prisma.supplement.findMany({
    where: {
      id: { in: supplementIds },
    },
  });

  return watchlist.map(w => ({
    ...w,
    supplement: supplements.find(s => s.id === w.supplementId),
  }));
}

/**
 * 从关注列表移除
 */
export async function removeFromWatchlist(userId: string, supplementId: string) {
  await prisma.supplementWatchlist.deleteMany({
    where: {
      userId,
      supplementId,
    },
  });

  return { success: true };
}

// ==================== 搜索与浏览 ====================

/**
 * 搜索补充剂
 */
export async function searchSupplements(query: string, category?: string) {
  const where: any = {
    isActive: true,
  };

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { nameEn: { contains: query } },
      { category: { contains: query } },
    ];
  }

  if (category) {
    where.category = category;
  }

  const supplements = await prisma.supplement.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return supplements;
}

/**
 * 获取所有分类
 */
export async function getSupplementCategories() {
  const supplements = await prisma.supplement.findMany({
    select: {
      category: true,
    },
    distinct: ['category'],
  });

  return supplements.map(s => s.category);
}

