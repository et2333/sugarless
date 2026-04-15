/**
 * Text Translator Utility
 * 将中文文本转换为英文，特别是医疗相关术语
 */

// 常用药物中文到英文的映射
const medicationTranslations: Record<string, string> = {
  // 维生素类
  '维c': 'Vitamin C',
  '维生素c': 'Vitamin C',
  'vc现象': 'Vitamin C',
  'vc': 'Vitamin C',
  '维生素d': 'Vitamin D',
  '维生素b': 'Vitamin B',
  
  // 糖尿病药物
  '二甲双胍': 'Metformin',
  '格列齐特': 'Gliclazide',
  '格列美脲': 'Glimepiride',
  '阿卡波糖': 'Acarbose',
  '瑞格列奈': 'Repaglinide',
  '胰岛素': 'Insulin',
  '门冬胰岛素': 'Insulin Aspart',
  '甘精胰岛素': 'Insulin Glargine',
  '赖脯胰岛素': 'Insulin Lispro',
  
  // 其他常见药物
  '阿司匹林': 'Aspirin',
  '布洛芬': 'Ibuprofen',
  '对乙酰氨基酚': 'Acetaminophen',
};

// 常用短语翻译
const phraseTranslations: Record<string, string> = {
  '服用': 'Take',
  '服用药物': 'Take medication',
  '按时服用': 'Take on time',
  '饭前': 'before meal',
  '饭后': 'after meal',
  '随餐': 'with meal',
  '睡前': 'before bed',
  '早餐前': 'before breakfast',
  '午餐前': 'before lunch',
  '晚餐前': 'before dinner',
  '提醒': 'Reminder',
  '用药提醒': 'Medication Reminder',
  '按时完成': 'Complete on time',
};

/**
 * 将中文药名转换为英文
 */
export function translateMedicationName(chineseName: string): string {
  if (!chineseName) return '';
  
  const lower = chineseName.toLowerCase().trim();
  
  // 直接匹配
  if (medicationTranslations[lower]) {
    return medicationTranslations[lower];
  }
  
  // 部分匹配
  for (const [chinese, english] of Object.entries(medicationTranslations)) {
    if (lower.includes(chinese)) {
      return english;
    }
  }
  
  // 如果已经是英文或包含英文字母，直接返回
  if (/[a-zA-Z]/.test(chineseName)) {
    // 移除中文部分，只保留英文
    return chineseName.replace(/[\u4e00-\u9fa5]/g, '').trim() || chineseName;
  }
  
  // 无法翻译，返回原值（但清理空格）
  return chineseName.trim();
}

/**
 * 将中文短语转换为英文
 */
export function translatePhrase(chinesePhrase: string): string {
  if (!chinesePhrase) return '';
  
  let result = chinesePhrase.trim();
  
  // 替换常用短语
  for (const [chinese, english] of Object.entries(phraseTranslations)) {
    result = result.replace(new RegExp(chinese, 'g'), english);
  }
  
  // 如果结果中还有中文字符，尝试清理
  if (/[\u4e00-\u9fa5]/.test(result)) {
    // 提取英文部分
    const englishParts = result.match(/[a-zA-Z\s\d()]+/g);
    if (englishParts && englishParts.length > 0) {
      result = englishParts.join(' ').trim();
    } else {
      // 如果完全没有英文，返回默认值
      result = 'Reminder';
    }
  }
  
  return result.trim();
}

/**
 * 将提醒标题转换为英文
 */
export function translateReminderTitle(title: string): string {
  if (!title) return 'Reminder';
  
  // 如果已经主要是英文，直接返回
  const chineseCharCount = (title.match(/[\u4e00-\u9fa5]/g) || []).length;
  if (chineseCharCount === 0 || chineseCharCount / title.length < 0.3) {
    // 移除中文字符，只保留英文
    return title.replace(/[\u4e00-\u9fa5]/g, '').trim() || 'Reminder';
  }
  
  // 尝试翻译
  let result = translatePhrase(title);
  
  // 检查是否包含药物名称
  for (const [chinese, english] of Object.entries(medicationTranslations)) {
    if (title.includes(chinese)) {
      result = result.replace(new RegExp(chinese, 'g'), english);
    }
  }
  
  // 构建标准的英文标题
  if (title.includes('药') || title.includes('服用')) {
    return `Take ${result.replace(/Take\s*/gi, '')}`;
  }
  
  return result || 'Reminder';
}

/**
 * 将提醒消息转换为英文
 */
export function translateReminderMessage(message: string, medicationName?: string, dosage?: string, mealTiming?: string): string {
  if (!message) {
    // 如果没有消息，根据参数构建
    if (medicationName) {
      const medName = translateMedicationName(medicationName);
      let msg = `Take ${medName}`;
      if (dosage) {
        msg += ` (${dosage})`;
      }
      if (mealTiming) {
        const timing = translatePhrase(mealTiming);
        msg += ` - ${timing}`;
      }
      return msg;
    }
    return 'Please complete on time';
  }
  
  // 如果消息主要是英文，清理信中文
  const chineseCharCount = (message.match(/[\u4e00-\u9fa5]/g) || []).length;
  if (chineseCharCount === 0 || chineseCharCount / message.length < 0.3) {
    // 移除中文字符，只保留英文
    return message.replace(/[\u4e00-\u9fa5]/g, '').trim() || 'Please complete on time';
  }
  
  // 翻译消息
  let result = translatePhrase(message);
  
  // 替换药物名称
  if (medicationName) {
    const medName = translateMedicationName(medicationName);
    // 查找并替换中文药物名称
    result = result.replace(new RegExp(medicationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), medName);
  }
  
  // 处理剂量和用餐时间
  if (dosage || mealTiming) {
    if (!result.includes(medicationName || '')) {
      const medName = medicationName ? translateMedicationName(medicationName) : 'medication';
      result = `Take ${medName}`;
      if (dosage) {
        result += ` (${dosage})`;
      }
      if (mealTiming) {
        const timing = translatePhrase(mealTiming);
        result += ` - ${timing}`;
      }
    }
  }
  
  return result.trim() || 'Please complete on time';
}

/**
 * 确保所有文本都是英文（如果包含中文则转换）
 */
export function ensureEnglish(text: string): string {
  if (!text) return '';
  
  // 如果已经是纯英文，直接返回
  if (!/[\u4e00-\u9fa5]/.test(text)) {
    return text.trim();
  }
  
  // 提取英文部分（如果有）
  const englishParts = text.match(/[a-zA-Z\s\d().\-]+/g);
  if (englishParts && englishParts.length > 0) {
    // 如果有英文部分，只返回英文部分
    return englishParts.join(' ').trim();
  }
  
  // 尝试翻译
  return translatePhrase(text);
}

