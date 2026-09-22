/** Deterministic, high-precision intent candidates for common business actions. */
import type { SupportedLanguage } from './languageDetector';
import type { ExecutableIntent, IntentCandidate, SpeechAct } from './aiIntentTypes';
import { normalizeUserInput, parseChineseNumber } from './inputNormalizer';

export type RuleActionType = ExecutableIntent;

export interface RuleBasedResult {
  response: string;
  action: { type: RuleActionType; data: Record<string, unknown> };
  suggestions: string[];
}

const INFORMATIONAL_PREFIX = /^(?:what|why|how|when|where|which|does|do |is|are|should|would|could you explain|can you explain|tell me about|介绍(?:一下)?|解释(?:一下)?|请解释|什么是|为什么|怎么|如何|怎样|哪些|多少|是否|能不能说说|复诊时应该)/i;
const ACTION_TERMS = /(?:记录|记下|记到|录入|保存|添加|帮我记|提醒|设置|设定|创建|生成|制定|安排|规划|\b(?:record|log|save|track|add|remind|set|create|generate|make|plan|schedule)\b)/i;

export function detectSpeechAct(rawMessage: string): SpeechAct {
  const message = normalizeUserInput(rawMessage).trim();
  if (/^(?:确认|好的|可以|执行)(?:$|[，,。.!\s])|^(?:yes|confirm|go ahead|do it)\b/i.test(message)) return 'confirm';
  if (/^(?:取消|删除|停止|不要再)|(?:取消|删除|停止).*(?:提醒|记录)|^(?:cancel|delete|remove|stop)\b/i.test(message)) return 'cancel';
  if (/^(?:修改|调整)(?:这个|我的)?(?:提醒|记录)|^(?:把|将).*(?:提醒|记录).*?(?:改成|换成|调整)|^(?:update|change|modify)\s+(?:(?:the|my|this)\s+)?(?:reminder|record|entry)\b/i.test(message)) return 'modify';
  if (INFORMATIONAL_PREFIX.test(message)) return 'query';
  return ACTION_TERMS.test(message) ? 'execute' : 'execute';
}

function parseGlucoseType(message: string): string {
  const lower = message.toLowerCase();
  if (/hba1c|糖化(?:血红蛋白)?/.test(lower)) return 'hba1c';
  if (/post.?breakfast|post.?lunch|post.?dinner|post.?meal|post.?prandial|餐后|饭后|after (?:breakfast|lunch|dinner|supper|meal)/.test(lower)) return 'post_prandial';
  if (/fasting|空腹|餐前|饭前|pre.?breakfast|pre.?meal|before (?:my )?(?:breakfast|meal|food)|morning fasting/.test(lower)) return 'fasting';
  return 'random';
}

function toGlucose(valueRaw: string, unitRaw?: string): { value: number; unit: string } | null {
  const value = Number(valueRaw);
  if (!Number.isFinite(value)) return null;
  const unit = unitRaw ? (unitRaw.toLowerCase().startsWith('mmol') ? 'mmol/L' : 'mg/dL') : (value <= 35 ? 'mmol/L' : 'mg/dL');
  const valid = unit === 'mmol/L' ? value >= 1 && value <= 35 : value >= 20 && value <= 600;
  return valid ? { value, unit } : null;
}

