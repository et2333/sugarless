import type { EmergencyAssessment } from './aiIntentTypes';
import type { SupportedLanguage } from './languageDetector';
import { normalizeUserInput } from './inputNormalizer';

const criticalSymptoms = [
  /胸(?:口)?(?:剧烈)?(?:疼|痛)|呼吸(?:困难|急促)|无法呼吸|喘不上气|呼吸很困难|(?:意识|神志)(?:有点)?(?:不清|模糊)|失去意识|昏迷|昏倒|快(?:要)?昏倒|马上要昏倒|站不稳|抽搐|叫不醒|说话(?:已经)?不清楚|无法正常说话|持续呕吐/,
  /(?:crushing |severe )?chest pain|difficulty breathing|cannot breathe|can't breathe|trouble breathing|breathing (?:is )?(?:difficult|rapidly)|unconscious|unresponsive|lost consciousness|losing consciousness|lose consciousness|pass(?:ed)? out|may pass out|faint(?:ed|ing)?|seizure|seizing|will not wake up|cannot speak|can't speak|cannot form words|continuous(?:ly)? vomiting|keep vomiting|cannot stop vomiting/i,
];

const warningSymptoms = [
  /头晕|发抖|冒冷汗|心慌|乏力|恶心|呕吐|说话不清|全身无力/,
  /dizz(?:y|iness)|shak(?:e|ing)|sweat(?:ing)?|palpitation|very weak|severe weakness|nausea|vomit|confused|confusion|disoriented|cannot speak clearly/i,
];

const urgentHelpRequest = [
  /救命|紧急情况|叫救护车|请立即|立即就医|马上就医|需要马上就医|拨打?120/,
  /medical emergency|call 911|call (?:an )?ambulance|need (?:a )?doctor now|(?:help me|need help|help) now/i,
];

