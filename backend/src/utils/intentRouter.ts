/**
 * 规则引擎：高置信度意图走快速路径，跳过 Gemini 调用
 */
import { SupportedLanguage } from './languageDetector';

export type RuleActionType =
  | 'record_glucose'
  | 'create_reminder'
  | 'generate_meal_plan';

export interface RuleBasedResult {
  response: string;
  action: { type: RuleActionType; data: Record<string, unknown> };
  suggestions: string[];
}

function parseGlucoseType(message: string): string {
  const lower = message.toLowerCase();
  if (/fasting|空腹|餐前|before breakfast|pre.?breakfast|before meal|morning fasting/.test(lower)) {
    return 'fasting';
  }
  if (/post.?lunch|post.?dinner|post.?meal|post.?prandial|餐后|饭后|after (lunch|dinner|meal)|post-lunch|post-dinner/.test(lower)) {
    return 'post_prandial';
  }
  if (/bedtime|睡前|睡觉前/.test(lower)) {
    return 'random';
  }
  if (/random|随机/.test(lower)) {
    return 'random';
  }
  return 'random';
}

function extractGlucoseValue(message: string): { value: number; unit: string } | null {
  const mmolMatch = message.match(/(\d+(?:\.\d+)?)\s*mmol\/l/i);
  if (mmolMatch) {
    const value = parseFloat(mmolMatch[1]);
    if (value >= 1 && value <= 35) return { value, unit: 'mmol/L' };
  }

  const mgMatch = message.match(/(\d+(?:\.\d+)?)\s*mg\/dl/i);
  if (mgMatch) {
    const value = parseFloat(mgMatch[1]);
    if (value >= 40 && value <= 600) return { value, unit: 'mg/dL' };
  }

  const zhMatch = message.match(/(?:血糖|空腹血糖|餐后血糖|随机血糖)[^\d]*(\d+(?:\.\d+)?)/);
  if (zhMatch) {
    const value = parseFloat(zhMatch[1]);
    if (value >= 1 && value <= 35) return { value, unit: value <= 35 ? 'mmol/L' : 'mg/dL' };
    if (value >= 40 && value <= 600) return { value, unit: 'mg/dL' };
  }

  const zhValueBeforeGlucose = message.match(/(?:量了|测了|测得|是)\s*(\d+(?:\.\d+)?)[^\d]{0,12}血糖/);
  if (zhValueBeforeGlucose) {
    const value = parseFloat(zhValueBeforeGlucose[1]);
    if (value >= 1 && value <= 35) return { value, unit: 'mmol/L' };
    if (value >= 40 && value <= 600) return { value, unit: 'mg/dL' };
  }

  const enPatterns = [
    /blood sugar(?: reading| level|)?(?: is|:)?\s*(\d+(?:\.\d+)?)/i,
    /glucose(?: reading| level|)?(?: is|:)?\s*(\d+(?:\.\d+)?)/i,
    /sugar level(?: is|:)?\s*(\d+(?:\.\d+)?)/i,
    /reading after dinner:\s*(\d+(?:\.\d+)?)/i,
    /(?:fasting |post-meal |random )?(?:blood sugar|glucose|bg)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)(?:\s*fasting|\s*mg\/dl)?(?:\s*,|\s*no discomfort)/i,
  ];
  for (const pattern of enPatterns) {
    const match = message.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (value >= 1 && value <= 35) return { value, unit: 'mmol/L' };
      if (value >= 40 && value <= 600) return { value, unit: 'mg/dL' };
    }
  }

  const bareNum = message.match(/(?:record|log|save|track|录入|记录).*?(\d+(?:\.\d+)?)/i);
  if (bareNum) {
    const value = parseFloat(bareNum[1]);
    if (value >= 1 && value <= 35) return { value, unit: 'mmol/L' };
    if (value >= 40 && value <= 600) return { value, unit: 'mg/dL' };
  }

  return null;
}

function isGlucoseRecordIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (/(?:record|log|save|track|add|录入|记录|帮我记|记一下|reading)/.test(lower) &&
      /(?:blood sugar|blood glucose|glucose|bg|sugar level|空腹血糖|餐后血糖|随机血糖|血糖)/.test(lower)) ||
    /my blood sugar is \d+/i.test(message) ||
    /(?:blood sugar reading|glucose check result)/i.test(message) ||
    /(?:测了|测得|刚测|检测到).*血糖.*\d/.test(message)
  );
}

