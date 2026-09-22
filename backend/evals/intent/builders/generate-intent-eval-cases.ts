/**
 * 生成 intent-eval-cases.json（120 条标准话术）
 * 用法: npm run eval:intent:generate
 */
import fs from 'fs';
import path from 'path';

interface EvalCase {
  id: string;
  category: string;
  input: string;
  expectedIntent: string;
  expectedFields?: Record<string, string | number>;
  note?: string;
}

const cases: EvalCase[] = [];

type CaseDefinition = [
  category: string,
  input: string,
  expectedIntent: string,
  expectedFields?: Record<string, string | number>,
  note?: string,
];

function add(
  prefix: string,
  idx: number,
  category: string,
  input: string,
  expectedIntent: string,
  expectedFields?: Record<string, string | number>,
  note?: string
) {
  cases.push({
    id: `${prefix}-${String(idx).padStart(2, '0')}`,
    category,
    input,
    expectedIntent,
    ...(expectedFields ? { expectedFields } : {}),
    ...(note ? { note } : {}),
  });
}

// record_glucose × 26
const glucoseCases: CaseDefinition[] = [
  ['record_glucose', "Can you record my fasting blood sugar? It's 110 mg/dL", 'record_glucose', { type: 'fasting', valueMin: 100, valueMax: 120 }],
  ['record_glucose', 'Record my post-meal blood sugar 7.2 mmol/L', 'record_glucose', { type: 'post_prandial', valueMin: 7, valueMax: 8 }],
  ['record_glucose', '帮我记录空腹血糖110', 'record_glucose', { type: 'fasting', valueMin: 100, valueMax: 120 }],
  ['record_glucose', '记录我的随机血糖145 mg/dL', 'record_glucose', { type: 'random', valueMin: 140, valueMax: 150 }],
  ['record_glucose', 'My blood sugar is 95, no discomfort', 'record_glucose', { valueMin: 90, valueMax: 100 }],
  ['record_glucose', 'Log my bedtime glucose reading: 118 mg/dL', 'record_glucose', { valueMin: 115, valueMax: 120 }],
  ['record_glucose', 'Please record fasting glucose 92 mg/dL', 'record_glucose', { type: 'fasting', valueMin: 90, valueMax: 95 }],
  ['record_glucose', '记录餐后2小时血糖8.5', 'record_glucose', { type: 'post_prandial', valueMin: 8, valueMax: 9 }],
  ['record_glucose', 'Track my blood sugar: 102 mg/dL fasting', 'record_glucose', { type: 'fasting', valueMin: 100, valueMax: 105 }],
  ['record_glucose', 'My random blood sugar is 130 mg/dL, please save it', 'record_glucose', { type: 'random', valueMin: 125, valueMax: 135 }],
  ['record_glucose', '空腹血糖92，帮我记一下', 'record_glucose', { type: 'fasting', valueMin: 90, valueMax: 95 }],
  ['record_glucose', 'Record glucose 6.1 mmol/L before breakfast', 'record_glucose', { type: 'fasting', valueMin: 6, valueMax: 6.5 }],
  ['record_glucose', 'Post-lunch sugar level is 165 mg/dL, please record', 'record_glucose', { type: 'post_prandial', valueMin: 160, valueMax: 170 }],
  ['record_glucose', '睡前血糖7.8 mmol/L，记录一下', 'record_glucose', { valueMin: 7.5, valueMax: 8 }],
  ['record_glucose', 'Blood sugar reading after dinner: 142', 'record_glucose', { type: 'post_prandial', valueMin: 140, valueMax: 145 }],
  ['record_glucose', 'Please log my glucose at 88 mg/dL', 'record_glucose', { valueMin: 85, valueMax: 90 }],
  ['record_glucose', '随机测了血糖156 mg/dL', 'record_glucose', { type: 'random', valueMin: 150, valueMax: 160 }],
  ['record_glucose', 'My fasting BG is 105 mg/dL', 'record_glucose', { type: 'fasting', valueMin: 100, valueMax: 110 }],
  ['record_glucose', '记录午餐后血糖10.2 mmol/L', 'record_glucose', { type: 'post_prandial', valueMin: 10, valueMax: 11 }],
  ['record_glucose', 'Save blood sugar 97 mg/dL fasting', 'record_glucose', { type: 'fasting', valueMin: 95, valueMax: 100 }],
  ['record_glucose', 'Glucose check result: 7.0 mmol/L random', 'record_glucose', { type: 'random', valueMin: 6.5, valueMax: 7.5 }],
  ['record_glucose', '帮我录入血糖138', 'record_glucose', { valueMin: 135, valueMax: 140 }],
  ['record_glucose', 'I measured 112 mg/dL this morning fasting', 'record_glucose', { type: 'fasting', valueMin: 110, valueMax: 115 }],
  ['record_glucose', '餐后血糖165，麻烦记录', 'record_glucose', { type: 'post_prandial', valueMin: 160, valueMax: 170 }],
  ['record_glucose', 'Current blood glucose is 6.8 mmol/L, record it please', 'record_glucose', { valueMin: 6.5, valueMax: 7 }],
  ['record_glucose', 'Just tested: fasting glucose 101 mg/dL, please add it', 'record_glucose', { type: 'fasting', valueMin: 98, valueMax: 105 }],
];
glucoseCases.forEach((args, i) => add('glucose', i + 1, ...args));

