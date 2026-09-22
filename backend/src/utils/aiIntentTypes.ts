import type { SupportedLanguage } from './languageDetector';

export type BusinessIntent =
  | 'record_glucose'
  | 'create_reminder'
  | 'generate_meal_plan'
  | 'general_advice';

export type ExecutableIntent = Exclude<BusinessIntent, 'general_advice'>;
export type SpeechAct = 'execute' | 'query' | 'modify' | 'cancel' | 'confirm';

export interface IntentCandidate {
  intent: BusinessIntent;
  speechAct: SpeechAct;
  confidence: number;
  slots: Record<string, unknown>;
  missingSlots: string[];
  source: 'rule' | 'llm' | 'pending';
  reasons: string[];
}

export interface EmergencyAssessment {
  isEmergency: boolean;
  level: 'none' | 'warning' | 'critical';
  confidence: number;
  reasons: string[];
  glucose?: {
    value: number;
    unit: 'mg/dL' | 'mmol/L';
  };
}

export interface PendingIntentState {
  intent: ExecutableIntent;
  slots: Record<string, unknown>;
  missingSlots: string[];
  language: SupportedLanguage;
  createdAt: number;
}
