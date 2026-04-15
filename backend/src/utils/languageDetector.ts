/**
 * Language Detector and i18n Utility
 * 语言检测和国际化工具
 */

export type SupportedLanguage = 'zh' | 'en';

export interface LanguageConfig {
  prompts: {
    systemRole: string;
    responseFormat: string;
    actionTypes: string;
    reminderFormat: string;
  };
  fallbackResponses: {
    bloodSugar: string;
    diet: string;
    exercise: string;
    default: string;
  };
  suggestions: {
    bloodSugarRange: string;
    dietAdvice: string;
    glucoseTrend: string;
    medicationReminder: string;
    exerciseAdvice: string;
    feelingDizzy: string;
  };
  emergencyMessages: {
    detected: string;
    actionList: string[];
  };
  ui: {
    chatPlaceholder: string;
    sendButton: string;
    recordingStart: string;
    recordingStop: string;
    aiThinking: string;
    emergencyDetected: string;
  };
}

const languageConfigs: Record<SupportedLanguage, LanguageConfig> = {
  zh: {
    prompts: {
      systemRole: '你是一位专业的糖尿病健康助手。你必须用中文回复。',
      responseFormat: `请用JSON格式回复：
{
  "response": "你的回复内容",
  "action": {
    "type": "记录类型或null，可能的值：record_glucose, create_reminder, generate_meal_plan, emergency_alert",
    "data": "相关数据"
  },
  "suggestions": ["建议1", "建议2"]
}`,
      actionTypes: 'record_glucose, create_reminder, generate_meal_plan, emergency_alert',
      reminderFormat: '当检测到提醒设定意图时，action.type设为"create_reminder"。包含：title（提醒标题）、message（提醒内容）、scheduleTime（HH:MM格式）、type（提醒类型）、scheduleType（once|daily）'
    },
    fallbackResponses: {
      bloodSugar: '关于血糖管理，建议您：\n\n1. 正常血糖范围：\n   - 空腹血糖：3.9-6.1 mmol/L\n   - 餐后2小时：<7.8 mmol/L\n\n2. 饮食建议：\n   - 控制碳水化合物摄入\n   - 选择低升糖指数食物\n   - 定时定量进餐\n\n3. 监测建议：\n   - 定期测血糖\n   - 记录血糖变化\n\n如需更详细的个性化建议，建议咨询医生。',
      diet: '糖尿病饮食管理建议：\n\n1. 主食选择：\n   - 优先选择全谷物\n   - 控制每餐主食量\n\n2. 蛋白质：\n   - 选择瘦肉、鱼类、豆制品\n   - 适量摄入\n\n3. 蔬菜：\n   - 多选择非淀粉类蔬菜\n   - 增加膳食纤维\n\n4. 避免：\n   - 高糖食物和饮料\n   - 高脂肪食物\n   - 过度加工食品',
      exercise: '糖尿病运动建议：\n\n1. 有氧运动：\n   - 步行、游泳、骑自行车\n   - 每周至少150分钟\n\n2. 抗阻训练：\n   - 每周2-3次\n   - 增强肌肉力量\n\n3. 注意事项：\n   - 运动前测血糖\n   - 避免低血糖\n   - 循序渐进\n\n请根据您的身体状况咨询医生制定合适的运动计划。',
      default: '您好！我是您的AI健康助手，很高兴为您服务！以下是一些重要的糖尿病管理建议：\n\n1. **血糖监测**：定期监测血糖水平，了解自己的身体状况\n2. **健康饮食**：选择低升糖指数食物，控制碳水化合物摄入\n3. **适量运动**：每周至少150分钟中等强度运动\n4. **按时用药**：严格按医嘱服药，不可随意增减\n5. **定期复查**：定期检查HbA1c和各项指标\n\n💡 您可以询问我关于血糖管理、饮食建议、运动指导等方面的问题，我会为您提供专业的建议！'
    },
    suggestions: {
      bloodSugarRange: '血糖正常范围是多少？',
      dietAdvice: '我需要饮食建议',
      glucoseTrend: '帮我分析血糖趋势',
      medicationReminder: '今天的用药提醒',
      exerciseAdvice: '运动指导建议',
      feelingDizzy: '我感到头晕不舒服'
    },
    emergencyMessages: {
      detected: '检测到紧急情况！请立即就医或拨打急救电话。AI助手无法处理医疗紧急情况。',
      actionList: ['拨打120急救电话', '联系您的医生', '前往最近的急诊科']
    },
    ui: {
      chatPlaceholder: '请输入您的问题或需求...',
      sendButton: '发送',
      recordingStart: '开始录音',
      recordingStop: '停止录音',
      aiThinking: 'AI正在思考...',
      emergencyDetected: '紧急情况检测'
    }
  },
  en: {
    prompts: {
      systemRole: 'You are a professional diabetes health assistant. You MUST respond in English only.',
      responseFormat: `Please reply in JSON format:
{
  "response": "Your response content",
  "action": {
    "type": "Action type or null. Possible values: record_glucose, create_reminder, generate_meal_plan, emergency_alert",
    "data": "Related data"
  },
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`,
      actionTypes: 'record_glucose, create_reminder, generate_meal_plan, emergency_alert',
      reminderFormat: 'When a reminder setting intent is detected, set action.type to "create_reminder". Include: title (reminder title), message (reminder content), scheduleTime (HH:MM format), type (reminder type), scheduleType (once|daily)'
    },
    fallbackResponses: {
      bloodSugar: 'Regarding blood sugar management, here are my recommendations:\n\n1. Normal Blood Sugar Range:\n   - Fasting: 3.9-6.1 mmol/L (70-110 mg/dL)\n   - 2 hours post-meal: <7.8 mmol/L (<140 mg/dL)\n\n2. Dietary Advice:\n   - Control carbohydrate intake\n   - Choose low glycemic index foods\n   - Eat regular, balanced meals\n\n3. Monitoring Tips:\n   - Check blood sugar regularly\n   - Keep a log of changes\n\nFor personalized advice, please consult your doctor.',
      diet: 'Diabetes Diet Management Tips:\n\n1. Carbohydrates:\n   - Choose whole grains\n   - Control portion sizes\n\n2. Protein:\n   - Select lean meats, fish, legumes\n   - Moderate intake\n\n3. Vegetables:\n   - Focus on non-starchy vegetables\n   - Increase dietary fiber\n\n4. Avoid:\n   - High-sugar foods and drinks\n   - High-fat foods\n   - Highly processed foods',
      exercise: 'Diabetes Exercise Recommendations:\n\n1. Aerobic Exercise:\n   - Walking, swimming, cycling\n   - At least 150 minutes per week\n\n2. Resistance Training:\n   - 2-3 times per week\n   - Build muscle strength\n\n3. Precautions:\n   - Check blood sugar before exercise\n   - Prevent hypoglycemia\n   - Start gradually\n\nPlease consult your doctor for a personalized exercise plan.',
      default: 'Hello! I\'m your AI Health Assistant, happy to help! Here are some important diabetes management tips:\n\n1. **Blood Sugar Monitoring**: Regularly check your levels\n2. **Healthy Diet**: Choose low GI foods, control carb intake\n3. **Regular Exercise**: At least 150 minutes of moderate activity per week\n4. **Medication Adherence**: Follow your doctor\'s prescription\n5. **Regular Check-ups**: Monitor HbA1c and other indicators\n\n💡 Feel free to ask about blood sugar management, diet advice, exercise guidance, and more!'
    },
    suggestions: {
      bloodSugarRange: 'What is the normal blood sugar range?',
      dietAdvice: 'I need diet advice',
      glucoseTrend: 'Analyze my blood sugar trend',
      medicationReminder: 'Today\'s medication reminder',
      exerciseAdvice: 'Exercise guidance',
      feelingDizzy: 'I feel dizzy and unwell'
    },
    emergencyMessages: {
      detected: 'Emergency situation detected! Please seek immediate medical attention or call emergency services. The AI assistant cannot handle medical emergencies.',
      actionList: ['Call emergency services (911/120)', 'Contact your doctor', 'Go to the nearest ER']
    },
    ui: {
      chatPlaceholder: 'Type your question or request...',
      sendButton: 'Send',
      recordingStart: 'Start Recording',
      recordingStop: 'Stop Recording',
      aiThinking: 'AI is thinking...',
      emergencyDetected: 'Emergency Detected'
    }
  }
};