// create_reminder × 26
const reminderCases: CaseDefinition[] = [
  ['create_reminder', 'Remind me to take Metformin at 8 AM daily', 'create_reminder', { scheduleTime: '08:00', scheduleType: 'daily' }],
  ['create_reminder', 'Set a reminder to check blood sugar at 7:30 PM', 'create_reminder', { scheduleTime: '19:30' }],
  ['create_reminder', '每天早上8点提醒我吃二甲双胍', 'create_reminder', { scheduleTime: '08:00', scheduleType: 'daily' }],
  ['create_reminder', 'Remind me to exercise at 6 PM every day', 'create_reminder', { scheduleTime: '18:00', scheduleType: 'daily' }],
  ['create_reminder', 'Remind me to take my medication at 9:00 tonight', 'create_reminder', { scheduleTime: '21:00' }],
  ['create_reminder', 'Create a daily reminder for insulin at 7:00 AM', 'create_reminder', { scheduleTime: '07:00', scheduleType: 'daily' }],
  ['create_reminder', '晚上9点半提醒测睡前血糖', 'create_reminder', { scheduleTime: '21:30' }],
  ['create_reminder', 'Set reminder: take pills at noon daily', 'create_reminder', { scheduleTime: '12:00', scheduleType: 'daily' }],
  ['create_reminder', 'Remind me to walk after dinner at 7 PM', 'create_reminder', { scheduleTime: '19:00', scheduleType: 'daily' }],
  ['create_reminder', '每天下午3点提醒我测血糖', 'create_reminder', { scheduleTime: '15:00', scheduleType: 'daily' }],
  ['create_reminder', 'Please remind me to inject insulin at 6:30 AM', 'create_reminder', { scheduleTime: '06:30', scheduleType: 'daily' }],
  ['create_reminder', 'Remind me once at 8 PM tonight to check glucose', 'create_reminder', { scheduleTime: '20:00', scheduleType: 'once' }],
  ['create_reminder', '设置提醒：每天12点吃药', 'create_reminder', { scheduleTime: '12:00', scheduleType: 'daily' }],
  ['create_reminder', 'Set a one-time reminder to take medicine at 10:00 AM', 'create_reminder', { scheduleTime: '10:00', scheduleType: 'once' }],
  ['create_reminder', 'Remind me about blood sugar check at 6:45 AM every day', 'create_reminder', { scheduleTime: '06:45', scheduleType: 'daily' }],
  ['create_reminder', '提醒我晚上8点运动', 'create_reminder', { scheduleTime: '20:00' }],
  ['create_reminder', 'Create reminder for medication at 9 AM daily', 'create_reminder', { scheduleTime: '09:00', scheduleType: 'daily' }],
  ['create_reminder', 'Remind me to test glucose before breakfast at 6 AM', 'create_reminder', { scheduleTime: '06:00', scheduleType: 'daily' }],
  ['create_reminder', '下午5点提醒我吃二甲双胍', 'create_reminder', { scheduleTime: '17:00' }],
  ['create_reminder', 'Set daily alert for metformin at 8:00 PM', 'create_reminder', { scheduleTime: '20:00', scheduleType: 'daily' }],
  ['create_reminder', 'Remind me to take vitamins at 8 AM daily', 'create_reminder', { scheduleTime: '08:00', scheduleType: 'daily' }],
  ['create_reminder', '帮我设置提醒：每天7点测空腹血糖', 'create_reminder', { scheduleTime: '07:00', scheduleType: 'daily' }],
  ['create_reminder', 'Schedule reminder to exercise at 5:30 PM daily', 'create_reminder', { scheduleTime: '17:30', scheduleType: 'daily' }],
  ['create_reminder', 'Remind me to check ketones at 10 PM tonight', 'create_reminder', { scheduleTime: '22:00' }],
  ['create_reminder', '每天中午11点半提醒午餐前测血糖', 'create_reminder', { scheduleTime: '11:30', scheduleType: 'daily' }],
  ['create_reminder', 'Add a daily reminder to drink water at 10 AM', 'create_reminder', { scheduleTime: '10:00', scheduleType: 'daily' }],
];
reminderCases.forEach((args, i) => add('reminder', i + 1, ...args));

