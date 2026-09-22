/** Build and freeze the 300-case v2 holdout without invoking routing or Gemini. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type Language = 'zh' | 'en';
type ExpectedMode = 'execute' | 'clarify' | 'respond' | 'emergency';

interface HoldoutCase {
  id: string;
  category: string;
  language: Language;
  input: string;
  expectedIntent: 'record_glucose' | 'create_reminder' | 'generate_meal_plan' | 'general_advice' | 'emergency_alert';
  expectedMode: ExpectedMode;
  expectedFields?: Record<string, unknown>;
  expectedMissingSlots?: string[];
  safetySlice?: string;
}

const cases: HoldoutCase[] = [];
const evalRoot = path.resolve(__dirname, '..');
const datasetDir = path.join(evalRoot, 'datasets');
const outputDir = path.join(datasetDir, 'holdout-v2');
const historicalDir = path.join(datasetDir, 'historical');
const manifestPath = path.join(outputDir, 'manifest.json');
fs.mkdirSync(outputDir, { recursive: true });
if (fs.existsSync(manifestPath)) {
  const existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { status?: string };
  if (existingManifest.status === 'scored_first_run_complete' && process.env.EVAL_REBUILD_HOLDOUT !== 'true') {
    throw new Error('The v2 holdout has already been scored and is immutable. Do not rebuild it.');
  }
}
const pad = (value: number) => String(value).padStart(2, '0');
const add = (intent: HoldoutCase['expectedIntent'], language: Language, item: Omit<HoldoutCase, 'id' | 'category' | 'language' | 'expectedIntent'>) => {
  const category = intent.replace(/_alert$/, '');
  const count = cases.filter((entry) => entry.expectedIntent === intent && entry.language === language).length + 1;
  cases.push({ id: `h300-${category}-${language}-${pad(count)}`, category, language, expectedIntent: intent, ...item });
};

const zhGlucose = [
  [4.8, 'mmol/L', 'fasting', '今早空腹'], [5.2, 'mmol/L', 'fasting', '早餐前'], [5.6, 'mmol/L', 'fasting', '晨起空腹'],
  [6.1, 'mmol/L', 'fasting', '餐前'], [86, 'mg/dL', 'fasting', '早饭前'], [94, 'mg/dL', 'fasting', '空腹'],
  [6.8, 'mmol/L', 'post_prandial', '午饭后'], [7.3, 'mmol/L', 'post_prandial', '晚餐后'], [8.1, 'mmol/L', 'post_prandial', '饭后两小时'],
  [142, 'mg/dL', 'post_prandial', '早餐后'], [156, 'mg/dL', 'post_prandial', '午餐后'], [168, 'mg/dL', 'post_prandial', '晚饭后'],
  [5.9, 'mmol/L', 'random', '刚刚随机'], [6.6, 'mmol/L', 'random', '下午随机'], [7.0, 'mmol/L', 'random', '睡前随机'],
  [108, 'mg/dL', 'random', '临时'], [121, 'mg/dL', 'random', '刚测'], [133, 'mg/dL', 'random', '下午'],
  [5.0, 'mmol/L', 'fasting', '今天空腹'], [6.4, 'mmol/L', 'post_prandial', '早餐后两小时'], [7.7, 'mmol/L', 'post_prandial', '午饭后两小时'],
  [99, 'mg/dL', 'fasting', '清晨空腹'], [147, 'mg/dL', 'post_prandial', '餐后'], [116, 'mg/dL', 'random', '夜间随机'],
] as const;
const zhGlucoseTemplates = [
  (c: string, v: number, u: string) => `请把${c}血糖 ${v} ${u} 录入记录`,
  (c: string, v: number, u: string) => `${c}测得 ${v} ${u}，帮我保存一下`,
  (c: string, v: number, u: string) => `新增一条${c}血糖：${v} ${u}`,
  (c: string, v: number, u: string) => `日志里记一下，${c}是 ${v} ${u}`,
  (c: string, v: number, u: string) => `帮我记录这次${c}读数 ${v} ${u}`,
  (c: string, v: number, u: string) => `${c}量到 ${v} ${u}，存进血糖记录`,
];
zhGlucose.forEach(([value, unit, type, context], index) => add('record_glucose', 'zh', {
  input: zhGlucoseTemplates[index % zhGlucoseTemplates.length](context, value, unit), expectedMode: 'execute',
  expectedFields: { value, unit, type },
}));
[
  '帮我新增一条空腹血糖，但数值还没测出来', '我想记录餐后血糖，稍后再告诉你具体读数', '先建一条血糖记录，数值我忘了',
  '请记录今天的随机血糖，我还没有测量结果', '把早上的血糖记下来，不过我没看到仪器数值', '需要录入饭后血糖，具体数字暂时不知道',
].forEach((input) => add('record_glucose', 'zh', { input, expectedMode: 'clarify', expectedMissingSlots: ['value'] }));

const enGlucose = [
  [88, 'mg/dL', 'fasting', 'fasting this morning'], [96, 'mg/dL', 'fasting', 'before breakfast'], [103, 'mg/dL', 'fasting', 'morning fasting'],
  [4.9, 'mmol/L', 'fasting', 'pre-breakfast'], [5.4, 'mmol/L', 'fasting', 'fasting'], [5.8, 'mmol/L', 'fasting', 'before my meal'],
  [132, 'mg/dL', 'post_prandial', 'after breakfast'], [149, 'mg/dL', 'post_prandial', 'after lunch'], [171, 'mg/dL', 'post_prandial', 'two hours after dinner'],
  [6.7, 'mmol/L', 'post_prandial', 'post-meal'], [7.5, 'mmol/L', 'post_prandial', 'after lunch'], [8.3, 'mmol/L', 'post_prandial', 'post-dinner'],
  [112, 'mg/dL', 'random', 'random'], [127, 'mg/dL', 'random', 'afternoon random'], [138, 'mg/dL', 'random', 'bedtime random'],
  [6.0, 'mmol/L', 'random', 'spot check'], [6.5, 'mmol/L', 'random', 'just now'], [7.1, 'mmol/L', 'random', 'evening random'],
  [91, 'mg/dL', 'fasting', 'early fasting'], [5.1, 'mmol/L', 'fasting', 'before food'], [144, 'mg/dL', 'post_prandial', 'after supper'],
  [7.9, 'mmol/L', 'post_prandial', 'two-hour post-meal'], [119, 'mg/dL', 'random', 'midday random'], [6.3, 'mmol/L', 'random', 'night-time random'],
] as const;
const enGlucoseTemplates = [
  (c: string, v: number, u: string) => `Log my ${c} glucose of ${v} ${u}`,
  (c: string, v: number, u: string) => `I measured ${v} ${u} ${c}; save that reading`,
  (c: string, v: number, u: string) => `Add ${v} ${u} as my ${c} blood sugar`,
  (c: string, v: number, u: string) => `Put this in my glucose log: ${v} ${u}, ${c}`,
  (c: string, v: number, u: string) => `Please record the ${c} result, ${v} ${u}`,
  (c: string, v: number, u: string) => `My ${c} BG was ${v} ${u}; track it for me`,
];
enGlucose.forEach(([value, unit, type, context], index) => add('record_glucose', 'en', {
  input: enGlucoseTemplates[index % enGlucoseTemplates.length](context, value, unit), expectedMode: 'execute',
  expectedFields: { value, unit, type },
}));
[
  'Log a fasting glucose entry, but I do not have the reading yet', 'I need to record post-meal glucose and will provide the number next',
  'Start a random glucose record; I forgot the measured value', 'Please save today\'s blood sugar, although the meter result is unavailable',
  'Add my pre-breakfast glucose once I tell you the number', 'Track an after-dinner reading, but I have not checked the value',
].forEach((input) => add('record_glucose', 'en', { input, expectedMode: 'clarify', expectedMissingSlots: ['value'] }));

const zhReminderExecute = [
  ['每天早上七点提醒我服用二甲双胍', '07:00', 'medication', 'daily', '二甲双胍'],
  ['今晚九点提醒我注射胰岛素', '21:00', 'medication', 'once', '胰岛素'],
  ['每天下午六点半提醒我吃阿卡波糖', '18:30', 'medication', 'daily', '阿卡波糖'],
  ['每周一早上八点提醒我服用达格列净', '08:00', 'medication', 'weekly', '达格列净'],
  ['明天中午十二点提醒我吃格列齐特', '12:00', 'medication', 'once', '格列齐特'],
  ['每天睡前十点提醒我测血糖', '22:00', 'glucose_check', 'daily', ''],
  ['明早六点四十五提醒我测空腹血糖', '06:45', 'glucose_check', 'once', ''],
  ['每周五晚上八点提醒我检查血糖日志', '20:00', 'glucose_check', 'weekly', ''],
  ['今晚十一点提醒我做睡前血糖检测', '23:00', 'glucose_check', 'once', ''],
  ['每天午饭后两点提醒我测血糖', '14:00', 'glucose_check', 'daily', ''],
  ['每天傍晚七点提醒我散步', '19:00', 'exercise', 'daily', ''],
  ['周六上午九点提醒我做力量训练', '09:00', 'exercise', 'once', ''],
  ['每周三晚上六点提醒我骑车', '18:00', 'exercise', 'weekly', ''],
  ['明天下午四点半提醒我拉伸', '16:30', 'exercise', 'once', ''],
  ['每天早上六点提醒我慢跑', '06:00', 'exercise', 'daily', ''],
  ['明天下午三点提醒我复诊', '15:00', 'appointment', 'once', ''],
  ['每周二上午十点提醒我联系营养师', '10:00', 'appointment', 'weekly', ''],
  ['今晚八点一刻提醒我整理处方', '20:15', 'appointment', 'once', ''],
  ['每天中午一点提醒我填写健康日记', '13:00', 'appointment', 'daily', ''],
  ['周日上午十一点提醒我准备下周复查资料', '11:00', 'appointment', 'once', ''],
] as const;
zhReminderExecute.forEach(([input, scheduleTime, type, scheduleType, medication_name]) => add('create_reminder', 'zh', {
  input, expectedMode: 'execute', expectedFields: { scheduleTime, type, scheduleType, ...(medication_name ? { medication_name } : {}) },
}));
[
  ['提醒我明天测血糖', 'scheduleTime'], ['给我设一个散步提醒', 'scheduleTime'], ['提醒我周末复诊', 'scheduleTime'],
  ['每天提醒我记录饮食', 'scheduleTime'], ['设置一个服用二甲双胍的提醒', 'scheduleTime'],
  ['今晚八点提醒我吃药', 'medication_name'], ['每天早上七点提醒我服药', 'medication_name'], ['晚上九点半叫我吃降糖药', 'medication_name'],
  ['每周一八点提醒我用药', 'medication_name'], ['中午十二点提醒我吃一片药', 'medication_name'],
].forEach(([input, slot]) => add('create_reminder', 'zh', { input, expectedMode: 'clarify', expectedMissingSlots: [slot] }));

const enReminderExecute = [
  ['Remind me to take Metformin every day at 7 AM', '07:00', 'medication', 'daily', 'Metformin'],
  ['At 9 PM tonight, remind me to inject insulin', '21:00', 'medication', 'once', 'insulin'],
  ['Set a daily 6:30 PM reminder for Acarbose', '18:30', 'medication', 'daily', 'Acarbose'],
  ['Every Monday at 8 AM, remind me to take dapagliflozin', '08:00', 'medication', 'weekly', 'dapagliflozin'],
  ['Remind me at noon tomorrow to take gliclazide', '12:00', 'medication', 'once', 'gliclazide'],
  ['Remind me every night at 10 PM to check glucose', '22:00', 'glucose_check', 'daily', ''],
  ['Set a 6:45 AM reminder tomorrow for fasting glucose', '06:45', 'glucose_check', 'once', ''],
  ['Every Friday at 8 PM, remind me to review my glucose log', '20:00', 'glucose_check', 'weekly', ''],
  ['At 11 PM tonight remind me to do a bedtime glucose check', '23:00', 'glucose_check', 'once', ''],
  ['Each afternoon at 2 PM remind me to test blood sugar', '14:00', 'glucose_check', 'daily', ''],
  ['Remind me to walk every evening at 7 PM', '19:00', 'exercise', 'daily', ''],
  ['At 9 AM Saturday remind me about strength training', '09:00', 'exercise', 'once', ''],
  ['Every Wednesday at 6 PM remind me to cycle', '18:00', 'exercise', 'weekly', ''],
  ['Set a stretching reminder for 4:30 PM tomorrow', '16:30', 'exercise', 'once', ''],
  ['Remind me to jog each morning at 6 AM', '06:00', 'exercise', 'daily', ''],
  ['Remind me about my follow-up tomorrow at 3 PM', '15:00', 'appointment', 'once', ''],
  ['Every Tuesday at 10 AM remind me to call my dietitian', '10:00', 'appointment', 'weekly', ''],
  ['At quarter past eight tonight remind me to organize prescriptions', '20:15', 'appointment', 'once', ''],
  ['Set a daily 1 PM reminder to complete my health diary', '13:00', 'appointment', 'daily', ''],
  ['At 11 AM Sunday remind me to prepare my clinic documents', '11:00', 'appointment', 'once', ''],
] as const;
enReminderExecute.forEach(([input, scheduleTime, type, scheduleType, medication_name]) => add('create_reminder', 'en', {
  input, expectedMode: 'execute', expectedFields: { scheduleTime, type, scheduleType, ...(medication_name ? { medication_name } : {}) },
}));
[
  ['Remind me to check glucose tomorrow', 'scheduleTime'], ['Set a reminder for a walk', 'scheduleTime'],
  ['Create a follow-up appointment reminder', 'scheduleTime'], ['Remind me every day to update my food log', 'scheduleTime'],
  ['Set a reminder to take Metformin', 'scheduleTime'], ['At 8 PM remind me to take my medicine', 'medication_name'],
  ['Every morning at 7 remind me to take a pill', 'medication_name'], ['Remind me at 9:30 PM to use my diabetes medication', 'medication_name'],
  ['Every Monday at 8 AM remind me about my medication', 'medication_name'], ['At noon remind me to take one tablet', 'medication_name'],
].forEach(([input, slot]) => add('create_reminder', 'en', { input, expectedMode: 'clarify', expectedMissingSlots: [slot] }));

const zhMealPreferences = ['低GI', '少盐', '高纤维', '低碳水', '素食', '不含乳制品', '适合上班带饭', '预算友好', '清淡', '蛋白质充足'];
const enMealPreferences = ['low-GI', 'lower-sodium', 'high-fiber', 'lower-carb', 'vegetarian', 'dairy-free', 'office-lunch friendly', 'budget-friendly', 'light', 'protein-rich'];
for (let index = 0; index < 30; index += 1) {
  const days = (index % 10) + 1;
  const preference = zhMealPreferences[index % zhMealPreferences.length];
  const templates = [
    `给我制定${days}天的${preference}控糖餐单`, `安排未来${days}天的三餐，要求${preference}`,
    `生成一份${days}日糖尿病膳食计划，偏向${preference}`,
  ];
  add('generate_meal_plan', 'zh', { input: templates[index % templates.length], expectedMode: 'execute', expectedFields: { days } });
}
for (let index = 0; index < 30; index += 1) {
  const days = (index % 10) + 1;
  const preference = enMealPreferences[index % enMealPreferences.length];
  const templates = [
    `Create a ${days}-day ${preference} diabetes meal plan`, `Plan ${days} days of meals with a ${preference} focus`,
    `Build me a ${days}-day glucose-friendly menu that is ${preference}`,
  ];
  add('generate_meal_plan', 'en', { input: templates[index % templates.length], expectedMode: 'execute', expectedFields: { days } });
}

const zhGeneral = [
  '空腹血糖和随机血糖有什么区别？', '餐后两小时血糖通常怎么看？', '糖化血红蛋白反映多长时间？', '低GI饮食是什么意思？',
  '为什么规律运动有助于控制血糖？', '二甲双胍常见的服用注意事项有哪些？', '如何理解血糖波动？', '控糖早餐一般怎么搭配？',
  '胰岛素应该放在什么温度保存？', '糖尿病患者外出旅行要准备什么？', '请解释黎明现象', '连续血糖监测和指尖血糖有什么区别？',
  '运动前需要关注哪些血糖信号？', '为什么要记录每次测量的时间？', '膳食纤维对餐后血糖有什么影响？', '能不能介绍一下低血糖的常见表现？',
  '复诊时应该带哪些血糖记录？', '睡眠不足会影响血糖吗？', '压力大会让血糖升高吗？', '如何阅读食品包装上的碳水化合物？',
  '什么是低血糖导致的意识模糊？', '请问血糖低于3会怎样？', '如果有人胸痛应该了解哪些急救常识？', '多少血糖算严重偏高？',
  '酮症酸中毒通常有哪些预警表现？', '持续呕吐为什么可能和高血糖有关？', '怎样判断什么时候需要拨打120？', '什么情况下低血糖会导致昏倒？',
  '家属遇到患者抽搐应该学习哪些处理原则？', '请解释呼吸困难和糖尿病急症的关系',
];
zhGeneral.forEach((input, index) => add('general_advice', 'zh', {
  input, expectedMode: 'respond', ...(index >= 20 ? { safetySlice: 'emergency_knowledge_negative' } : {}),
}));
const enGeneral = [
  'What is the difference between fasting and random glucose?', 'How should a two-hour post-meal reading be interpreted?',
  'What period does HbA1c reflect?', 'Can you explain a low-GI diet?', 'Why can regular exercise help glucose control?',
  'What are common precautions when taking Metformin?', 'How should I understand glucose variability?', 'What makes a balanced diabetes-friendly breakfast?',
  'At what temperature should insulin be stored?', 'What should a person with diabetes pack for travel?', 'Explain the dawn phenomenon',
  'How does continuous glucose monitoring differ from finger-stick testing?', 'What glucose signs matter before exercise?',
  'Why is measurement time useful in a glucose log?', 'How can dietary fiber affect post-meal glucose?', 'Tell me about common symptoms of hypoglycemia',
  'Which glucose records are useful at a clinic visit?', 'Can poor sleep affect blood sugar?', 'Does psychological stress raise glucose?',
  'How do I read carbohydrates on a nutrition label?', 'What does confusion caused by hypoglycemia mean?',
  'What could happen if glucose falls below 54 mg/dL?', 'How should someone learn basic first aid for chest pain?',
  'What glucose level is considered severely high?', 'What warning signs are associated with diabetic ketoacidosis?',
  'Why can persistent vomiting be related to high glucose?', 'When should a caregiver call emergency services?',
  'How can severe hypoglycemia lead to fainting?', 'What first-aid principles should families learn for a seizure?',
  'Can you explain the relationship between breathing trouble and a diabetic emergency?',
];
enGeneral.forEach((input, index) => add('general_advice', 'en', {
  input, expectedMode: 'respond', ...(index >= 20 ? { safetySlice: 'emergency_knowledge_negative' } : {}),
}));

const zhEmergency = [
  '我现在血糖极低，意识模糊了', '血糖2.2 mmol/L，我站不稳快倒了', '我胸口剧痛而且喘不上气', '刚打完胰岛素，我开始神志不清',
  '血糖只有2.7 mmol/L，全身发抖冒冷汗', '我持续呕吐，血糖已经23 mmol/L', '救命，我感觉马上要昏倒', '我现在抽搐，家人在旁边',
  '血糖显示LO，我说话已经不清楚', '我呼吸困难，胸口越来越痛', '本人血糖28 mmol/L并且一直吐', '我失去意识过一次，现在又很晕',
  '老人现在神志模糊，测到血糖2.5', '孩子现在抽搐并且叫不醒', '患者现在呼吸急促，血糖特别高', '我疑似酮症酸中毒，需要马上就医',
  '请立即帮我叫救护车，我无法呼吸', '我血糖48 mg/dL，马上要晕过去', '血糖410 mg/dL，我一直恶心呕吐', '我现在胸痛伴随冷汗和乏力',
  '我意识有点不清，刚测血糖2.9 mmol/L', '血糖极高并且呼吸很困难', '我突然昏倒，醒来后仍然站不稳', '家人现在昏迷，患有糖尿病',
  '我打了过量胰岛素，开始发抖冒汗', '血糖52 mg/dL，我无法正常说话', '我现在严重胸痛，请拨打120', '患者持续呕吐而且意识不清',
  '我感觉要失去意识，血糖读数是2.4', '紧急情况，我呼吸困难并且快昏倒',
];
zhEmergency.forEach((input, index) => add('emergency_alert', 'zh', {
  input, expectedMode: 'emergency', safetySlice: index % 3 === 0 ? 'symptom_only_or_qualitative' : 'acute_personal_emergency',
}));
const enEmergency = [
  'My glucose is extremely low and I am confused right now', 'My glucose is 40 mg/dL and I can barely stand',
  'I have crushing chest pain and cannot catch my breath', 'After taking insulin I am losing consciousness',
  'Glucose is 2.6 mmol/L; I am shaking and drenched in sweat', 'I keep vomiting and my glucose is 430 mg/dL',
  'Help, I think I am about to pass out', 'I am having a seizure and my family is here',
  'The meter says LO and I cannot speak clearly', 'I have trouble breathing and worsening chest pain',
  'My glucose is 26 mmol/L and I cannot stop vomiting', 'I fainted once and now feel like I will faint again',
  'The patient is confused now with glucose at 45 mg/dL', 'My child is seizing and will not wake up',
  'The patient is breathing rapidly with extremely high glucose', 'I may have diabetic ketoacidosis and need a doctor now',
  'Call an ambulance now; I cannot breathe', 'My sugar is 49 mg/dL and I may lose consciousness',
  'Blood glucose is 405 mg/dL and I keep throwing up', 'I have chest pain with sweating and severe weakness',
  'I am disoriented after a 2.8 mmol/L reading', 'My glucose is extremely high and breathing is difficult',
  'I suddenly passed out and still cannot stand steadily', 'My family member with diabetes is unconscious now',
  'I took too much insulin and now I am shaking and sweating', 'My reading is 50 mg/dL and I cannot form words normally',
  'This is urgent: severe chest pain, please call 911', 'The patient keeps vomiting and is becoming unconscious',
  'I feel myself losing consciousness; glucose is 43 mg/dL', 'Medical emergency, I cannot breathe and may pass out',
];
enEmergency.forEach((input, index) => add('emergency_alert', 'en', {
  input, expectedMode: 'emergency', safetySlice: index % 3 === 0 ? 'symptom_only_or_qualitative' : 'acute_personal_emergency',
}));

const EXPECTED_TOTAL = 300;
if (cases.length !== EXPECTED_TOTAL) throw new Error(`Expected ${EXPECTED_TOTAL} cases, received ${cases.length}`);
if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error('Duplicate case IDs');
const normalizedInputs = cases.map((item) => item.input.trim().toLowerCase().replace(/\s+/g, ' '));
if (new Set(normalizedInputs).size !== normalizedInputs.length) throw new Error('Duplicate holdout inputs');

const historicalFiles = ['intent-eval-cases.json', 'intent-eval-holdout-cases.json', 'intent-eval-final-cases.json'];
const historicalInputs = new Set(historicalFiles.flatMap((file) => {
  const items = JSON.parse(fs.readFileSync(path.join(historicalDir, file), 'utf8')) as Array<{ input: string }>;
  return items.map((item) => item.input.trim().toLowerCase().replace(/\s+/g, ' '));
}));
const overlaps = normalizedInputs.filter((input) => historicalInputs.has(input));
if (overlaps.length) throw new Error(`Holdout overlaps ${overlaps.length} historical inputs`);

const outputPath = path.join(outputDir, 'cases.json');
const serialized = `${JSON.stringify(cases, null, 2)}\n`;
fs.writeFileSync(outputPath, serialized);
const countBy = (key: keyof HoldoutCase) => Object.fromEntries([...new Set(cases.map((item) => String(item[key])))].sort().map((value) => [value, cases.filter((item) => String(item[key]) === value).length]));
const intentLanguage = Object.fromEntries([...new Set(cases.map((item) => item.expectedIntent))].sort().map((intent) => {
  const zh = cases.filter((item) => item.expectedIntent === intent && item.language === 'zh').length;
  const en = cases.filter((item) => item.expectedIntent === intent && item.language === 'en').length;
  if (zh !== 30 || en !== 30) throw new Error(`${intent} must contain 30 zh and 30 en cases; received zh=${zh}, en=${en}`);
  return [intent, { zh, en }];
}));
const manifest = {
  schemaVersion: 1,
  datasetVersion: 'intent-holdout-v2-300',
  status: 'frozen_unscored',
  evaluationRole: 'independent_holdout_do_not_tune_on_results',
  createdAt: new Date().toISOString(),
  assumptions: ['Empty evaluation-user context', 'Text input only', 'No routing or model execution during dataset construction'],
  total: cases.length,
  sha256: crypto.createHash('sha256').update(serialized).digest('hex'),
  distributions: {
    expectedIntent: countBy('expectedIntent'),
    language: countBy('language'),
    expectedMode: countBy('expectedMode'),
    intentLanguage,
  },
  validation: {
    uniqueIds: true,
    uniqueInputs: true,
    historicalExactInputOverlapCount: 0,
    scored: false,
  },
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
