import { Router } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  parseNaturalLanguageQuery,
  generateSearchSuggestions,
  explainSearchResults,
  calculateRelevanceScore
} from '../services/nlqService';
import { searchSupplements } from '../services/recommendationService';
import { GeminiService } from '../services/ai/geminiService';

const router = Router();

// Language detection and display helpers
function detectLang(req: any): 'en' | 'zh' {
  // Prefer explicit query, then Accept-Language header; default to 'en'
  const q = (req?.query?.lang || '').toString().toLowerCase();
  const h = (req?.headers?.['accept-language'] || '').toString().toLowerCase();
  const src = q || h;
  if (src.startsWith('zh')) return 'zh';
  return 'en';
}

// Basic Latin detection
function hasLatin(input?: string): boolean {
  return !!(input && /[A-Za-z]/.test(input));
}

// Minimal CN->EN normalization for common vitamin names
const CN_EN_NAME_RULES: Array<[RegExp, string]> = [
  [/复合B(族)?维生素/g, 'Vitamin B Complex'],
  [/维生素B12/g, 'Vitamin B12'],
  [/维生素B6/g, 'Vitamin B6'],
  [/维生素B2/g, 'Vitamin B2'],
  [/维生素B1/g, 'Vitamin B1'],
  [/维生素D3/g, 'Vitamin D3'],
  [/维生素D/g, 'Vitamin D'],
  [/维生素C/g, 'Vitamin C'],
  [/维生素E/g, 'Vitamin E'],
  [/维生素A/g, 'Vitamin A'],
  [/维生素K2?/g, 'Vitamin K'],
  [/维生素/g, 'Vitamin'],
];

// Ensure an English-ish display name if language is English
function computeEnglishDisplayName(p: any): string {
  // 1) Use explicit English field if it contains Latin letters
  if (p.nameEn && hasLatin(p.nameEn)) return p.nameEn as string;

  // 2) Try rule-based normalization from Chinese name
  if (p.name) {
    let out = p.name as string;
    for (const [re, en] of CN_EN_NAME_RULES) {
      out = out.replace(re, en);
    }
    if (hasLatin(out)) {
      // Optionally append dosage if available, e.g., "Vitamin B1 100mg"
      return p.dosage ? `${out} ${p.dosage}` : out;
    }
  }

  // 3) Construct from brand + dosage if brand is Latin
  if (hasLatin(p.brand)) {
    const base = String(p.brand);
    return p.dosage ? `${base} ${p.dosage}` : base;
  }

  // 4) Fallback to nameEn or original name
  return (p.nameEn || p.name) as string;
}

function pickDisplayName(p: any, lang: 'en' | 'zh') {
  // Prefer English when requested; otherwise return Chinese name
  return lang === 'en' ? computeEnglishDisplayName(p) : (p.name as string);
}

function pickDisplayDescription(p: any, lang: 'en' | 'zh') {
  // Prefer English description when requested; fallback to original
  return lang === 'en' ? (p.descriptionEn || p.description || '') : (p.description || '');
}

