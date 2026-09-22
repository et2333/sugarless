import { z } from 'zod';

const scheduleTimeSchema = z.string().regex(
  /^(?:[01]\d|2[0-3]):[0-5]\d$/,
  'scheduleTime must use 24-hour HH:mm format',
);

const glucoseActionSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(['mg/dL', 'mmol/L']).default('mg/dL'),
  type: z.enum(['fasting', 'post_prandial', 'random', 'hba1c']).default('random'),
  measurementTime: z.string().datetime().optional(),
  notes: z.string().optional(),
}).superRefine((data, context) => {
  const inRange = data.unit === 'mmol/L'
    ? data.value >= 1 && data.value <= 35
    : data.value >= 20 && data.value <= 600;

  if (!inRange) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: `value is outside the supported ${data.unit} range`,
    });
  }
});

const reminderActionSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  scheduleTime: scheduleTimeSchema,
  type: z.enum(['medication', 'glucose_check', 'exercise', 'appointment']),
  scheduleType: z.enum(['once', 'daily', 'weekly']),
  medication_name: z.string().optional().default(''),
  dosage: z.string().optional().default(''),
  meal_timing: z.string().optional().default(''),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
});

const mealPlanActionSchema = z.object({
  days: z.number().int().min(1).max(30).default(7),
  preferences: z.string().optional().default(''),
});

const schemas = {
  record_glucose: glucoseActionSchema,
  create_reminder: reminderActionSchema,
  generate_meal_plan: mealPlanActionSchema,
};

export const structuredIntentResponseSchema = z.object({
  response: z.string().min(1),
  intent: z.enum(['record_glucose', 'create_reminder', 'generate_meal_plan', 'general_advice', 'emergency_alert']),
  speechAct: z.enum(['execute', 'query', 'modify', 'cancel', 'confirm']).default('execute'),
  confidence: z.number().min(0).max(1),
  slots: z.record(z.unknown()).default({}),
  missingSlots: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

export type ExecutableActionType = keyof typeof schemas;

export function validateActionData(type: string, data: unknown): Record<string, unknown> {
  const schema = schemas[type as ExecutableActionType];
  if (!schema) {
    throw new Error(`Unsupported executable action: ${type}`);
  }
  return schema.parse(data) as Record<string, unknown>;
}

export function safeValidateActionData(type: string, data: unknown) {
  const schema = schemas[type as ExecutableActionType];
  if (!schema) return { success: false as const, error: new Error(`Unsupported executable action: ${type}`) };
  return schema.safeParse(data);
}