/**
 * 检测文本语言
 * Detect text language
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || text.trim().length === 0) {
    return 'zh'; // 默认中文
  }

  const trimmedText = text.trim();
  
  // 计算中文字符比例
  const chineseCharRegex = /[\u4e00-\u9fa5]/g;
  const chineseMatches = trimmedText.match(chineseCharRegex);
  const chineseCharCount = chineseMatches ? chineseMatches.length : 0;
  const totalChars = trimmedText.replace(/\s/g, '').length;
  
  // 先检查英文单词 - 如果包含常见英文单词，优先判定为英文
  const englishWords = /\b(the|is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|may|might|must|what|where|when|who|why|how|blood|sugar|diabetes|diet|exercise|medication|glucose|help|please|thank|thanks|my|me|i|you|your|need|want|get|take|make|feel|know|think|about|with|from|this|that|there|here|normal|range|level|high|low|control|manage|patient|doctor|health|advice|recommendation)\b/i;
  
  const englishMatches = trimmedText.match(englishWords);
  const englishWordCount = englishMatches ? englishMatches.length : 0;
  
  // 如果包含2个或以上英文常用词，判定为英文
  if (englishWordCount >= 2) {
    return 'en';
  }
  
  // 如果包含1个英文词，且中文字符比例低于20%，判定为英文
  if (englishWordCount >= 1 && totalChars > 0 && chineseCharCount / totalChars < 0.2) {
    return 'en';
  }
  
  // 如果中文字符占比超过20%，判定为中文
  if (totalChars > 0 && chineseCharCount / totalChars > 0.2) {
    return 'zh';
  }

  // 如果没有中文字符，但有英文字母，判定为英文
  const hasEnglishLetters = /[a-zA-Z]{3,}/.test(trimmedText);
  if (chineseCharCount === 0 && hasEnglishLetters) {
    return 'en';
  }

  // 默认返回中文
  return 'zh';
}

/**
 * 获取语言配置
 * Get language configuration
 */