// 自然语言查询搜索（NLQ）
router.get('/nlq-search', async (req, res) => {
  const lang = detectLang(req);
  const { q = '', limit = '20', offset = '0' } = req.query;
  
  if (!q || typeof q !== 'string') {
    throw new AppError('Search query cannot be empty', 400, 'EMPTY_QUERY');
  }
  
  // 解析自然语言查询
  const parsed = parseNaturalLanguageQuery(q);
  
  // 构建数据库查询条件
  const where: any = {
    OR: []
  };
  
  // 添加关键词搜索（暂时不查询英文字段，避免数据库列不存在错误）
  for (const keyword of parsed.keywords) {
    where.OR.push(
      { name: { contains: keyword } },
      { description: { contains: keyword } },
      { brand: { contains: keyword } }
    );
  }
  
  // 如果没有关键词，搜索所有
  if (where.OR.length === 0) {
    delete where.OR;
  }
  
  // 添加分类过滤
  if (parsed.category) {
    where.category = parsed.category;
  }
  
  // 添加价格范围过滤
  if (parsed.priceRange) {
    where.price = {};
    if (parsed.priceRange.min !== undefined) {
      where.price.gte = parsed.priceRange.min;
    }
    if (parsed.priceRange.max !== undefined) {
      where.price.lte = parsed.priceRange.max;
    }
  }
  
  // 获取产品（只选择存在的字段，避免查询不存在的 nameEn/descriptionEn 列）
  // Filter to only show in-stock products with quantity > 0
  const whereWithStock: any = {
    ...where,
    inStock: true,
  };
  
  // Add stock quantity filter - handle existing OR conditions
  if (where.OR) {
    // If where already has OR, combine with AND
    whereWithStock.AND = [
      { OR: where.OR },
      {
        OR: [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: null }
        ]
      }
    ];
    delete whereWithStock.OR;
  } else {
    // Simple case: just add OR for stock quantity
    whereWithStock.OR = [
      { stockQuantity: { gt: 0 } },
      { stockQuantity: null }
    ];
  }

  const products = await prisma.product.findMany({
    where: whereWithStock,
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      dosage: true,
      quantity: true,
      unit: true,
      price: true,
      vendor: true,
      inStock: true,
      stockQuantity: true,
      prescriptionRequired: true,
      diabetesRelevance: true,
      description: true,
      imageUrl: true,
      createdAt: true
    },
    take: parseInt(limit as string) + 10, // 多获取一些用于排序
    skip: parseInt(offset as string)
  });
  
  // 计算相关性评分并排序
  const scoredProducts = products.map(product => ({
    ...product,
    relevanceScore: calculateRelevanceScore(product, parsed)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // 取前N个结果
  const finalProducts = scoredProducts.slice(0, parseInt(limit as string));
  
  // 获取总数
  const total = await prisma.product.count({ where });
  
  // 如果检测到推荐意图或者是补充剂查询但没有找到产品，尝试AI推荐
  let aiRecommendations = null;
  if (parsed.intent === 'recommend' || 
      (parsed.filters.supplementType && finalProducts.length === 0) ||
      (q.toLowerCase().includes('补钙') && finalProducts.length === 0)) {
    try {
      // 调用补充剂搜索API，提供基于查询的AI推荐
      aiRecommendations = await searchSupplements(q);
      
      // 如果没有找到补充剂，提供基础推荐
      if (!aiRecommendations || aiRecommendations.length === 0) {
        if (q.toLowerCase().includes('补钙') || q.toLowerCase().includes('钙')) {
          aiRecommendations = [
            {
              id: 'calcium-supplement-base',
              name: '钙补充剂',
              category: '矿物质',
              type: 'mineral',
              evidenceLevel: 'A',
              benefits: JSON.stringify(['骨骼健康', '预防骨质疏松', '肌肉神经功能']),
              suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'] }),
              expectedImpact: JSON.stringify(['改善骨骼密度', '增强肌肉功能']),
              averagePrice: 25.99,
              evidenceSources: JSON.stringify(['多个临床试验证明钙对骨骼健康的重要性']),
              isActive: true,
            },
            {
              id: 'vitamin-d-supplement-base',
              name: '维生素D3',
              category: '维生素',
              type: 'vitamin',
              evidenceLevel: 'A',
              benefits: JSON.stringify(['促进钙吸收', '免疫系统支持', '骨骼健康']),
              suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'] }),
              expectedImpact: JSON.stringify(['增强钙吸收', '改善免疫功能']),
              averagePrice: 19.99,
              evidenceSources: JSON.stringify(['临床研究显示维生素D有助于钙的吸收利用']),
              isActive: true,
            }
          ];
        }
      }
    } catch (error) {
      console.error('AI推荐失败:', error);
      // 即使AI推荐失败，也不影响正常搜索
    }
  }
  
  // 生成搜索解释
  let explanation = explainSearchResults(q as string, finalProducts.length, parsed);
  
  // 如果有AI推荐，更新解释
  if (aiRecommendations && aiRecommendations.length > 0) {
    explanation = `Based on your search "${q}", we found the following AI smart recommendations:`;
  } else if (finalProducts.length === 0 && parsed.intent === 'recommend') {
    explanation = `Sorry, no products found directly related to "${q}". You can try using more general keywords like "diabetes medication" or "glucose meter".`;
  }
  
  // Inject language-aware display fields
  const finalProductsWithDisplay = finalProducts.map(p => ({
    ...p,
    displayName: pickDisplayName(p, lang),
    displayDescription: pickDisplayDescription(p, lang),
  }));

  res.json({
    success: true,
    data: finalProductsWithDisplay,
    metadata: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      query: q,
      parsed: {
        keywords: parsed.keywords,
        category: parsed.category,
        intent: parsed.intent
      },
      explanation,
      aiRecommendations: aiRecommendations || []
    }
  });
});

