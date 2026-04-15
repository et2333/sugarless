/**
 * 自然语言查询服务 (Natural Language Query Service)
 * 用于处理用户的自然语言搜索请求，转换为结构化查询
 */

interface ParsedQuery {
  keywords: string[];
  category?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  intent: 'search' | 'compare' | 'recommend';
  filters: {
    diabetesRelated?: boolean;
    medicationType?: string;
    supplementType?: string;
  };
}

/**
 * 解析自然语言查询
 * 在实际生产环境中，这里应该调用 OpenAI GPT-4 或 AWS Bedrock API
 */
export function parseNaturalLanguageQuery(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  
  // 提取关键词
  const keywords: string[] = [];
  const filters: ParsedQuery['filters'] = {};
  let category: string | undefined;
  let intent: ParsedQuery['intent'] = 'search';
  const priceRange: { min?: number; max?: number } = {};
  
  // 同义词映射（智能识别）
  const synonyms: Record<string, string[]> = {
    '降糖': ['降糖', '降血糖', '血糖控制', '控糖', '降低血糖'],
    '血糖': ['血糖', '血糖值', '葡萄糖'],
    '药': ['药', '药物', '药品', '的药', '用药'],
    '器械': ['器械', '仪器', '设备', '医疗器械'],
    '试纸': ['试纸', '测试纸', '检测纸'],
    '针': ['针', '针头', '注射针'],
  };
  
  // 糖尿病相关关键词（扩展）
  const diabetesKeywords = [
    '糖尿病', '血糖', '降糖', '降血糖', '控糖', '血糖控制',
    '胰岛素', '二甲双胍', 'diabetes', 'glucose', 'insulin', 'blood sugar'
  ];
  
  // 药物类型识别（扩展）
  const medicationTypes = {
    '二甲双胍': ['二甲双胍', 'metformin', '双胍'],
    '格列美脲': ['格列美脲', 'glimepiride', 'amaryl'],
    '西格列汀': ['西格列汀', 'sitagliptin', 'januvia'],
    '胰岛素': ['胰岛素', 'insulin'],
    '降糖药': ['降糖药', '降血糖药', '降糖', '降血糖'],
    '格列齐特': ['格列齐特', 'gliclazide', 'diamicron'],
    '达格列净': ['达格列净', 'dapagliflozin', 'forxiga'],
    '恩格列净': ['恩格列净', 'empagliflozin', 'jardiance']
  };
  
  // 补充剂类型识别
  const supplementTypes = {
    '维生素': ['维生素', 'vitamin', '维他命'],
    '鱼油': ['鱼油', 'fish oil', 'omega'],
    '镁': ['镁', 'magnesium'],
    '铬': ['铬', 'chromium'],
    '肉桂': ['肉桂', 'cinnamon'],
    '钙': ['钙', '补钙', 'calcium', '我要补钙'],
    '铁': ['铁', '补铁', 'iron', '我要补铁'],
    '锌': ['锌', '补锌', 'zinc', '我要补锌']
  };
  
  // 停用词（需要过滤的无意义词）
  const stopWords = new Set(['的', '我', '要', '想', '需要', '一些', '有', '给', '帮', '吗', '呢', '啊']);
  
  // 检查是否包含糖尿病相关关键词
  if (diabetesKeywords.some(kw => lowerQuery.includes(kw))) {
    filters.diabetesRelated = true;
  }
  
  // 识别药物类型
  for (const [type, terms] of Object.entries(medicationTypes)) {
    if (terms.some(term => lowerQuery.includes(term))) {
      filters.medicationType = type;
      keywords.push(type);
    }
  }
  
  // 识别补充剂类型
  for (const [type, terms] of Object.entries(supplementTypes)) {
    if (terms.some(term => lowerQuery.includes(term))) {
      filters.supplementType = type;
      keywords.push(type);
    }
  }
  
  // 智能提取核心关键词
  // 1. 识别"降血糖"、"血糖"等核心词
  if (lowerQuery.includes('降血糖') || lowerQuery.includes('降糖')) {
    keywords.push('降糖', '血糖', '降血糖');
  }
  if (lowerQuery.includes('血糖') && !keywords.includes('血糖')) {
    keywords.push('血糖');
  }
  
  // 2. 识别产品类型（药、器械等）
  if (lowerQuery.includes('药')) {
    keywords.push('药');
  }
  if (lowerQuery.includes('仪') || lowerQuery.includes('器械')) {
    keywords.push('血糖仪', '器械');
  }
  if (lowerQuery.includes('试纸')) {
    keywords.push('试纸');
  }
  
  // 识别分类
  if (lowerQuery.includes('药') || lowerQuery.includes('medication') || lowerQuery.includes('药物')) {
    category = '糖尿病药物';
  } else if (lowerQuery.includes('补充剂') || lowerQuery.includes('supplement') || lowerQuery.includes('维生素')) {
    category = '营养补充剂';
  } else if (lowerQuery.includes('器械') || lowerQuery.includes('血糖仪') || lowerQuery.includes('试纸')) {
    category = '医疗器械';
  } else if (lowerQuery.includes('食品') || lowerQuery.includes('燕麦') || lowerQuery.includes('蛋白粉')) {
    category = '健康食品';
  }
  
  // 识别意图
  if (lowerQuery.includes('比较') || lowerQuery.includes('对比') || lowerQuery.includes('compare')) {
    intent = 'compare';
  } else if (lowerQuery.includes('推荐') || lowerQuery.includes('建议') || lowerQuery.includes('recommend') ||
             lowerQuery.includes('我要补') || lowerQuery.includes('我需要') || lowerQuery.includes('应该吃')) {
    intent = 'recommend';
  }
  
  // 提取价格范围
  const priceMatch = lowerQuery.match(/(\d+)\s*[到至-]\s*(\d+)\s*[元块dollar]/);
  if (priceMatch) {
    priceRange.min = parseFloat(priceMatch[1]);
    priceRange.max = parseFloat(priceMatch[2]);
  } else {
    const cheapMatch = lowerQuery.match(/便宜|低价|实惠|cheap|affordable/);
    if (cheapMatch) {
      priceRange.max = 30;
    }
    const expensiveMatch = lowerQuery.match(/贵|高端|premium/);
    if (expensiveMatch) {
      priceRange.min = 50;
    }
  }
  
  // 如果没有提取到特定关键词，进行智能中文分词
  if (keywords.length === 0) {
    // 简单的中文分词：提取有意义的词组
    const meaningfulPatterns = [
      /\w+药\w*/g,           // 包含"药"的词
      /\w*血糖\w*/g,         // 包含"血糖"的词
      /\w*胰岛素\w*/g,       // 包含"胰岛素"的词
      /\w*糖尿病\w*/g,       // 包含"糖尿病"的词
      /\w*降\w*/g,           // 包含"降"的词
      /\w*仪\w*/g,           // 包含"仪"的词
      /\w*试纸\w*/g,         // 包含"试纸"的词
      /\w*针\w*/g,           // 包含"针"的词
      /\w{2,}/g              // 2个字符以上的词
    ];
    
    const extractedWords = new Set<string>();
    for (const pattern of meaningfulPatterns) {
      const matches = lowerQuery.match(pattern);
      if (matches) {
        matches.forEach(word => {
          // 过滤停用词
          if (!stopWords.has(word) && word.length > 1) {
            extractedWords.add(word);
          }
        });
      }
    }
    
    // 如果还是没有提取到，使用字符级别的分析
    if (extractedWords.size === 0) {
      // 移除停用词后的字符
      const cleanedQuery = lowerQuery
        .split('')
        .filter(char => !stopWords.has(char))
        .join('');
      
      if (cleanedQuery.length > 0) {
        extractedWords.add(cleanedQuery);
      }
    }
    
    keywords.push(...Array.from(extractedWords));
  }
  
  // 去重关键词
  const uniqueKeywords = Array.from(new Set(keywords));
  
  return {
    keywords: uniqueKeywords,
    category,
    priceRange: Object.keys(priceRange).length > 0 ? priceRange : undefined,
    intent,
    filters
  };
}

