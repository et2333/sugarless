/** AI health chat with safety-first hybrid intent routing. */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AssemblyAI } from 'assemblyai';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../utils/prisma';
import {
  detectEmergency as detectEmergencyMultilang,
  detectLanguage,
  getEmergencyResponse,
  getLanguageConfig,
  getQuickReplies,
  SupportedLanguage,
} from '../../utils/languageDetector';
import { getCachedContext, setCachedContext } from '../../utils/contextCache';
import { normalizeUserInput } from '../../utils/inputNormalizer';
import type { IntentCandidate } from '../../utils/aiIntentTypes';
import { parseStructuredIntentResponse } from '../../utils/llmIntentParser';
import { setPendingIntent } from '../../utils/pendingIntentStore';
import { finalizeIntentCandidate, preRouteIntent } from './intentOrchestrator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: { isAudio?: boolean; audioUrl?: string; healthData?: unknown };
}

export interface ChatContext {
  userId: string;
  userProfile?: any;
  recentGlucose?: any[];
  medications?: any[];
  chatHistory?: ChatMessage[];
}

export interface HealthQueryResult {
  response: string;
  action?: {
    type: 'record_glucose' | 'create_reminder' | 'generate_meal_plan' | 'emergency_alert';
    data?: any;
  };
  suggestions?: string[];
  intent?: string;
  confidence?: number;
  routingSource?: string;
  requiresClarification?: boolean;
  missingSlots?: string[];
  risk?: unknown;
  modelUsage?: ModelUsage;
}

export interface ModelUsage {
  provider: 'gemini';
  model: string;
  calls: number;
  responsesWithUsageMetadata: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  repairCalls: number;
}