// 传统关键词搜索（保留向后兼容）
router.get('/search', async (req, res) => {
  const lang = detectLang(req);
  const { q = '', category = '', limit = '20', offset = '0' } = req.query;
  
  const where: any = {};
  
  if (q) {
    where.OR = [
      { name: { contains: q as string } },
      { description: { contains: q as string } },
      { brand: { contains: q as string } }
      // Note: English fields (nameEn, descriptionEn) removed to avoid database errors
    ];
  }
  
  if (category) {
    where.category = category;
  }
  
  // Filter to only show in-stock products
  const whereWithStock = {
    ...where,
    inStock: true,
    OR: [
      { stockQuantity: { gt: 0 } },
      { stockQuantity: null }
    ]
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: whereWithStock,
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        dosage: true,
        quantity: true,
        unit: true,
        price: true,
        vendor: true,
        inStock: true,
        stockQuantity: true,
        prescriptionRequired: true,
        diabetesRelevance: true,
        description: true,
        imageUrl: true,
        createdAt: true
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: [
        { inStock: 'desc' }, // In-stock items first
        { stockQuantity: 'desc' }, // Higher stock quantity first
        { price: 'asc' }, // Lower price first
        { name: 'asc' } // Alphabetical by name
      ]
    }),
    prisma.product.count({ where: whereWithStock })
  ]);
  
  // Inject language-aware display fields
  const productsWithDisplay = products.map(p => ({
    ...p,
    displayName: pickDisplayName(p, lang),
    displayDescription: pickDisplayDescription(p, lang),
  }));

  res.json({
    success: true,
    data: productsWithDisplay,
    metadata: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      query: q
    }
  });
});

// 搜索建议（自动补全）
router.get('/suggestions', async (req, res) => {
  const { q = '' } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.json({
      success: true,
      data: []
    });
  }
  
  const suggestions = generateSearchSuggestions(q);
  
  res.json({
    success: true,
    data: suggestions
  });
});

// 价格比较（跨供应商）
router.get('/compare-prices', async (req, res) => {
  const lang = detectLang(req);
  const { q = '', category = '' } = req.query;
  
  if (!q || typeof q !== 'string') {
    throw new AppError('Search query cannot be empty', 400, 'EMPTY_QUERY');
  }
  
  // 搜索相似产品
  const where: any = {
    OR: [
      { name: { contains: q as string } },
      { brand: { contains: q as string } }
      // Note: English fields (nameEn) removed to avoid database errors
    ]
  };
  
  if (category) {
    where.category = category;
  }
  
  // Filter to only show in-stock products with quantity > 0
  const whereWithStock: any = {
    ...where,
    inStock: true,
  };
  
  // Add stock quantity filter
  if (where.OR) {
    whereWithStock.AND = [
      { ...where },
      {
        OR: [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: null }
        ]
      }
    ];
    delete whereWithStock.OR;
  } else {
    whereWithStock.OR = [
      { stockQuantity: { gt: 0 } },
      { stockQuantity: null }
    ];
  }

  const products = await prisma.product.findMany({
    where: whereWithStock,
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      dosage: true,
      quantity: true,
      unit: true,
      price: true,
      vendor: true,
      inStock: true,
      stockQuantity: true,
      prescriptionRequired: true,
      diabetesRelevance: true,
      description: true,
      imageUrl: true,
      createdAt: true
    },
    orderBy: [
      { inStock: 'desc' }, // In-stock items first
      { stockQuantity: 'desc' }, // Higher stock quantity first
      { price: 'asc' }, // Lower price first
      { name: 'asc' } // Alphabetical by name
    ]
  });
  
  // 按产品名称分组，显示不同供应商的价格
  const groupedProducts = new Map<string, any[]>();
  
  for (const product of products) {
    const baseName = product.name.split(/\s*-\s*/)[0].trim(); // 提取基础名称
    
    if (!groupedProducts.has(baseName)) {
      groupedProducts.set(baseName, []);
    }
    
    groupedProducts.get(baseName)!.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      vendor: product.vendor,
      price: product.price,
      inStock: product.inStock,
      dosage: product.dosage,
      quantity: product.quantity,
      unit: product.unit,
      // Language-aware display name per variant
      displayName: pickDisplayName(product, lang)
    });
  }
  
  // 转换为数组并计算价格差异
  const comparisons = Array.from(groupedProducts.entries()).map(([name, variants]) => {
    const prices = variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    return {
      productName: name,
      variantCount: variants.length,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        average: parseFloat(avgPrice.toFixed(2)),
        savings: parseFloat((maxPrice - minPrice).toFixed(2))
      },
      variants: variants.sort((a, b) => a.price - b.price)
    };
  }).sort((a, b) => b.priceRange.savings - a.priceRange.savings); // 按节省金额排序
  
  res.json({
    success: true,
    data: comparisons,
    metadata: {
      query: q,
      totalProducts: products.length,
      comparisonGroups: comparisons.length
    }
  });
});