/**
 * 生成搜索建议
 */
export function generateSearchSuggestions(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const suggestions: string[] = [];
  
  const commonQueries = [
    'Blood sugar lowering drugs',
    'Glucose test strips',
    'Metformin price',
    'Diabetes supplements',
    'Vitamin D3',
    'Omega-3 fish oil',
    'Sugar-free food',
    'Low-sugar protein powder',
    'Insulin injection pen',
    'Lancets'
  ];
  
  // 根据输入返回相关建议
  if (lowerQuery.length > 0) {
    for (const suggestion of commonQueries) {
      if (suggestion.toLowerCase().includes(lowerQuery) || 
          lowerQuery.split('').every(char => suggestion.includes(char))) {
        suggestions.push(suggestion);
      }
    }
  }
  
  // 如果没有匹配，返回热门搜索
  if (suggestions.length === 0) {
    return commonQueries.slice(0, 5);
  }
  
  return suggestions.slice(0, 5);
}

/**
 * 解释搜索结果（AI生成的用户友好说明）
 */
export function explainSearchResults(
  query: string, 
  resultCount: number, 
  parsed: ParsedQuery
): string {
  if (resultCount === 0) {
    return `Sorry, no products found related to "${query}". You can try using more general keywords like "diabetes medication" or "glucose meter".`;
  }
  
  let explanation = `Found ${resultCount} `;
  
  if (parsed.category) {
    explanation += `"${parsed.category}" category `;
  }
  
  if (parsed.filters.diabetesRelated) {
    explanation += 'diabetes-friendly ';
  }
  
  explanation += 'products';
  
  if (parsed.priceRange) {
    if (parsed.priceRange.min && parsed.priceRange.max) {
      explanation += ` with price range between $${parsed.priceRange.min}-$${parsed.priceRange.max}`;
    } else if (parsed.priceRange.max) {
      explanation += ` with price below $${parsed.priceRange.max}`;
    } else if (parsed.priceRange.min) {
      explanation += ` with price above $${parsed.priceRange.min}`;
    }
  }
  
  explanation += '.';
  
  return explanation;
}

