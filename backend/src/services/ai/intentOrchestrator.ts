import type { SupportedLanguage } from '../../utils/languageDetector';
import { getEmergencyResponse } from '../../utils/languageDetector';
import type { EmergencyAssessment, ExecutableIntent, IntentCandidate } from '../../utils/aiIntentTypes';
import { normalizeActionData } from '../../utils/actionNormalizer';
import { safeValidateActionData } from '../../utils/aiActionSchemas';
import { assessEmergency } from '../../utils/riskDetector';
import { classifyRuleIntent, detectSpeechAct, extractSlotsForIntent } from '../../utils/intentRouter';
import { clearPendingIntent, getPendingIntent, setPendingIntent } from '../../utils/pendingIntentStore';

export interface OrchestratedResult {
  response: string;
  action?: { type: ExecutableIntent | 'emergency_alert'; data: Record<string, unknown> };
  suggestions: string[];
  intent: string;
  confidence: number;
  source: 'emergency' | 'rule' | 'llm' | 'pending' | 'clarification';
  requiresClarification: boolean;
  missingSlots: string[];
  risk: EmergencyAssessment;
}

export interface PreRouteResult {
  result?: OrchestratedResult;
  candidate?: IntentCandidate;
  risk: EmergencyAssessment;
}

function clarificationMessage(intent: ExecutableIntent, missing: string[], lang: SupportedLanguage): string {
  if (missing.includes('confirmation')) {
    if (lang === 'zh') {
      const labels: Record<ExecutableIntent, string> = { record_glucose: '记录这条血糖', create_reminder: '创建这个提醒', generate_meal_plan: '生成这份餐单' };
      return `请确认是否${labels[intent]}？`;
    }
    return `Please confirm whether to ${intent.replace(/_/g, ' ')}.`;
  }
  if (missing.includes('value')) return lang === 'zh' ? '请告诉我需要记录的血糖值和单位。' : 'What glucose value and unit should I record?';
  if (missing.includes('scheduleTime')) return lang === 'zh' ? '请告诉我提醒的具体时间。' : 'What time should I set the reminder for?';
  return lang === 'zh' ? '请补充完成该操作所需的信息。' : 'Please provide the missing information.';
}

function actionResponse(intent: ExecutableIntent, lang: SupportedLanguage): string {
  const zh: Record<ExecutableIntent, string> = { record_glucose: '血糖记录已准备完成。', create_reminder: '提醒设置已准备完成。', generate_meal_plan: '餐单生成请求已准备完成。' };
  const en: Record<ExecutableIntent, string> = { record_glucose: 'Glucose entry is ready.', create_reminder: 'Reminder is ready.', generate_meal_plan: 'Meal-plan request is ready.' };
  return (lang === 'zh' ? zh : en)[intent];
}

function zodMissingFields(error: unknown): string[] {
  if (!error || typeof error !== 'object' || !('issues' in error)) return [];
  return [...new Set((error as { issues: Array<{ path: PropertyKey[] }> }).issues.map((issue) => String(issue.path[0])).filter(Boolean))];
}

const requiredSlotsByIntent: Record<ExecutableIntent, Set<string>> = {
  record_glucose: new Set(['value']),
  create_reminder: new Set(['scheduleTime', 'medication_name']),
  generate_meal_plan: new Set(),
};

function keepRequiredMissingSlots(intent: ExecutableIntent, fields: string[]): string[] {
  return fields.filter((field) => field === 'confirmation' || requiredSlotsByIntent[intent].has(field));
}

