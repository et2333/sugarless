import assert from 'node:assert/strict';
import { tryRuleBasedIntent } from '../src/utils/intentRouter';
import { validateActionData } from '../src/utils/aiActionSchemas';
import { normalizeScheduleTime } from '../src/utils/actionNormalizer';
import { ChatService } from '../src/services/ai/chatService';
import { detectEmergency } from '../src/utils/languageDetector';

interface Case {
  input: string;
  type: 'record_glucose' | 'create_reminder' | 'generate_meal_plan' | null;
  fields?: Record<string, unknown>;
}

const cases: Case[] = [
  { input: 'Record my post-meal blood sugar 7.2 mmol/L', type: 'record_glucose', fields: { type: 'post_prandial', value: 7.2, unit: 'mmol/L' } },
  { input: '帮我记录空腹血糖110', type: 'record_glucose', fields: { type: 'fasting', value: 110, unit: 'mg/dL' } },
  { input: '记录我的随机血糖145 mg/dL', type: 'record_glucose', fields: { type: 'random', value: 145 } },
  { input: '记录餐后2小时血糖8.5', type: 'record_glucose', fields: { type: 'post_prandial', value: 8.5 } },
  { input: '睡前血糖7.8 mmol/L，记录一下', type: 'record_glucose', fields: { value: 7.8 } },
  { input: '随机测了血糖156 mg/dL', type: 'record_glucose', fields: { type: 'random', value: 156 } },
  { input: 'Glucose check result: 7.0 mmol/L random', type: 'record_glucose', fields: { type: 'random', value: 7 } },
  { input: 'My glucose check result was 6.4 mmol/L, please save it', type: 'record_glucose', fields: { value: 6.4 } },
  { input: 'Set a reminder to check blood sugar at 7:30 PM', type: 'create_reminder', fields: { scheduleTime: '19:30' } },
  { input: 'Remind me to take my medication at 9:00 tonight', type: 'create_reminder', fields: { scheduleTime: '21:00', scheduleType: 'once' } },
  { input: '晚上9点半提醒测睡前血糖', type: 'create_reminder', fields: { scheduleTime: '21:30' } },
  { input: '设置提醒：每天12点吃药', type: 'create_reminder', fields: { scheduleTime: '12:00', scheduleType: 'daily' } },
  { input: '下午5点提醒我吃二甲双胍', type: 'create_reminder', fields: { scheduleTime: '17:00', medication_name: '二甲双胍' } },
  { input: '帮我设置一个提醒，每天早上7点测血糖', type: 'create_reminder', fields: { scheduleTime: '07:00' } },
  { input: 'Set a one-time reminder to take medicine at 10:00 AM', type: 'create_reminder', fields: { scheduleTime: '10:00', scheduleType: 'once' } },
  { input: 'Set a daily reminder to walk at 6:15 PM', type: 'create_reminder', fields: { scheduleTime: '18:15', scheduleType: 'daily' } },
  { input: '生成一份适合糖尿病的一日三餐计划', type: 'generate_meal_plan', fields: { days: 1 } },
  { input: '制定低碳水化合物的一周餐单', type: 'generate_meal_plan', fields: { days: 7 } },
  { input: 'What is the normal blood sugar range?', type: null },
  { input: 'Is oatmeal good for breakfast with diabetes?', type: null },
  { input: 'What low GI foods can I eat?', type: null },
  { input: 'Could you add my pre-breakfast glucose, 98 mg/dL?', type: 'record_glucose', fields: { type: 'fasting', value: 98 } },
  { input: '睡觉前量了7.1，记录到血糖里', type: 'record_glucose', fields: { value: 7.1 } },
  { input: 'At quarter past six each evening, remind me to go for a walk', type: 'create_reminder', fields: { scheduleTime: '18:15' } },
  { input: '每天早晨六点半叫我测空腹血糖', type: 'create_reminder', fields: { scheduleTime: '06:30' } },
  { input: '明天下午两点提醒复诊', type: 'create_reminder', fields: { scheduleTime: '14:00', scheduleType: 'once' } },
  { input: '晚上十点一刻提醒我打胰岛素', type: 'create_reminder', fields: { scheduleTime: '22:15' } },
  { input: '按低GI原则安排未来五天的三餐', type: 'generate_meal_plan', fields: { days: 5 } },
  { input: 'Can you explain what a low-carb meal plan means?', type: null },
];

async function main() {
  for (const testCase of cases) {
    const result = tryRuleBasedIntent(testCase.input, /[\u4e00-\u9fff]/.test(testCase.input) ? 'zh' : 'en');
    assert.equal(result?.action.type ?? null, testCase.type, testCase.input);

    if (result && testCase.fields) {
      const validated = validateActionData(result.action.type, result.action.data);
      for (const [field, expected] of Object.entries(testCase.fields)) {
        assert.equal(validated[field], expected, `${testCase.input}: ${field}`);
      }
    }
  }

  assert.equal(normalizeScheduleTime('7:30', 'Set a reminder at 7:30 PM'), '19:30');
  assert.equal(normalizeScheduleTime('9:00', 'Remind me at 9:00 tonight'), '21:00');
  assert.equal(normalizeScheduleTime('7:00', '每天早上7点提醒我'), '07:00');

  const emergencyCases = [
    'My glucose is 2.4 mmol/L and I feel like I may pass out',
    '血糖只有2.3，我站不稳了',
    'I cannot breathe properly and have chest pain',
    '打完胰岛素后意识有点不清',
    'Blood glucose is above 25 and I keep vomiting',
  ];
  for (const input of emergencyCases) {
    assert.equal(detectEmergency(input), true, `emergency: ${input}`);
  }

  assert.throws(
    () => validateActionData('create_reminder', {
      title: 'Reminder',
      message: 'Take medication',
      scheduleTime: '25:90',
      type: 'medication',
      scheduleType: 'daily',
    }),
    /scheduleTime/,
  );

  assert.throws(
    () => validateActionData('record_glucose', {
      value: 80,
      unit: 'mmol/L',
      type: 'random',
    }),
    /supported mmol\/L range/,
  );

  const actionableCases = cases.filter((testCase) => testCase.type !== null);
  for (const testCase of actionableCases) {
    const result = await ChatService.healthChat(testCase.input, 'intent-regression-user');
    assert.equal(result.action?.type, testCase.type, `healthChat: ${testCase.input}`);
  }

  console.log(`Intent router regression: ${cases.length} route cases and ${actionableCases.length} healthChat cases passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