// 获取产品类别列表
router.get('/categories', async (req, res) => {
  const categories = await prisma.product.groupBy({
    by: ['category'],
    _count: {
      category: true
    }
  });
  
  const result = categories.map(c => ({
    name: c.category,
    count: c._count.category
  }));
  
  res.json({
    success: true,
    data: result
  });
});

// 获取产品详情
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  const product = await prisma.product.findUnique({
    where: { id }
  });
  
  if (!product) {
    throw new AppError('产品不存在', 404, 'PRODUCT_NOT_FOUND');
  }
  
  // 获取相似产品（同类别，相似价格范围）
  const similarProducts = await prisma.product.findMany({
    where: {
      category: product.category,
      id: { not: product.id },
      price: {
        gte: product.price * 0.7,
        lte: product.price * 1.3
      }
    },
    take: 5,
    orderBy: [
      { inStock: 'desc' }, // In-stock items first
      { stockQuantity: 'desc' }, // Higher stock quantity first
      { price: 'asc' }, // Lower price first
      { name: 'asc' } // Alphabetical by name
    ]
  });
  
  res.json({
    success: true,
    data: {
      ...product,
      similarProducts
    }
  });
});

// 实时搜索建议（基于AI分析）
router.post('/search-suggestions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    const userId = req.user!.userId;
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }

    // 获取用户档案
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    // 使用AI分析查询意图
    const aiAnalysis = await analyzeUserQueryWithAI(query, profile);
    
    // 返回AI生成的搜索建议
    const suggestions = aiAnalysis.searchSuggestions || [];
    
    res.json({
      success: true,
      data: {
        query,
        suggestions: suggestions.slice(0, 10), // 最多返回10个建议
        identifiedNeed: aiAnalysis.identifiedNeed,
        intent: aiAnalysis.intent
      }
    });
  } catch (error: any) {
    console.error('Search suggestions error:', error);
    // 返回基础建议作为降级方案
    res.json({
      success: true,
      data: {
        query: req.body.query,
        suggestions: extractSupplements(req.body.query || '').slice(0, 5),
        identifiedNeed: null,
        intent: null
      }
    });
  }
});

// 智能产品搜索（使用AI分析用户需求）
router.post('/smart-search', authenticate, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    const userId = req.user!.userId;
    const lang = detectLang(req);

    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required', 400, 'QUERY_REQUIRED');
    }

    // 获取用户档案
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    // 使用 Gemini AI 分析查询
    const aiAnalysis = await analyzeUserQueryWithAI(query, profile);

    // 根据AI分析结果搜索产品
    const recommendations = await getSmartRecommendations(aiAnalysis, lang);

    // Generate dynamic reasoning from AI analysis
    const dynamicReasoning = aiAnalysis.reasoning || generateDynamicReasoning(query, aiAnalysis);
    
    res.json({
      success: true,
      data: {
        query,
        aiAnalysis: {
          ...aiAnalysis,
          reasoning: dynamicReasoning
        },
        recommendations: recommendations.slice(0, 15), // Ensure max 15 products
        reasoning: dynamicReasoning
      }
    });
  } catch (error: any) {
    console.error('Smart search error:', error);
    throw error;
  }
});