export function finalizeIntentCandidate(
  userId: string,
  lang: SupportedLanguage,
  rawMessage: string,
  candidate: IntentCandidate,
  risk: EmergencyAssessment = assessEmergency(rawMessage, lang),
): OrchestratedResult {
  if (candidate.intent === 'general_advice') {
    return {
      response: '', suggestions: [], intent: candidate.intent, confidence: candidate.confidence,
      source: candidate.source, requiresClarification: false, missingSlots: [], risk,
    };
  }

  if (candidate.speechAct === 'cancel' || candidate.speechAct === 'modify') {
    const operation = candidate.speechAct === 'cancel'
      ? (lang === 'zh' ? '取消' : 'cancel')
      : (lang === 'zh' ? '修改' : 'modify');
    return {
      response: lang === 'zh'
        ? `请说明要${operation}的具体记录或提醒。`
        : `Please specify which record or reminder you want to ${operation}.`,
      suggestions: [], intent: candidate.intent, confidence: candidate.confidence,
      source: 'clarification', requiresClarification: true, missingSlots: ['targetId'], risk,
    };
  }

  const extracted = extractSlotsForIntent(rawMessage, candidate.intent, candidate.slots);
  const normalized = normalizeActionData(candidate.intent, extracted.slots, rawMessage) || extracted.slots;
  let missing = [...new Set(keepRequiredMissingSlots(candidate.intent, [...candidate.missingSlots, ...extracted.missingSlots]))];

  if (candidate.confidence < 0.75 && !missing.includes('confirmation')) missing.push('confirmation');
  const validation = safeValidateActionData(candidate.intent, normalized);
  if (!validation.success) {
    missing = [...new Set([...missing, ...keepRequiredMissingSlots(candidate.intent, zodMissingFields(validation.error))])];
  }

  if (missing.length) {
    setPendingIntent(userId, { intent: candidate.intent, slots: normalized, missingSlots: missing, language: lang, createdAt: Date.now() });
    return {
      response: clarificationMessage(candidate.intent, missing, lang), suggestions: [], intent: candidate.intent,
      confidence: candidate.confidence, source: 'clarification', requiresClarification: true, missingSlots: missing, risk,
    };
  }

  clearPendingIntent(userId);
  return {
    response: actionResponse(candidate.intent, lang),
    action: { type: candidate.intent, data: validation.success ? validation.data : normalized },
    suggestions: [], intent: candidate.intent, confidence: candidate.confidence, source: candidate.source,
    requiresClarification: false, missingSlots: [], risk,
  };
}

export function preRouteIntent(message: string, userId: string, lang: SupportedLanguage): PreRouteResult {
  const risk = assessEmergency(message, lang);
  if (risk.isEmergency) {
    const emergency = getEmergencyResponse(lang);
    return {
      risk,
      result: {
        response: emergency.response,
        action: { type: 'emergency_alert', data: { level: risk.level, reasons: risk.reasons, glucose: risk.glucose } },
        suggestions: emergency.suggestions,
        intent: 'emergency_alert', confidence: risk.confidence, source: 'emergency',
        requiresClarification: false, missingSlots: [], risk,
      },
    };
  }

  const pending = getPendingIntent(userId);
  if (pending) {
    const speechAct = detectSpeechAct(message);
    if (speechAct === 'cancel') {
      clearPendingIntent(userId);
      return {
        risk,
        result: {
          response: lang === 'zh' ? '已取消本次操作。' : 'The pending action was cancelled.', suggestions: [],
          intent: pending.intent, confidence: 1, source: 'pending', requiresClarification: false, missingSlots: [], risk,
        },
      };
    }
    const freshCandidate = classifyRuleIntent(message);
    if (freshCandidate
      && freshCandidate.intent !== 'general_advice'
      && freshCandidate.confidence >= 0.9
      && freshCandidate.missingSlots.length === 0) {
      clearPendingIntent(userId);
      return {
        candidate: freshCandidate,
        risk,
        result: finalizeIntentCandidate(userId, lang, message, freshCandidate, risk),
      };
    }
    const extracted = extractSlotsForIntent(message, pending.intent, pending.slots);
    const remaining = [...extracted.missingSlots];
    if (pending.missingSlots.includes('medication_name') && !extracted.slots.medication_name) remaining.push('medication_name');
    if (pending.missingSlots.includes('confirmation') && speechAct !== 'confirm') remaining.push('confirmation');
    const candidate: IntentCandidate = {
      intent: pending.intent, speechAct, confidence: 0.98, slots: extracted.slots,
      missingSlots: remaining, source: 'pending', reasons: ['continued_pending_action'],
    };
    return { risk, result: finalizeIntentCandidate(userId, lang, message, candidate, risk) };
  }

  const candidate = classifyRuleIntent(message);
  if (!candidate || candidate.intent === 'general_advice') return { candidate: candidate || undefined, risk };
  if (candidate.speechAct === 'cancel' || candidate.speechAct === 'modify') {
    const operation = candidate.speechAct === 'cancel'
      ? (lang === 'zh' ? '取消' : 'cancel')
      : (lang === 'zh' ? '修改' : 'modify');
    return {
      candidate,
      risk,
      result: {
        response: lang === 'zh'
          ? `请说明要${operation}的具体记录或提醒。`
          : `Please specify which record or reminder you want to ${operation}.`,
        suggestions: [], intent: candidate.intent, confidence: candidate.confidence,
        source: 'clarification', requiresClarification: true, missingSlots: ['targetId'], risk,
      },
    };
  }
  if (candidate.confidence >= 0.9 || candidate.missingSlots.length > 0) {
    return { candidate, risk, result: finalizeIntentCandidate(userId, lang, message, candidate, risk) };
  }
  return { candidate, risk };
}