function inferScheduleType(message: string): 'once' | 'daily' {
  const lower = message.toLowerCase();
  if (/once|one-time|tonight|only|今晚|明天|一次|单次/.test(lower)) {
    return 'once';
  }
  return 'daily';
}

function parseScheduleTime(message: string): string | null {
  const lower = message.toLowerCase();

  const quarterPast = lower.match(/quarter past (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)/);
  if (quarterPast) {
    const hours: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
      seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    };
    let hour = hours[quarterPast[1]];
    if (/evening|afternoon|tonight/.test(lower) && hour < 12) hour += 12;
    return `${String(hour).padStart(2, '0')}:15`;
  }

  const ampmFull = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (ampmFull) {
    let hour = parseInt(ampmFull[1], 10);
    const minute = ampmFull[2] || '00';
    const meridiem = ampmFull[3].toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  if (/tonight|今晚/.test(lower)) {
    const hm = message.match(/(\d{1,2}):(\d{2})/);
    if (hm) {
      let hour = parseInt(hm[1], 10);
      if (hour >= 1 && hour <= 11) hour += 12;
      return `${String(hour).padStart(2, '0')}:${hm[2]}`;
    }
    return '21:00';
  }

  const zhPeriod = message.match(/(早上|上午|中午|下午|晚上|睡前)(\d{1,2})点(半|(\d{1,2}))?/);
  if (zhPeriod) {
    let hour = parseInt(zhPeriod[2], 10);
    const minute = zhPeriod[3] === '半' ? '30' : zhPeriod[4] ? zhPeriod[4].padStart(2, '0') : '00';
    const period = zhPeriod[1];
    if (period === '下午' && hour < 12) hour += 12;
    if (period === '晚上' && hour < 12) hour += 12;
    if (period === '睡前') hour = 22;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const zhWordPeriod = message.match(/(早上|早晨|上午|中午|下午|晚上)([一二两三四五六七八九十]{1,3})点(半|一刻|三刻)?/);
  if (zhWordPeriod) {
    let hour = parseChineseNumber(zhWordPeriod[2]);
    if (hour === null) return null;
    const minuteMap: Record<string, string> = { 半: '30', 一刻: '15', 三刻: '45' };
    const minute = minuteMap[zhWordPeriod[3]] || '00';
    if (/下午|晚上/.test(zhWordPeriod[1]) && hour < 12) hour += 12;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  if (/\bnoon\b/.test(lower)) return '12:00';

  const enWord = message.match(/\b(at\s+)?(morning|midnight|bedtime)\b/i);
  if (enWord) {
    const map: Record<string, string> = { morning: '08:00', midnight: '00:00', bedtime: '22:00' };
    return map[enWord[2].toLowerCase()] ?? null;
  }

  if (!/\b(am|pm)\b/i.test(message)) {
    const hm = message.match(/(\d{1,2}):(\d{2})/);
    if (hm) {
      return `${hm[1].padStart(2, '0')}:${hm[2]}`;
    }
  }

  const zhHour = message.match(/(\d{1,2})点(半)?/);
  if (zhHour) {
    const hour = zhHour[1].padStart(2, '0');
    const half = zhHour[2] ? '30' : '00';
    return `${hour}:${half}`;
  }

  return null;
}

function isReminderIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /(?:remind me|set (?:a )?(?:one-time |daily )?reminder|create reminder|schedule reminder|add a daily reminder)/.test(lower) ||
    /(?:提醒我|叫我|提醒(?:测|吃|服|复查|复诊|运动)|设置提醒|设定提醒|帮我设置|帮我设置提醒|每天.*提醒)/.test(message)
  );
}

function parseChineseNumber(raw: string): number | null {
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const digits: Record<string, number> = {
    零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4,
    五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  };
  if (raw === '十') return 10;
  if (raw.startsWith('十')) return 10 + (digits[raw[1]] ?? 0);
  if (raw.endsWith('十')) return (digits[raw[0]] ?? 0) * 10;
  if (raw.includes('十')) {
    const [tens, ones] = raw.split('十');
    return (digits[tens] ?? 0) * 10 + (digits[ones] ?? 0);
  }
  return digits[raw] ?? null;
}