// Enhanced AI analysis with detailed intent recognition
async function analyzeUserQueryWithAI(query: string, profile: any | null): Promise<any> {
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

    const profileInfo = profile ? `
User Profile:
- Diabetes Type: ${profile.diabetesType || 'Not specified'}
- HbA1c: ${profile.hba1c || 'Not specified'}
- Age: ${profile.dateOfBirth ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear() : 'Not specified'}
- Allergies: ${profile.allergies ? (typeof profile.allergies === 'string' ? profile.allergies : JSON.parse(profile.allergies || '[]').join(', ')) : 'None'}
` : 'No user profile available';

    const prompt = `You are a professional diabetes healthcare assistant. Analyze the user's product search query in detail.

User Query: "${query}"

${profileInfo}

Task:
1. Identify the health need (e.g., "缺乏维生素C", "lack of Vitamin C")
2. Extract key ingredients/supplements/products needed
3. Consider special diabetes patient requirements
4. Generate personalized recommendations

Respond in JSON format (valid JSON only, no markdown):
{
  "identifiedNeed": "Specific health need identified (e.g., 'lack of Vitamin C', 'need blood sugar monitoring')",
  "intent": "vitamin_deficiency|blood_sugar_control|supplement_needed|medical_device|medication",
  "keywords": ["vitamin c", "ascorbic acid", "immune support", "antioxidant"],
  "neededSupplements": ["Vitamin C", "Vitamin D3", "Iron"],
  "neededProducts": ["glucose meter", "test strips"],
  "recommendedCategories": ["Vitamin C supplements", "Multivitamins with Vitamin C", "Immune support"],
  "diabetesConsiderations": ["Does not affect blood sugar", "Boosts immune system", "Important for wound healing in diabetes"],
  "reasoning": "Based on your query '${query}', AI identified that you ${identifiedNeed}. For diabetes patients, ${diabetesConsiderations.join(', ')}. We recommend ${recommendedCategories.join(', ')} to address your needs.",
  "diabetesRelevance": "Detailed explanation of how this relates to diabetes management (2-3 sentences)",
  "searchSuggestions": ["Vitamin C 1000mg", "Vitamin C with Zinc", "Ester-C", "Liposomal Vitamin C", "Vitamin C chewable tablets"]
}

Requirements:
- Be specific and accurate
- Focus on diabetes-compatible products
- Generate 5-8 relevant search suggestions based on the query
- All text in English
- Return valid JSON only`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanText);
      
      // Generate dynamic reasoning based on analysis
      if (analysis.identifiedNeed && !analysis.reasoning) {
        analysis.reasoning = generateDynamicReasoning(query, analysis);
      }
      
      return analysis;
    } catch (parseError) {
      console.error('AI response parse error:', parseError);
      return getFallbackAnalysis(query);
    }
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return getFallbackAnalysis(query);
  }
}

// Generate dynamic reasoning based on analysis
function generateDynamicReasoning(userInput: string, analysis: any): string {
  const identifiedNeed = analysis.identifiedNeed || 'have specific health needs';
  const considerations = analysis.diabetesConsiderations?.join(', ') || 'are important for overall health';
  const categories = analysis.recommendedCategories?.join(', ') || 'relevant products';
  
  return `Based on your input "${userInput}", AI identified that you ${identifiedNeed}.

For diabetes patients:
- ${considerations}

Recommendation: We recommend ${categories} to address your needs. These products are specifically selected for their compatibility with diabetes management and their proven benefits for individuals with diabetes.`;
}

// Fallback analysis when AI fails
function getFallbackAnalysis(query: string): any {
  const supplements = extractSupplements(query);
  return {
    identifiedNeed: supplements.length > 0 ? `need ${supplements.join(' and ')}` : 'are looking for health products',
    intent: 'general_search',
    keywords: query.toLowerCase().split(/\s+/),
    neededSupplements: supplements,
    neededProducts: [],
    recommendedCategories: supplements.length > 0 ? [`${supplements[0]} supplements`] : ['general health products'],
    diabetesConsiderations: ['All recommendations are diabetes-compatible'],
    reasoning: `Based on your query "${query}", we recommend the following products suitable for diabetes management.`,
    diabetesRelevance: 'All recommended products are carefully selected for their compatibility with diabetes management.',
    searchSuggestions: supplements.length > 0 
      ? supplements.map(s => `${s} supplement`)
      : ['Vitamin C', 'Vitamin D3', 'Multivitamin', 'Omega-3', 'Magnesium']
  };
}

