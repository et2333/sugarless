import assert from 'node:assert/strict';
import { finalizeIntentCandidate, preRouteIntent } from '../../src/services/ai/intentOrchestrator';
import { assessEmergency } from '../../src/utils/riskDetector';
import { classifyRuleIntent } from '../../src/utils/intentRouter';
import { parseStructuredIntentResponse } from '../../src/utils/llmIntentParser';
import { setPendingIntent } from '../../src/utils/pendingIntentStore';

function actionType(message: string, userId: string): string | null {
  const routed = preRouteIntent(message, userId, /[\u4e00-\u9fff]/.test(message) ? 'zh' : 'en');
  return routed.result?.action?.type || routed.candidate?.intent || null;
}

// Risk detection is independent from business actions and always takes priority.
assert.equal(assessEmergency('帮我记录血糖2.3 mmol/L，我站不稳了', 'zh').isEmergency, true);
assert.equal(assessEmergency('Record glucose 420 mg/dL, I keep vomiting', 'en').isEmergency, true);
assert.equal(assessEmergency('血糖极低，我意识模糊了', 'zh').isEmergency, true);
assert.equal(assessEmergency('每天晚上提醒我打胰岛素', 'zh').isEmergency, false);
assert.equal(assessEmergency('请问血糖低于3会怎样', 'zh').isEmergency, false);
assert.equal(assessEmergency('什么是低血糖导致的意识模糊？', 'zh').isEmergency, false);
assert.equal(assessEmergency('What warning signs are associated with diabetic ketoacidosis?', 'en').isEmergency, false);
assert.equal(assessEmergency('My child is seizing and will not wake up', 'en').isEmergency, true);

// Action requests and informational questions are separated.
assert.equal(classifyRuleIntent('给我生成七天控糖餐单')?.intent, 'generate_meal_plan');
assert.equal(classifyRuleIntent('介绍一下七天控糖餐单通常包含什么')?.intent, 'general_advice');
assert.equal(classifyRuleIntent('Could you add my fasting glucose, 98 mg/dL?')?.intent, 'record_glucose');
assert.equal(classifyRuleIntent('Can you explain what fasting glucose means?')?.intent, 'general_advice');

// Missing slots are retained for the next turn and completed without a model call.
const reminderUser = 'orchestrator-reminder-user';
const firstReminder = preRouteIntent('提醒我吃药', reminderUser, 'zh').result;
assert.equal(firstReminder?.requiresClarification, true);
assert.deepEqual(firstReminder?.missingSlots, ['scheduleTime']);
const completedReminder = preRouteIntent('晚上八点四十五', reminderUser, 'zh').result;
assert.equal(completedReminder?.action?.type, 'create_reminder');
assert.equal(completedReminder?.action?.data.scheduleTime, '20:45');

const glucoseUser = 'orchestrator-glucose-user';
assert.equal(preRouteIntent('帮我记录血糖', glucoseUser, 'zh').result?.requiresClarification, true);
const completedGlucose = preRouteIntent('7.2 mmol/L', glucoseUser, 'zh').result;
assert.equal(completedGlucose?.action?.type, 'record_glucose');
assert.equal(completedGlucose?.action?.data.value, 7.2);

const medicationUser = 'orchestrator-medication-user';
setPendingIntent(medicationUser, {
  intent: 'create_reminder',
  slots: {
    title: 'Medication Reminder', message: 'Please take medication on time', scheduleTime: '20:00',
    type: 'medication', scheduleType: 'daily', medication_name: '', dosage: '', meal_timing: '',
  },
  missingSlots: ['medication_name'], language: 'zh', createdAt: Date.now(),
});
const completedMedication = preRouteIntent('达格列净', medicationUser, 'zh').result;
assert.equal(completedMedication?.action?.type, 'create_reminder');
assert.equal(completedMedication?.action?.data.medication_name, '达格列净');

const cancelledUser = 'orchestrator-cancel-user';
preRouteIntent('提醒我吃药', cancelledUser, 'zh');
assert.equal(preRouteIntent('取消', cancelledUser, 'zh').result?.response, '已取消本次操作。');

// A standalone modify/cancel utterance must never be misrouted as creation.
assert.equal(preRouteIntent('取消每天八点的吃药提醒', 'cancel-safe', 'zh').result?.action, undefined);
assert.equal(finalizeIntentCandidate('llm-modify-safe', 'zh', '把提醒改成九点', {
  intent: 'create_reminder', speechAct: 'modify', confidence: 0.9, slots: { scheduleTime: '09:00' },
  missingSlots: [], source: 'llm', reasons: ['test'],
}).action, undefined);
assert.equal(actionType('晚饭后量到8.1，帮我记到血糖记录', 'glucose-route'), 'record_glucose');

// LLM-declared optional slots must not trigger unnecessary clarification.
const optionalMealSlot = finalizeIntentCandidate('optional-meal-slot', 'en', 'Build a 3-day high-fiber menu', {
  intent: 'generate_meal_plan', speechAct: 'execute', confidence: 0.95, slots: { days: 3 },
  missingSlots: ['preferences'], source: 'llm', reasons: ['test'],
});
assert.equal(optionalMealSlot.action?.type, 'generate_meal_plan');
const optionalGlucoseSlot = finalizeIntentCandidate('optional-glucose-slot', 'en', 'Log glucose 6.5 mmol/L', {
  intent: 'record_glucose', speechAct: 'execute', confidence: 0.95, slots: { value: 6.5, unit: 'mmol/L', type: 'random' },
  missingSlots: ['measurementTime'], source: 'llm', reasons: ['test'],
});
assert.equal(optionalGlucoseSlot.action?.type, 'record_glucose');

const structured = parseStructuredIntentResponse('```json\n{"response":"Ready","intent":"generate_meal_plan","speechAct":"execute","confidence":0.91,"slots":{"days":3},"missingSlots":[],"suggestions":[]}\n```');
assert.equal(structured.intent, 'generate_meal_plan');
assert.equal(structured.slots.days, 3);
const legacy = parseStructuredIntentResponse('{"response":"Ready","action":{"type":"record_glucose","data":{"value":6.2,"unit":"mmol/L"}}}');
assert.equal(legacy.intent, 'record_glucose');
assert.throws(() => parseStructuredIntentResponse('not json'));

console.log('Intent orchestrator safety, arbitration, and multi-turn tests passed');