const emergencyDiagnosis = /酮症酸中毒|diabetic ketoacidosis|\bdka\b/i;
const insulinOverdose = /过量胰岛素|胰岛素(?:打|注射|用)(?:多|过量)|too much insulin|insulin overdose/i;
const qualitativeCriticalGlucose = /血糖(?:显示)?\s*(?:lo\b|hi\b|极低|极高|特别高|非常高)|(?:glucose|blood sugar|sugar|meter|reading)(?: is| says| reads)?\s*(?:lo\b|hi\b|extremely low|extremely high)/i;
const educationalContext = /^(?:什么|为何|为什么|如何|怎样|怎么|哪些|多少|何时|什么时候|请解释|请介绍|能否|是否|如果有人|家属.*(?:学习|应该)|what|why|how|when|which|can you explain|could you explain|tell me about)|(?:为什么.*(?:有关|相关)|是什么|有哪些|有什么关系|意味着什么|会怎样|急救常识|处理原则|预警表现|warning signs|first-aid principles|associated with|relationship between)/i;
const currentPersonContext = /(?:我|本人|患者现在|病人现在|他现在|她现在|孩子现在|老人现在|家人现在)|\b(?:i|i'm|i am|my|patient is|he is|she is|they are)\b/i;
const acuteTemporalContext = /现在|刚刚|正在|已经|开始|越来越|持续|马上|快要|(?:打完|注射|用了?)(?:胰岛素|药)(?:以后|之后|后)|right now|currently|just |now\b|starting|getting worse|keep |cannot|can't|will not|feel like|after (?:taking|using|injecting) insulin|may (?:pass out|lose consciousness)/i;

function extractGlucose(message: string): EmergencyAssessment['glucose'] | undefined {
  const explicitUnit = message.match(/(?:血糖|blood (?:sugar|glucose)|glucose|bg|sugar|reading)[^\d]{0,24}(\d+(?:\.\d+)?)\s*(mmol\/L|mg\/dL)/i)
    || message.match(/(\d+(?:\.\d+)?)\s*(mmol\/L|mg\/dL)(?:[^。.!?]{0,20}(?:血糖|blood (?:sugar|glucose)|glucose|bg|sugar|reading))?/i);
  if (explicitUnit) {
    return {
      value: Number(explicitUnit[1]),
      unit: explicitUnit[2].toLowerCase().startsWith('mmol') ? 'mmol/L' : 'mg/dL',
    };
  }

  const contextual = message.match(/(?:血糖|blood (?:sugar|glucose)|glucose|bg|sugar|reading)[^\d]{0,24}(\d+(?:\.\d+)?)/i);
  if (!contextual) return undefined;
  const value = Number(contextual[1]);
  return { value, unit: value <= 35 ? 'mmol/L' : 'mg/dL' };
}

export function assessEmergency(
  rawMessage: string,
  _language?: SupportedLanguage,
): EmergencyAssessment {
  const message = normalizeUserInput(rawMessage);
  const glucose = extractGlucose(message);
  const reasons: string[] = [];
  const hasCriticalSymptom = criticalSymptoms.some((pattern) => pattern.test(message));
  const hasWarningSymptom = warningSymptoms.some((pattern) => pattern.test(message));
  const hasUrgentHelpRequest = urgentHelpRequest.some((pattern) => pattern.test(message));
  const isEducational = educationalContext.test(message);
  const hasCurrentPersonContext = currentPersonContext.test(message);
  const hasAcuteTemporalContext = acuteTemporalContext.test(message);
  const hasEmergencyDiagnosis = emergencyDiagnosis.test(message);
  const hasInsulinOverdose = insulinOverdose.test(message);
  const hasQualitativeCriticalGlucose = qualitativeCriticalGlucose.test(message);

  if (hasCriticalSymptom) reasons.push('critical_symptom');
  if (hasWarningSymptom) reasons.push('warning_symptom');
  if (hasUrgentHelpRequest) reasons.push('explicit_emergency_request');
  if (hasEmergencyDiagnosis) reasons.push('emergency_diagnosis');
  if (hasInsulinOverdose) reasons.push('insulin_overdose');
  if (hasQualitativeCriticalGlucose) reasons.push('qualitative_critical_glucose');

  let extremeGlucose = false;
  let abnormalGlucose = false;
  if (glucose) {
    extremeGlucose = glucose.unit === 'mmol/L'
      ? glucose.value <= 3 || glucose.value >= 20
      : glucose.value <= 54 || glucose.value >= 360;
    abnormalGlucose = glucose.unit === 'mmol/L'
      ? glucose.value < 3.9 || glucose.value > 13.9
      : glucose.value < 70 || glucose.value > 250;
    if (extremeGlucose) reasons.push('critical_glucose_value');
    else if (abnormalGlucose) reasons.push('abnormal_glucose_value');
  }

  // A generic educational question may mention critical symptoms or thresholds without
  // describing an active patient. Keep it out of the hard emergency path.
  const clearlyAnalyticalQuestion = /为什么.*(?:有关|相关)|why .* (?:associated|related)/i.test(message);
  if (isEducational
    && !hasUrgentHelpRequest
    && (!hasAcuteTemporalContext || (clearlyAnalyticalQuestion && !hasCurrentPersonContext))) {
    return { isEmergency: false, level: abnormalGlucose ? 'warning' : 'none', confidence: 0.85, reasons, glucose };
  }

  const activePatient = hasCurrentPersonContext || hasAcuteTemporalContext;
  const isEmergency = (hasUrgentHelpRequest && !isEducational)
    || (hasCriticalSymptom && activePatient)
    || extremeGlucose
    || (hasQualitativeCriticalGlucose && hasCriticalSymptom)
    || (hasQualitativeCriticalGlucose && activePatient)
    || (hasEmergencyDiagnosis && activePatient)
    || (hasInsulinOverdose && (hasWarningSymptom || activePatient))
    || (abnormalGlucose && hasWarningSymptom && activePatient);

  if (isEmergency) {
    const confidence = hasCriticalSymptom && (extremeGlucose || hasUrgentHelpRequest || hasInsulinOverdose) ? 0.99 : 0.96;
    return { isEmergency: true, level: 'critical', confidence, reasons, glucose };
  }

  return {
    isEmergency: false,
    level: abnormalGlucose || hasWarningSymptom ? 'warning' : 'none',
    confidence: reasons.length > 0 ? 0.8 : 0.95,
    reasons,
    glucose,
  };
}