function extractGlucoseValue(message: string): { value: number; unit: string } | null {
  const patterns: RegExp[] = [
    /(\d+(?:\.\d+)?)\s*(mmol\/L|mg\/dL)/i,
    /(?:血糖|glucose|blood sugar|blood glucose|sugar level|bg)[^\d]{0,24}(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)[^\d]{0,20}(?:血糖|glucose|blood sugar|blood glucose|sugar level|bg)/i,
    /(?:量到|量了|测到|测得|测了|结果(?:是|为)?|reading(?: was| is|:)?)\s*(\d+(?:\.\d+)?)/i,
    /(?:记录|记下|记到|录入|保存|record|log|save|track|add)[^\d]{0,30}(\d+(?:\.\d+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match) continue;
    const parsed = toGlucose(match[1], match[2]);
    if (parsed) return parsed;
  }
  return null;
}

function parseScheduleTime(message: string): string | null {
  const lower = message.toLowerCase();
  const quarterPast = lower.match(/quarter past (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)/);
  if (quarterPast) {
    const hours: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
    let hour = hours[quarterPast[1]];
    if (/evening|afternoon|tonight/.test(lower) && hour < 12) hour += 12;
    return `${String(hour).padStart(2, '0')}:15`;
  }

  const ampm = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    if (ampm[3].toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (ampm[3].toLowerCase() === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${ampm[2] || '00'}`;
  }

  const bareEnglishHour = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (bareEnglishHour) {
    let hour = Number(bareEnglishHour[1]);
    if (/afternoon|evening|tonight/i.test(message) && hour < 12) hour += 12;
    if (/morning/i.test(message) && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${bareEnglishHour[2] || '00'}`;
  }

  const spacedMessage = message.replace(/(每周[一二三四五六日天])(?=[零〇一二两三四五六七八九十\d]{1,3}\s*点)/, '$1 ');
  const zhTime = spacedMessage.match(/(早上|早晨|上午|中午|下午|傍晚|晚上|今晚|睡前|午饭后|午餐后)?\s*(\d{1,2}|[零〇一二两三四五六七八九十]{1,3})\s*点(?:\s*(半|一刻|三刻|\d{1,2}|[零〇一二两三四五六七八九十]{1,3}))?/);
  if (zhTime) {
    let hour = parseChineseNumber(zhTime[2]);
    if (hour === null || hour > 23) return null;
    const minuteMap: Record<string, string> = { 半: '30', 一刻: '15', 三刻: '45' };
    const minuteValue = zhTime[3] && !minuteMap[zhTime[3]]
      ? (/^\d+$/.test(zhTime[3]) ? Number(zhTime[3]) : parseChineseNumber(zhTime[3]))
      : null;
    const minute = minuteMap[zhTime[3]] || (minuteValue !== null ? String(minuteValue).padStart(2, '0') : '00');
    const period = zhTime[1] || '';
    if (/下午|傍晚|晚上|今晚|睡前|午饭后|午餐后/.test(period) && hour < 12) hour += 12;
    if (period === '中午' && hour >= 1 && hour <= 5) hour += 12;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const hm = message.match(/\b(\d{1,2}):(\d{2})\b/);
  if (hm) {
    let hour = Number(hm[1]);
    if (/tonight|evening|afternoon|下午|晚上|今晚/i.test(message) && hour < 12) hour += 12;
    return `${String(hour).padStart(2, '0')}:${hm[2]}`;
  }

  if (/\bnoon\b|中午/.test(lower)) return '12:00';
  if (/\bmidnight\b/.test(lower)) return '00:00';
  if (/\bbedtime\b|睡前/.test(lower)) return '22:00';
  return null;
}

function inferScheduleType(message: string): 'once' | 'daily' | 'weekly' {
  if (/每周|weekly|every (?:mon|tue|wed|thu|fri|sat|sun)/i.test(message)) return 'weekly';
  if (/每天|每日|daily|every day|every (?:morning|afternoon|evening|night)|each (?:morning|afternoon|evening|night)/i.test(message)) return 'daily';
  if (/once|one-time|tonight|tomorrow|今晚|明天|明早|一次|单次|(?:^|\s)(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b|周[一二三四五六日天]/i.test(message)) return 'once';
  return 'daily';
}

function inferReminderType(message: string): string {
  if (/药|服药|吃药|注射|胰岛素|二甲双胍|格列齐特|阿卡波糖|格列美脲|达格列净|恩格列净|西格列汀|medication|medicine|pill|tablet|inject|metformin|gliclazide|acarbose|glimepiride|dapagliflozin|empagliflozin|sitagliptin|insulin/i.test(message)) return 'medication';
  if (/血糖|测糖|glucose|blood sugar/i.test(message)) return 'glucose_check';
  if (/运动|散步|走路|力量训练|骑车|拉伸|慢跑|跑步|exercise|walk|workout|strength training|cycle|cycling|stretch|stretching|jog|jogging|run|running/i.test(message)) return 'exercise';
  return 'appointment';
}

function extractMedicationName(message: string): string {
  const known = message.match(/(二甲双胍|格列齐特|阿卡波糖|格列美脲|达格列净|恩格列净|西格列汀|胰岛素|metformin|gliclazide|acarbose|glimepiride|dapagliflozin|empagliflozin|sitagliptin|insulin)/i)?.[1];
  if (known) return known;
  const generic = message.match(/(?:吃|服用|注射|take|use|inject)\s*([\p{L}\p{N}-]{2,30})(?=\s+(?:at|every|daily)|[，,。.!]|$)/iu)?.[1] || '';
  return /^(?:medicine|medication|pill|tablet|one|a|my|药|药物|降糖药|一片药)$/i.test(generic) ? '' : generic;
}

function extractMealPlanDays(message: string): number {
  const digit = message.match(/(?:未来|接下来)?\s*(\d+)\s*(?:天|日)|(?:a |one )?(\d+)[- ]day/i);
  if (digit) return Number(digit[1] || digit[2]);
  const word = message.match(/(?:未来|接下来)?\s*([一二两三四五六七八九十]{1,3})\s*(?:天|日)/);
  if (word) return parseChineseNumber(word[1]) || 7;
  if (/一周|七天|week/i.test(message)) return 7;
  if (/一日三餐|一天|tomorrow/i.test(message)) return 1;
  return 7;
}

function isInformationRequest(message: string): boolean {
  return INFORMATIONAL_PREFIX.test(message.trim())
    || /(?:是什么意思|通常包含什么|有什么区别|有哪些|哪些.*(?:有用|需要|应该)|为什么|有什么关系|好不好|适合吗|means?|explain|tell me about|which .* useful|does .* (?:raise|lower|affect))/i.test(message);
}

function isGlucoseDomain(message: string): boolean {
  return /血糖|测糖|glucose|blood sugar|blood glucose|sugar level|\bbg\b/i.test(message)
    || (/(?:mmol\/L|mg\/dL)/i.test(message) && /空腹|餐前|餐后|饭后|测|fasting|post.?meal|reading/i.test(message));
}

function isGlucoseRecordRequest(message: string): boolean {
  const explicitAction = /帮我(?:记录|记)|请(?:记录|保存|录入)|(?:记录|记下|记到|录入|保存|添加)(?:一下|这次|我的|一条|血糖|空腹|餐前|餐后|饭前|饭后|\s*\d)|存(?:进|到).*记录|\b(?:record|log|save|track|add)\b/i.test(message);
  const measuredStatement = /(?:量到|量了|测到|测得|测了|刚测|检测到|check result|reading (?:was|is))/i.test(message);
  return isGlucoseDomain(message) && (explicitAction || measuredStatement) && !isInformationRequest(message);
}

function isReminderRequest(message: string): boolean {
  return /提醒(?:我)?|叫我|设置.*提醒|设定.*提醒|remind me|set (?:a )?(?:(?:one-time|daily) )?reminder|create reminder|schedule reminder/i.test(message) && !isInformationRequest(message);
}

function isMealPlanRequest(message: string): boolean {
  if (isInformationRequest(message)) return false;
  const domain = /餐单|膳食计划|食谱|三餐|meal plan|diet plan|glucose-friendly menu|diabetes menu/i.test(message);
  const action = /生成|制定|安排|规划|给我|帮我|generate|create|make|build|plan/i.test(message);
  return domain && action;
}

function reminderDefaults(message: string): Record<string, unknown> {
  const type = inferReminderType(message);
  const medicationName = type === 'medication' ? extractMedicationName(message) : '';
  return {
    title: type === 'medication' ? (medicationName ? `Take ${medicationName}` : 'Medication Reminder') : 'Health Reminder',
    message: type === 'medication' ? 'Please take your medication on time' : 'Please complete your health task',
    scheduleTime: parseScheduleTime(message),
    type,
    scheduleType: inferScheduleType(message),
    medication_name: medicationName,
    dosage: message.match(/\b\d+(?:\.\d+)?\s*(?:mg|g|ml|unit)s?\b/i)?.[0] || '',
    meal_timing: /饭前|餐前|before meal/i.test(message) ? 'before meal' : /饭后|餐后|after meal/i.test(message) ? 'after meal' : '',
  };
}

export function extractSlotsForIntent(rawMessage: string, intent: ExecutableIntent, existing: Record<string, unknown> = {}): { slots: Record<string, unknown>; missingSlots: string[] } {
  const message = normalizeUserInput(rawMessage);
  if (intent === 'record_glucose') {
    const glucose = extractGlucoseValue(message);
    const detectedType = parseGlucoseType(message);
    const slots = { ...existing, ...(glucose || {}), type: detectedType !== 'random' ? detectedType : (existing.type || 'random') };
    return { slots, missingSlots: typeof slots.value === 'number' ? [] : ['value'] };
  }
  if (intent === 'create_reminder') {
    const defaults = reminderDefaults(message);
    const slots = { ...defaults, ...existing };
    if (defaults.scheduleTime) slots.scheduleTime = defaults.scheduleTime;
    for (const key of ['medication_name', 'dosage', 'meal_timing']) if (defaults[key]) slots[key] = defaults[key];
    if (slots.type === 'medication' && !slots.medication_name) {
      const standaloneName = message.trim();
      if (!defaults.scheduleTime
        && /^[\p{L}\p{N}\s-]{2,40}$/u.test(standaloneName)
        && !/(?:提醒|设置|时间|几点|取消|确认|remind|set|time|cancel|confirm|\d{1,2}:\d{2})/i.test(standaloneName)) {
        slots.medication_name = standaloneName;
        slots.title = `Take ${standaloneName}`;
      }
    }
    return { slots, missingSlots: slots.scheduleTime ? [] : ['scheduleTime'] };
  }
  const existingDays = Number(existing.days);
  return {
    slots: {
      days: Number.isInteger(existingDays) && existingDays >= 1 && existingDays <= 30 ? existingDays : extractMealPlanDays(message),
      preferences: existing.preferences || '',
    },
    missingSlots: [],
  };
}

export function classifyRuleIntent(rawMessage: string): IntentCandidate | null {
  const message = normalizeUserInput(rawMessage);
  const speechAct = detectSpeechAct(message);
  if (speechAct === 'query' || isInformationRequest(message)) {
    return { intent: 'general_advice', speechAct: 'query', confidence: 0.96, slots: {}, missingSlots: [], source: 'rule', reasons: ['informational_expression'] };
  }

  const candidates: IntentCandidate[] = [];
  if (isGlucoseRecordRequest(message)) {
    const extracted = extractSlotsForIntent(message, 'record_glucose');
    candidates.push({ intent: 'record_glucose', speechAct, confidence: extracted.missingSlots.length ? 0.82 : 0.97, ...extracted, source: 'rule', reasons: ['glucose_domain', 'record_or_measurement_expression'] });
  }
  if (isReminderRequest(message)) {
    const extracted = extractSlotsForIntent(message, 'create_reminder');
    candidates.push({ intent: 'create_reminder', speechAct, confidence: extracted.missingSlots.length ? 0.84 : 0.97, ...extracted, source: 'rule', reasons: ['reminder_expression'] });
  }
  if (isMealPlanRequest(message)) {
    const extracted = extractSlotsForIntent(message, 'generate_meal_plan');
    candidates.push({ intent: 'generate_meal_plan', speechAct, confidence: 0.95, ...extracted, source: 'rule', reasons: ['meal_plan_domain', 'creation_expression'] });
  }
  return candidates.sort((a, b) => b.confidence - a.confidence)[0] || null;
}

/** Backward-compatible rule fast path used by existing scripts. */
export function tryRuleBasedIntent(message: string, lang: SupportedLanguage): RuleBasedResult | null {
  const candidate = classifyRuleIntent(message);
  if (!candidate || candidate.intent === 'general_advice' || candidate.confidence < 0.9 || candidate.missingSlots.length) return null;
  const responses: Record<ExecutableIntent, string> = {
    record_glucose: lang === 'zh' ? '已识别血糖记录 ✓' : 'Glucose entry recognized ✓',
    create_reminder: lang === 'zh' ? '已识别提醒设置 ✓' : 'Reminder recognized ✓',
    generate_meal_plan: lang === 'zh' ? '已识别餐单生成 ✓' : 'Meal plan request recognized ✓',
  };
  return { response: responses[candidate.intent], action: { type: candidate.intent, data: candidate.slots }, suggestions: [] };
}
