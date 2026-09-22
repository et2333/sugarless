import { structuredIntentResponseSchema } from './aiActionSchemas';

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini response did not contain a JSON object');
  return JSON.parse(match[0]);
}

function normalizeLegacyPayload(raw: any) {
  if (raw?.intent) return raw;
  const actionType = raw?.action?.type;
  const supported = ['record_glucose', 'create_reminder', 'generate_meal_plan', 'emergency_alert'];
  return {
    response: typeof raw?.response === 'string' ? raw.response : 'OK',
    intent: supported.includes(actionType) ? actionType : 'general_advice',
    speechAct: supported.includes(actionType) ? 'execute' : 'query',
    confidence: supported.includes(actionType) ? 0.8 : 0.7,
    slots: raw?.action?.data && typeof raw.action.data === 'object' ? raw.action.data : {},
    missingSlots: [],
    suggestions: Array.isArray(raw?.suggestions) ? raw.suggestions : [],
  };
}

export function parseStructuredIntentResponse(text: string) {
  return structuredIntentResponseSchema.parse(normalizeLegacyPayload(extractJson(text)));
}