export function getLanguageConfig(lang: SupportedLanguage): LanguageConfig {
  return languageConfigs[lang] || languageConfigs.zh;
}

/**
 * 获取快速回复列表
 * Get quick replies list
 */
export function getQuickReplies(lang: SupportedLanguage): string[] {
  const config = getLanguageConfig(lang);
  return [
    config.suggestions.bloodSugarRange,
    config.suggestions.dietAdvice,
    config.suggestions.glucoseTrend,
    config.suggestions.medicationReminder,
    config.suggestions.exerciseAdvice,
    config.suggestions.feelingDizzy
  ];
}

/**
 * 检测紧急情况（支持中英文）
 * Detect emergency situations (supports Chinese and English)
 * 排除正常的操作请求（如设置提醒、查询等）
 */
export function detectEmergency(message: string, lang?: SupportedLanguage): boolean {
  const detectedLang = lang || detectLanguage(message);
  const lowerMessage = message.toLowerCase().trim();
  
  // 排除正常操作的关键词（更严格的匹配，必须是明确的短语）
  const normalOperations = {
    zh: [
      '设置提醒', '创建提醒', '帮助我设置', '帮助我创建', '帮我设置',
      '帮我创建', '提醒我', '记录血糖', '查询血糖', '显示数据',
      '设置', '创建', '记录', '查询', '显示'
    ],
    en: [
      'set a reminder', 'create a reminder', 'help me set', 'help me create',
      'can you help', 'set reminder', 'create reminder', 'remind me',
      'eat medical', 'take medical', 'eat medicine', 'take medicine',
      'log blood sugar', 'record blood sugar', 'query', 'show', 'display'
    ]
  };
  
  // 检查是否是正常操作请求（必须是明确的短语，避免误判）
  const normalOps = normalOperations[detectedLang] || normalOperations.en;
  const isNormalOperation = normalOps.some(op => {
    const opLower = op.toLowerCase();
    // 对于完整的短语，直接匹配
    if (opLower.split(' ').length > 1 || opLower.length > 3) {
      return lowerMessage.includes(opLower);
    }
    // 对于短词（如"set", "log"），需要在操作上下文中才排除
    // 这些词单独出现时，只有在"set reminder"、"log blood sugar"等上下文中才排除
    return false; // 短词不单独排除，避免漏掉真正的紧急情况
  });
  
  if (isNormalOperation) {
    return false; // 正常操作，不触发紧急情况
  }
  
  // 紧急关键词（更精确的匹配）
  const emergencyKeywords = {
    zh: [
      // 症状相关（需要完整的短语，避免误判）
      '胸痛', '呼吸困难', '无法呼吸', '昏迷', '失去意识', '意识不清',
      '严重头晕', '持续呕吐', '剧烈疼痛',
      // 血糖危机（特定数值或严重描述）
      '严重低血糖', '血糖极低', '血糖低于3', '血糖低于2', '血糖1',
      '高血糖危象', '血糖超过20', '血糖超过25', '酮症酸中毒',
      // 明确的紧急请求
      '紧急', '救命', '快叫医生', '立即就医', '马上就医',
      '拨打120', '打120', '叫救护车', '急救车', '急救'
    ],
    en: [
      // 症状相关（完整短语，避免单独关键词误判）
      'chest pain', 'difficulty breathing', 'cannot breathe', 'trouble breathing',
      'unconscious', 'lost consciousness', 'loss of consciousness', 'passed out',
      'severe dizziness', 'continuous vomiting', 'severe pain', 'extreme pain',
      // 血糖危机（特定数值或严重描述）
      'severe hypoglycemia', 'very low blood sugar', 'blood sugar below 3',
      'blood sugar below 2', 'blood sugar 1', 'blood sugar 2',
      'hyperglycemic crisis', 'blood sugar above 20', 'blood sugar over 25',
      'diabetic ketoacidosis', 'dka',
      // 明确的紧急请求（排除"help me set"这类）
      'medical emergency', 'emergency situation', 'need emergency',
      'call 911', 'call emergency', 'call doctor now', 'need doctor now',
      'urgent', 'urgently', 'immediately', 'right now'
    ]
  };

  const keywords = emergencyKeywords[detectedLang] || emergencyKeywords.en;
  
  // 检查紧急关键词，需要完整匹配或短语匹配
  const hasEmergencyKeyword = keywords.some(keyword => {
    const keywordLower = keyword.toLowerCase();
    // 对于短关键词，需要确保不是作为其他词的一部分
    if (keywordLower.length <= 3) {
      // 使用单词边界或特定上下文
      const regex = new RegExp(`\\b${keywordLower}\\b`, 'i');
      return regex.test(lowerMessage);
    }
    // 对于长短语，直接检查包含关系
    return lowerMessage.includes(keywordLower);
  });
  
  // 额外的上下文检查：如果包含"help"但上下文是正常操作，不触发紧急
  if (lowerMessage.includes('help') && !hasEmergencyKeyword) {
    // 检查"help"是否在正常操作的上下文中
    const helpInNormalContext = [
      'help me set', 'help me create', 'help me find', 'help me get',
      'help me log', 'help me record', 'can you help', 'could you help'
    ].some(context => lowerMessage.includes(context));
    
    if (helpInNormalContext) {
      return false;
    }
  }
  
  return hasEmergencyKeyword;
}

/**
 * 生成紧急情况响应
 * Generate emergency response
 */
export function getEmergencyResponse(lang: SupportedLanguage) {
  const config = getLanguageConfig(lang);
  return {
    response: config.emergencyMessages.detected,
    isEmergency: true,
    suggestions: config.emergencyMessages.actionList
  };
}