function isMealPlanIntent(message: string): boolean {
  const lower = message.toLowerCase();
  if (/^(what|how|is|are|can i|should i)\b/.test(lower.trim())) return false;
  if (/^(?:can|could|would) you explain\b|what (?:does|is).*meal plan/.test(lower.trim())) return false;
  if (/低gi食物|glycemic index|what foods/.test(lower)) return false;
  return (
    /(?:meal plan|generate.*meal|create.*meal plan|personalized meal plan|weekly meal plan|low gi meal plan|low carb)/.test(lower) ||
    /(?:餐单|膳食计划|食谱|生成本周|生成.*餐|制定.*餐|安排.*三餐|控糖膳食|健康食谱|一日三餐计划)/.test(message)
  );
}

function extractMealPlanDays(message: string): number {
  const en = message.match(/(\d+)[- ]day/i);
  if (en) return parseInt(en[1], 10);
  const zh = message.match(/(\d+)天/);
  if (zh) return parseInt(zh[1], 10);
  const zhWord = message.match(/([一二两三四五六七八九十]{1,3})天/);
  if (zhWord) return parseChineseNumber(zhWord[1]) ?? 7;
  if (/week|本周|这周|一周/.test(message)) return 7;
  if (/tomorrow|明天|一日|三餐/.test(message)) return 1;
  return 7;
}

function inferReminderType(message: string): string {
  const lower = message.toLowerCase();
  if (/exercise|walk|运动/.test(lower)) return 'exercise';
  if (/blood sugar|glucose|血糖|测糖/.test(lower)) return 'glucose_check';
  if (/medication|medicine|pill|metformin|insulin|药|二甲双胍/.test(lower)) return 'medication';
  return 'appointment';
}

function extractMedicationName(message: string): string {
  const knownMedication = message.match(/(二甲双胍|胰岛素|metformin|insulin)/i);
  return knownMedication?.[1] || '';
}

export function tryRuleBasedIntent(
  message: string,
  lang: SupportedLanguage
): RuleBasedResult | null {
  if (isMealPlanIntent(message)) {
    const days = extractMealPlanDays(message);
    return {
      response: lang === 'zh' ? `已生成${days}天控糖餐单 ✓` : `${days}-day meal plan ready ✓`,
      action: {
        type: 'generate_meal_plan',
        data: { days, preferences: '' },
      },
      suggestions:
        lang === 'zh'
          ? ['查看购物清单', '调整饮食偏好']
          : ['View shopping list', 'Adjust preferences'],
    };
  }

  if (isGlucoseRecordIntent(message)) {
    const parsed = extractGlucoseValue(message);
    if (!parsed) return null;

    const glucoseType = parseGlucoseType(message);
    return {
      response:
        lang === 'zh'
          ? `已记录 ${parsed.value} ${parsed.unit} ✓`
          : `Recorded ${parsed.value} ${parsed.unit} ✓`,
      action: {
        type: 'record_glucose',
        data: {
          value: parsed.value,
          type: glucoseType,
          unit: parsed.unit,
        },
      },
      suggestions:
        lang === 'zh'
          ? ['查看血糖趋势', '设置血糖提醒']
          : ['View glucose trends', 'Set glucose reminder'],
    };
  }

  if (isReminderIntent(message)) {
    const scheduleTime = parseScheduleTime(message);
    if (!scheduleTime) return null;

    const scheduleType = inferScheduleType(message);
    const reminderType = inferReminderType(message);
    const medicationName = reminderType === 'medication' ? extractMedicationName(message) : '';

    return {
      response: lang === 'zh' ? '提醒已设置 ✓' : 'Reminder set ✓',
      action: {
        type: 'create_reminder',
        data: {
          title: reminderType === 'medication' ? 'Medication Reminder' : 'Health Reminder',
          message:
            reminderType === 'medication'
              ? 'Please take your medication on time'
              : 'Please complete your health task',
          scheduleTime,
          type: reminderType,
          scheduleType,
          medication_name: medicationName,
          dosage: '',
          meal_timing: '',
        },
      },
      suggestions:
        lang === 'zh' ? ['添加药物名称', '再设一个提醒'] : ['Add medication name', 'Set another reminder'],
    };
  }

  return null;
}