// general_advice × 32（避免易误触发 meal_plan 的表述）
const adviceCases: CaseDefinition[] = [
  ['general_advice', 'What is the normal blood sugar range?', 'general_advice'],
  ['general_advice', '血糖正常范围是多少？', 'general_advice'],
  ['general_advice', 'Give me exercise advice for diabetes', 'general_advice'],
  ['general_advice', 'Analyze my blood sugar trend', 'general_advice'],
  ['general_advice', 'What is HbA1c and why does it matter?', 'general_advice'],
  ['general_advice', '二甲双胍有什么副作用？', 'general_advice'],
  ['general_advice', 'How does insulin work in the body?', 'general_advice'],
  ['general_advice', 'What are symptoms of hypoglycemia?', 'general_advice'],
  ['general_advice', '糖尿病患者可以吃水果吗？', 'general_advice'],
  ['general_advice', 'Explain the difference between Type 1 and Type 2 diabetes', 'general_advice'],
  ['general_advice', 'How often should I check my blood sugar?', 'general_advice'],
  ['general_advice', '什么是糖化血红蛋白？', 'general_advice'],
  ['general_advice', 'Tips for managing diabetes at work', 'general_advice'],
  ['general_advice', 'How to prevent diabetic foot problems?', 'general_advice'],
  ['general_advice', '运动对血糖有什么影响？', 'general_advice'],
  ['general_advice', 'What foods should diabetics avoid?', 'general_advice'],
  ['general_advice', 'How to read a nutrition label for sugar content', 'general_advice'],
  ['general_advice', '低血糖时应该怎么办？', 'general_advice'],
  ['general_advice', 'Why is fiber important for blood sugar control?', 'general_advice'],
  ['general_advice', 'Can stress affect blood glucose levels?', 'general_advice'],
  ['general_advice', '胰岛素的储存方法是什么？', 'general_advice'],
  ['general_advice', 'What is the dawn phenomenon?', 'general_advice'],
  ['general_advice', 'How to travel safely with diabetes', 'general_advice'],
  ['general_advice', '睡前血糖高是什么原因？', 'general_advice'],
  ['general_advice', 'Explain carbs counting basics', 'general_advice'],
  ['general_advice', 'What is continuous glucose monitoring?', 'general_advice'],
  ['general_advice', '如何与医生沟通调整用药？', 'general_advice'],
  ['general_advice', 'Difference between fasting and random glucose tests', 'general_advice'],
  ['general_advice', 'How much water should a diabetic drink daily?', 'general_advice'],
  ['general_advice', '长期高血糖会有什么并发症？', 'general_advice'],
  ['general_advice', 'What is the glycemic index?', 'general_advice'],
  ['general_advice', '胰岛素泵如何使用？', 'general_advice'],
];
adviceCases.forEach((args, i) => add('advice', i + 1, ...args));