/**
 * 分析产品相关性评分
 */
export function calculateRelevanceScore(
  product: any,
  parsed: ParsedQuery
): number {
  let score = 0;
  
  const productText = `${product.name} ${product.brand || ''} ${product.description || ''} ${product.category}`.toLowerCase();
  
  // 关键词匹配（最重要）
  for (const keyword of parsed.keywords) {
    if (productText.includes(keyword.toLowerCase())) {
      score += 10;
    }
  }
  
  // 分类匹配
  if (parsed.category && product.category === parsed.category) {
    score += 15;
  }
  
  // 糖尿病相关产品加分
  if (parsed.filters.diabetesRelated) {
    if (productText.includes('糖尿病') || 
        productText.includes('血糖') || 
        productText.includes('降糖') ||
        productText.includes('diabetes')) {
      score += 10;
    }
  }
  
  // 价格范围匹配
  if (parsed.priceRange) {
    const price = product.price;
    if (parsed.priceRange.min && price < parsed.priceRange.min) {
      score -= 5;
    }
    if (parsed.priceRange.max && price > parsed.priceRange.max) {
      score -= 5;
    }
    if ((!parsed.priceRange.min || price >= parsed.priceRange.min) &&
        (!parsed.priceRange.max || price <= parsed.priceRange.max)) {
      score += 5;
    }
  }
  
  // 库存状态
  if (product.inStock) {
    score += 2;
  }
  
  return score;
}