// 从查询中提取补充剂名称
function extractSupplements(query: string): string[] {
  const supplementMap: Record<string, string[]> = {
    'vc': ['Vitamin C'],
    'vitamin c': ['Vitamin C'],
    'vitamin c3': ['Vitamin C'],
    '缺乏vc': ['Vitamin C'],
    'lack of vc': ['Vitamin C'],
    'vitamin d': ['Vitamin D3'],
    'vitamin d3': ['Vitamin D3'],
    'vd3': ['Vitamin D3'],
    'calcium': ['Calcium'],
    'magnesium': ['Magnesium'],
    'omega': ['Omega-3'],
    'omega-3': ['Omega-3'],
    'b12': ['Vitamin B12'],
    'vitamin b12': ['Vitamin B12']
  };

  const lowerQuery = query.toLowerCase();
  const found: string[] = [];

  for (const [key, supplements] of Object.entries(supplementMap)) {
    if (lowerQuery.includes(key)) {
      found.push(...supplements);
    }
  }

  return found;
}

// Enhanced smart recommendations - returns 10-15 products prioritized by relevance
async function getSmartRecommendations(aiAnalysis: any, lang: 'en' | 'zh'): Promise<any[]> {
  const recommendations: any[] = [];

  // 1. Priority 1: Search for specific supplements (5-8 products)
  if (aiAnalysis.neededSupplements && aiAnalysis.neededSupplements.length > 0) {
    for (const supplementName of aiAnalysis.neededSupplements) {
      const supplements = await searchSupplements(supplementName);
      if (supplements && supplements.length > 0) {
        // Get up to 8 products per supplement, prioritize by relevance
        recommendations.push(...supplements.slice(0, 8).map(s => ({
          type: 'supplement',
          id: s.id,
          name: s.nameEn || s.name, // Use English name first
          description: lang === 'en' ? (s.descriptionEn || s.description) : s.description,
          category: s.category,
          benefits: JSON.parse(s.benefits || '[]'),
          diabetesApplicability: s.suitableFor ? JSON.parse(s.suitableFor) : {},
          price: s.averagePrice,
          averagePrice: s.averagePrice,
          imageUrl: s.imageUrl,
          inStock: s.isActive !== false,
          relevanceScore: 0.95, // High priority for direct matches
          reasoning: `Recommended ${supplementName} supplement for your needs`
        })));
      }
    }
  }

  // 2. Priority 2: Search products by keywords with category matching (3-5 products)
  if (aiAnalysis.recommendedCategories && aiAnalysis.recommendedCategories.length > 0) {
    for (const category of aiAnalysis.recommendedCategories.slice(0, 3)) {
      // Filter to only show in-stock products
      const categoryWhere = {
        AND: [
          {
            OR: [
              { category: { contains: category } },
              { name: { contains: category } },
              { description: { contains: category } }
            ]
          },
          { inStock: true },
          {
            OR: [
              { stockQuantity: { gt: 0 } },
              { stockQuantity: null }
            ]
          }
        ]
      };

      const categoryProducts = await prisma.product.findMany({
        where: categoryWhere,
        select: {
          id: true,
          name: true,
          brand: true,
          category: true,
          dosage: true,
          quantity: true,
          unit: true,
          price: true,
          vendor: true,
          inStock: true,
          stockQuantity: true,
          prescriptionRequired: true,
          diabetesRelevance: true,
          description: true,
          imageUrl: true,
        },
        take: 5,
        orderBy: [
          { inStock: 'desc' }, // In-stock items first
          { stockQuantity: 'desc' }, // Higher stock quantity first
          { price: 'asc' }, // Lower price first
          { name: 'asc' } // Alphabetical by name
        ]
      });

      categoryProducts.forEach(p => {
        // Avoid duplicates
        if (!recommendations.find(r => r.id === p.id)) {
          recommendations.push({
            type: 'product',
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            brand: p.brand,
            price: p.price,
            vendor: p.vendor,
            inStock: p.inStock,
            stockQuantity: p.stockQuantity,
            prescriptionRequired: p.prescriptionRequired,
            diabetesRelevance: p.diabetesRelevance,
            imageUrl: p.imageUrl,
            relevanceScore: 0.8, // Medium-high priority for category matches
            reasoning: `Found in ${category} category`
          });
        }
      });
    }
  }

  // 3. Priority 3: General keyword search (2-3 products)
  if (aiAnalysis.keywords && aiAnalysis.keywords.length > 0) {
    const searchTerms = aiAnalysis.keywords.slice(0, 3).join(' ');
    // Filter to only show in-stock products
    const keywordWhere = {
      AND: [
        {
          OR: [
            { name: { contains: searchTerms } },
            { description: { contains: searchTerms } },
            { brand: { contains: searchTerms } }
          ]
        },
        { inStock: true },
        {
          OR: [
            { stockQuantity: { gt: 0 } },
            { stockQuantity: null }
          ]
        }
      ]
    };

    const keywordProducts = await prisma.product.findMany({
      where: keywordWhere,
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        dosage: true,
        quantity: true,
        unit: true,
        price: true,
        vendor: true,
        inStock: true,
        stockQuantity: true,
        prescriptionRequired: true,
        diabetesRelevance: true,
        description: true,
        imageUrl: true,
      },
      take: 5
    });

    keywordProducts.forEach(p => {
      if (!recommendations.find(r => r.id === p.id)) {
        recommendations.push({
          type: 'product',
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          brand: p.brand,
          price: p.price,
          vendor: p.vendor,
            inStock: p.inStock,
            stockQuantity: p.stockQuantity,
            prescriptionRequired: p.prescriptionRequired,
            diabetesRelevance: p.diabetesRelevance,
            imageUrl: p.imageUrl,
            relevanceScore: 0.7, // Medium priority for keyword matches
            reasoning: `Matches your search terms: ${searchTerms}`
        });
      }
    });
  }

  // Sort by relevance score (highest first), then prioritize in-stock items, then by price, then alphabetically
  const sorted = recommendations.sort((a, b) => {
    // 1. Sort by relevance score (highest first)
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    // 2. Prioritize in-stock items
    const aInStock = a.inStock && (a.stockQuantity ?? 0) > 0;
    const bInStock = b.inStock && (b.stockQuantity ?? 0) > 0;
    if (aInStock && !bInStock) return -1;
    if (!aInStock && bInStock) return 1;
    // 3. If both in stock or both out of stock, sort by price (ascending)
    const aPrice = a.price || a.averagePrice || 999999;
    const bPrice = b.price || b.averagePrice || 999999;
    if (aPrice !== bPrice) {
      return aPrice - bPrice;
    }
    // 4. If same price, sort alphabetically by name
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    return aName.localeCompare(bName);
  });
  
  // Filter out virtual products if we have enough real products
  const realProducts = sorted.filter(p => !p.id?.startsWith('virtual-'));
  const virtualProducts = sorted.filter(p => p.id?.startsWith('virtual-'));
  
  // If we have fewer than 10 real products, add virtual ones as fallback
  if (realProducts.length < 10 && aiAnalysis.neededSupplements && aiAnalysis.neededSupplements.length > 0) {
    const existingNames = new Set(realProducts.map(r => r.name?.toLowerCase()));
    const supplementsToAdd = aiAnalysis.neededSupplements
      .filter((supp: string) => !existingNames.has(supp.toLowerCase()))
      .slice(0, Math.min(10 - realProducts.length, 5));
    
    virtualProducts.push(...supplementsToAdd.map((supp: string) => ({
      type: 'supplement',
      id: `virtual-${supp.toLowerCase().replace(/\s+/g, '-')}`,
      name: supp,
      description: `${supp} supplement suitable for diabetes management`,
      category: 'vitamin',
      benefits: [`Supports ${supp} levels`, 'Suitable for diabetes patients'],
      diabetesApplicability: { diabetesType: ['type_1', 'type_2'] },
      price: null,
      averagePrice: null,
      imageUrl: null,
      inStock: null,
      relevanceScore: 0.75,
      reasoning: `Recommended ${supp} supplementation based on your query`
    })));
  }
  
  // Return 10-15 products (prioritize real products, fill with virtual if needed)
  if (realProducts.length === 0) {
    return virtualProducts.slice(0, 15);
  } else if (realProducts.length >= 15) {
    return realProducts.slice(0, 15);
  } else {
    const needed = Math.min(15 - realProducts.length, virtualProducts.length);
    return [...realProducts, ...virtualProducts.slice(0, needed)];
  }
}

export default router;