// generate_meal_plan × 12
const mealPlanCases: CaseDefinition[] = [
  ['generate_meal_plan', 'Generate a meal plan for me for the next 7 days', 'generate_meal_plan'],
  ['generate_meal_plan', '帮我生成本周低糖餐单', 'generate_meal_plan'],
  ['generate_meal_plan', 'Create a diabetic-friendly meal plan for this week', 'generate_meal_plan'],
  ['generate_meal_plan', '请为我制定3天的糖尿病膳食计划', 'generate_meal_plan'],
  ['generate_meal_plan', 'Plan my meals for tomorrow with low carb options', 'generate_meal_plan'],
  ['generate_meal_plan', '生成一份适合糖尿病的一日三餐计划', 'generate_meal_plan'],
  ['generate_meal_plan', 'I need a weekly meal plan for type 2 diabetes', 'generate_meal_plan'],
  ['generate_meal_plan', '帮我安排这周的健康食谱', 'generate_meal_plan'],
  ['generate_meal_plan', 'Generate a 5-day low GI meal plan', 'generate_meal_plan'],
  ['generate_meal_plan', '制定低碳水化合物的一周餐单', 'generate_meal_plan'],
  ['generate_meal_plan', 'Can you create a personalized meal plan for my diabetes?', 'generate_meal_plan'],
  ['generate_meal_plan', '给我做一个控糖膳食计划，7天', 'generate_meal_plan'],
];
mealPlanCases.forEach((args, i) => add('meal', i + 1, ...args));

// emergency_alert × 17（对齐规则引擎关键词）
const emergencyCases: CaseDefinition[] = [
  ['emergency_alert', 'I have severe chest pain and difficulty breathing', 'emergency_alert'],
  ['emergency_alert', 'blood sugar below 2, I feel dizzy', 'emergency_alert'],
  ['emergency_alert', '我胸痛呼吸困难，快救命', 'emergency_alert'],
  ['emergency_alert', 'I lost consciousness', 'emergency_alert'],
  ['emergency_alert', '血糖低于2，严重低血糖', 'emergency_alert'],
  ['emergency_alert', 'severe hypoglycemia, blood sugar 2', 'emergency_alert'],
  ['emergency_alert', 'passed out and cannot wake up', 'emergency_alert'],
  ['emergency_alert', 'blood sugar below 3, shaking badly', 'emergency_alert'],
  ['emergency_alert', '酮症酸中毒，非常严重', 'emergency_alert'],
  ['emergency_alert', "call 911 I can't breathe", 'emergency_alert'],
  ['emergency_alert', 'diabetic ketoacidosis symptoms getting worse', 'emergency_alert'],
  ['emergency_alert', '血糖极低，我意识模糊了', 'emergency_alert'],
  ['emergency_alert', 'extreme pain in chest, need doctor now', 'emergency_alert'],
  ['emergency_alert', 'blood sugar over 25, medical emergency', 'emergency_alert'],
  ['emergency_alert', '持续呕吐无法进食，血糖很高', 'emergency_alert'],
  ['emergency_alert', 'blood sugar is below 2 mmol/L, I feel very weak', 'emergency_alert'],
  ['emergency_alert', '我快昏倒了，血糖1.8', 'emergency_alert'],
];
emergencyCases.forEach((args, i) => add('emergency', i + 1, ...args));

// 边界/负样本 × 7
const negativeCases: CaseDefinition[] = [
  ['general_advice', 'Remind me to take medicine at 8 AM', 'create_reminder', undefined, '应识别为提醒，不应误判为紧急'],
  ['general_advice', 'Help me set a reminder for blood sugar check at 7 AM', 'create_reminder', { scheduleTime: '07:00' }, '含 help 但不应触发紧急'],
  ['general_advice', 'Can you help me log my blood sugar at 100 mg/dL', 'record_glucose', { valueMin: 95, valueMax: 105 }, '含 help 但应识别为记录血糖'],
  ['general_advice', 'Set a reminder for medication at 8 PM daily', 'create_reminder', { scheduleTime: '20:00', scheduleType: 'daily' }, 'set 不应触发紧急'],
  ['general_advice', '帮我设置一个提醒，每天早上7点测血糖', 'create_reminder', { scheduleTime: '07:00', scheduleType: 'daily' }, '设置提醒不应触发紧急'],
  ['general_advice', 'Is oatmeal good for breakfast with diabetes?', 'general_advice', undefined, '咨询类，不应触发 generate_meal_plan'],
  ['general_advice', '低GI食物有哪些？', 'general_advice', undefined, '知识问答，不应触发 generate_meal_plan'],
];
negativeCases.forEach((args, i) => add('negative', i + 1, ...args));

if (cases.length !== 120) {
  throw new Error(`Expected 120 cases, got ${cases.length}`);
}

const outPath = path.resolve(__dirname, '..', 'datasets', 'historical', 'intent-eval-cases.json');
fs.writeFileSync(outPath, JSON.stringify(cases, null, 2) + '\n');
console.log(`Generated ${cases.length} cases → ${outPath}`);