class ChatService {
  private static model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  private static initializeModel() {
    if (this.model) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AppError('GEMINI_API_KEY未配置', 500, 'MISSING_GEMINI_API_KEY');
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 768,
        responseMimeType: 'application/json',
      },
    });
  }

  static async transcribeAudio(audioUrl: string, language?: string): Promise<string> {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new AppError('ASSEMBLYAI_API_KEY未配置', 500, 'MISSING_ASSEMBLYAI_API_KEY');
    try {
      const client = new AssemblyAI({ apiKey });
      const baseConfig = {
        audio_url: audioUrl,
        speaker_labels: true,
        word_boost: [
          '二甲双胍', '格列齐特', '阿卡波糖', '格列美脲', '胰岛素',
          'Metformin', 'Gliclazide', 'Acarbose', 'Glimepiride', 'Insulin',
        ],
        boost_param: 'high' as const,
      };
      const transcribe = async (autoDetect: boolean) => client.transcripts.transcribe({
        ...baseConfig,
        ...(autoDetect
          ? { language_detection: true }
          : { language_code: language === 'zh' ? 'zh' : 'en' }),
      });

      try {
        const transcript = await transcribe(false);
        if (transcript.status === 'error' || !transcript.text?.trim()) {
          throw new Error(transcript.error || 'empty transcription');
        }
        return transcript.text;
      } catch (preferredLanguageError) {
        if (process.env.VOICE_AUTO_LANGUAGE_FALLBACK !== 'true') throw preferredLanguageError;
        console.warn('指定语言转写失败，尝试自动语言检测:', preferredLanguageError);
        const transcript = await transcribe(true);
        if (transcript.status === 'error' || !transcript.text?.trim()) {
          throw new Error(transcript.error || 'automatic language detection failed');
        }
        return transcript.text;
      }
    } catch (error) {
      console.error('语音转文字失败:', error);
      throw new AppError('语音识别服务不可用', 500, 'TRANSCRIPTION_SERVICE_ERROR');
    }
  }

  private static async getUserContext(userId: string): Promise<ChatContext> {
    const cached = getCachedContext(userId);
    if (cached) return cached as ChatContext;
    try {
      const [profile, recentGlucose, medications] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.bloodSugarRecord.findMany({ where: { userId }, orderBy: { measurementTime: 'desc' }, take: 3 }),
        prisma.medication.findMany({ where: { userId, isActive: true } }),
      ]);
      const context = { userId, userProfile: profile, recentGlucose, medications };
      setCachedContext(userId, context);
      return context;
    } catch (error) {
      console.warn('获取用户上下文失败，继续无上下文识别:', error);
      return { userId };
    }
  }

  private static createStructuredPrompt(
    message: string,
    language: SupportedLanguage,
    context: ChatContext,
    ruleCandidate?: IntentCandidate,
  ): string {
    return `You are the intent and slot extraction layer of a diabetes-management application.
Return one JSON object only. Never claim that an action has already executed.

JSON schema:
{
  "response": "brief user-facing answer in ${language === 'zh' ? 'Chinese' : 'English'}",
  "intent": "record_glucose | create_reminder | generate_meal_plan | general_advice | emergency_alert",
  "speechAct": "execute | query | modify | cancel | confirm",
  "confidence": 0.0,
  "slots": {},
  "missingSlots": [],
  "suggestions": []
}

Classification rules:
- Choose an executable intent only when the user asks the system to perform that action.
- Explanations, definitions and questions about an action are general_advice.
- emergency_alert is only for a current or imminent medical emergency affecting the user or another present person. Educational questions that merely mention emergency symptoms are general_advice.
- record_glucose slots: value, unit (mg/dL or mmol/L), type (fasting, post_prandial, random, hba1c), optional measurementTime and notes.
- create_reminder slots: title, message, scheduleTime (HH:mm), type (medication, glucose_check, exercise, appointment), scheduleType (once, daily, weekly), optional medication_name, dosage, meal_timing and daysOfWeek.
- generate_meal_plan slots: days (1-30), preferences.
- List genuinely required but absent fields in missingSlots. Never invent values or times.
- If the rule candidate conflicts with the utterance, trust the utterance and explain through the classification fields.

User context: ${JSON.stringify({
      profile: context.userProfile ? { diabetesType: context.userProfile.diabetesType, hba1c: context.userProfile.hba1c } : null,
      recentGlucose: context.recentGlucose?.map((item) => ({
        value: item.value,
        unit: item.unit,
        type: item.type,
        measurementTime: item.measurementTime,
      })),
      medications: context.medications?.map((item) => ({ name: item.name, dosage: item.dosage })),
    })}
Rule candidate: ${JSON.stringify(ruleCandidate || null)}
User utterance: ${JSON.stringify(message)}`;
  }

  private static emptyModelUsage(): ModelUsage {
    return {
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      calls: 0,
      responsesWithUsageMetadata: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      repairCalls: 0,
    };
  }

  private static addResponseUsage(usage: ModelUsage, response: {
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  }): void {
    const metadata = response.usageMetadata;
    if (!metadata) return;
    usage.responsesWithUsageMetadata += 1;
    usage.promptTokens += metadata.promptTokenCount || 0;
    usage.completionTokens += metadata.candidatesTokenCount || 0;
    usage.totalTokens += metadata.totalTokenCount || 0;
  }

  private static async generateStructuredIntent(prompt: string) {
    if (!this.model) throw new Error('Gemini model is not initialized');
    const usage = this.emptyModelUsage();
    try {
      usage.calls += 1;
      const first = await this.model.generateContent(prompt);
      this.addResponseUsage(usage, first.response);
      const firstText = first.response.text();
      try {
        return { result: parseStructuredIntentResponse(firstText), usage };
      } catch (firstError) {
        const repairPrompt = `${prompt}\n\nThe previous output failed schema validation. Repair it and return JSON only. Previous output: ${JSON.stringify(firstText)}`;
        usage.calls += 1;
        usage.repairCalls += 1;
        const repaired = await this.model.generateContent(repairPrompt);
        this.addResponseUsage(usage, repaired.response);
        return { result: parseStructuredIntentResponse(repaired.response.text()), usage };
      }
    } catch (error) {
      (error as Error & { modelUsage?: ModelUsage }).modelUsage = usage;
      throw error;
    }
  }

  private static async completeMedicationReminder(
    result: HealthQueryResult,
    userId: string,
    language: SupportedLanguage,
  ): Promise<HealthQueryResult> {
    if (result.action?.type !== 'create_reminder' || result.action.data?.type !== 'medication' || result.action.data.medication_name) {
      return result;
    }

    let medications: Array<{ name: string; dosage: string }> = [];
    try {
      medications = await prisma.medication.findMany({
        where: { userId, isActive: true },
        select: { name: true, dosage: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    } catch (error) {
      console.warn('自动补全提醒药物失败，将向用户确认:', error);
    }

    if (medications.length === 1) {
      const medication = medications[0];
      return {
        ...result,
        action: {
          ...result.action,
          data: {
            ...result.action.data,
            medication_name: medication.name,
            dosage: result.action.data.dosage || medication.dosage,
            title: `Take ${medication.name}`,
            message: `Please take ${medication.name} on time`,
          },
        },
      };
    }

    const slots = { ...result.action.data };
    setPendingIntent(userId, {
      intent: 'create_reminder',
      slots,
      missingSlots: ['medication_name'],
      language,
      createdAt: Date.now(),
    });
    const choices = medications.map((item) => item.name).join('、');
    return {
      ...result,
      response: language === 'zh'
        ? (choices ? `请确认药物名称：${choices}` : '请告诉我需要提醒服用的药物名称。')
        : (choices ? `Which medication: ${medications.map((item) => item.name).join(', ')}?` : 'Which medication should I remind you to take?'),
      action: undefined,
      routingSource: 'clarification',
      requiresClarification: true,
      missingSlots: ['medication_name'],
    };
  }

  static async healthChat(rawMessage: string, userId: string): Promise<HealthQueryResult> {
    const message = normalizeUserInput(rawMessage);
    const language = detectLanguage(message);
    const preRoute = preRouteIntent(message, userId, language);
    if (preRoute.result) {
      const routed: HealthQueryResult = {
        response: preRoute.result.response,
        action: preRoute.result.action,
        suggestions: preRoute.result.suggestions,
        intent: preRoute.result.intent,
        confidence: preRoute.result.confidence,
        routingSource: preRoute.result.source,
        requiresClarification: preRoute.result.requiresClarification,
        missingSlots: preRoute.result.missingSlots,
        risk: preRoute.result.risk,
      };
      return this.completeMedicationReminder(routed, userId, language);
    }

    if (!process.env.GEMINI_API_KEY) {
      if (preRoute.candidate && preRoute.candidate.intent !== 'general_advice') {
        const routed = finalizeIntentCandidate(userId, language, message, preRoute.candidate, preRoute.risk);
        return this.completeMedicationReminder({ response: routed.response, action: routed.action, suggestions: routed.suggestions, intent: routed.intent, confidence: routed.confidence, routingSource: routed.source, requiresClarification: routed.requiresClarification, missingSlots: routed.missingSlots, risk: routed.risk }, userId, language);
      }
      return { ...this.generateFallbackResponse(message, language), intent: 'general_advice', confidence: 0.5, routingSource: 'fallback', risk: preRoute.risk };
    }

    try {
      this.initializeModel();
      const context = await this.getUserContext(userId);
      const { result: modelResult, usage: modelUsage } = await this.generateStructuredIntent(this.createStructuredPrompt(message, language, context, preRoute.candidate));
      if (modelResult.intent === 'emergency_alert') {
        const emergency = getEmergencyResponse(language);
        return {
          response: emergency.response,
          suggestions: emergency.suggestions,
          action: { type: 'emergency_alert', data: { level: 'critical', reasons: ['semantic_emergency_classification'] } },
          intent: 'emergency_alert',
          confidence: modelResult.confidence,
          routingSource: 'emergency',
          requiresClarification: false,
          missingSlots: [],
          risk: { isEmergency: true, level: 'critical', confidence: modelResult.confidence, reasons: ['semantic_emergency_classification'] },
          modelUsage,
        };
      }
      if (modelResult.intent === 'general_advice') {
        return {
          response: modelResult.response,
          suggestions: modelResult.suggestions,
          intent: modelResult.intent,
          confidence: modelResult.confidence,
          routingSource: 'llm',
          requiresClarification: false,
          missingSlots: [],
          risk: preRoute.risk,
          modelUsage,
        };
      }
      const candidate: IntentCandidate = {
        intent: modelResult.intent,
        speechAct: modelResult.speechAct,
        confidence: modelResult.confidence,
        slots: modelResult.slots,
        missingSlots: modelResult.missingSlots,
        source: 'llm',
        reasons: ['gemini_structured_classification'],
      };
      const routed = finalizeIntentCandidate(userId, language, message, candidate, preRoute.risk);
      return this.completeMedicationReminder({
        response: routed.response,
        action: routed.action,
        suggestions: modelResult.suggestions,
        intent: routed.intent,
        confidence: routed.confidence,
        routingSource: routed.source,
        requiresClarification: routed.requiresClarification,
        missingSlots: routed.missingSlots,
        risk: routed.risk,
        modelUsage,
      }, userId, language);
    } catch (error) {
      console.error('Gemini结构化意图识别失败:', error);
      const modelUsage = (error as Error & { modelUsage?: ModelUsage }).modelUsage;
      if (preRoute.candidate && preRoute.candidate.intent !== 'general_advice') {
        const routed = finalizeIntentCandidate(userId, language, message, preRoute.candidate, preRoute.risk);
        return this.completeMedicationReminder({ response: routed.response, action: routed.action, suggestions: routed.suggestions, intent: routed.intent, confidence: routed.confidence, routingSource: routed.source, requiresClarification: routed.requiresClarification, missingSlots: routed.missingSlots, risk: routed.risk, modelUsage }, userId, language);
      }
      return { ...this.generateFallbackResponse(message, language), intent: 'general_advice', confidence: 0.4, routingSource: 'fallback', risk: preRoute.risk, modelUsage };
    }
  }

  static async saveChatMessage(userId: string, role: 'user' | 'assistant', content: string, metadata?: unknown) {
    return { id: `${userId}-${Date.now()}`, role, content, timestamp: new Date(), metadata };
  }

  static async getChatHistory(_userId: string, _limit = 50): Promise<ChatMessage[]> {
    return [];
  }

  static generateFallbackResponse(message: string, language?: SupportedLanguage): HealthQueryResult {
    const lang = language || detectLanguage(message);
    const config = getLanguageConfig(lang);
    const lower = message.toLowerCase();
    if (/血糖|glucose|blood sugar/.test(lower)) return { response: config.fallbackResponses.bloodSugar, suggestions: getQuickReplies(lang).slice(0, 3) };
    if (/饮食|吃|食物|diet|eat|food/.test(lower)) return { response: config.fallbackResponses.diet, suggestions: getQuickReplies(lang).slice(1, 4) };
    if (/运动|锻炼|exercise|workout/.test(lower)) return { response: config.fallbackResponses.exercise, suggestions: getQuickReplies(lang).slice(2, 5) };
    return { response: config.fallbackResponses.default, suggestions: getQuickReplies(lang) };
  }

  static detectEmergency(message: string): boolean {
    return detectEmergencyMultilang(message);
  }

  static extractGlucoseValue(message: string): number | null {
    const match = normalizeUserInput(message).match(/(?:血糖|glucose|blood sugar).*?(\d+(?:\.\d+)?)/i);
    return match ? Number(match[1]) : null;
  }

  static getQuickReplies(language: SupportedLanguage = 'zh'): string[] {
    return getQuickReplies(language);
  }
}

export { ChatService };
