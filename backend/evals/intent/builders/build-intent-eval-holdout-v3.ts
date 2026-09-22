/** Build and freeze the 300-case v3 holdout without invoking routing or Gemini. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type Language = 'zh' | 'en';
type ExpectedMode = 'execute' | 'clarify' | 'respond' | 'emergency';
type Intent = 'record_glucose' | 'create_reminder' | 'generate_meal_plan' | 'general_advice' | 'emergency_alert';

interface HoldoutCase {
  id: string;
  category: string;
  language: Language;
  input: string;
  expectedIntent: Intent;
  expectedMode: ExpectedMode;
  expectedFields?: Record<string, unknown>;
  expectedMissingSlots?: string[];
  safetySlice?: string;
}

const cases: HoldoutCase[] = [];
const evalRoot = path.resolve(__dirname, '..');
const datasetDir = path.join(evalRoot, 'datasets');
const outputDir = path.join(datasetDir, 'holdout-v3');
const outputPath = path.join(outputDir, 'cases.json');
const manifestPath = path.join(outputDir, 'manifest.json');
fs.mkdirSync(outputDir, { recursive: true });
if (fs.existsSync(manifestPath)) {
  const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { status?: string };
  if (existing.status === 'scored_first_run_complete' && process.env.EVAL_REBUILD_HOLDOUT !== 'true') {
    throw new Error('The v3 holdout has already been scored and is immutable.');
  }
}

const pad = (value: number) => String(value).padStart(2, '0');
const add = (intent: Intent, language: Language, item: Omit<HoldoutCase, 'id' | 'category' | 'language' | 'expectedIntent'>) => {
  const category = intent.replace(/_alert$/, '');
  const count = cases.filter((entry) => entry.expectedIntent === intent && entry.language === language).length + 1;
  cases.push({ id: `v3-${category}-${language}-${pad(count)}`, category, language, expectedIntent: intent, ...item });
};

const zhGlucose = [
  [4.6, 'mmol/L', 'fasting', '起床后还没吃东西'], [5.1, 'mmol/L', 'fasting', '早餐之前'], [97, 'mg/dL', 'fasting', '清晨未进食'],
  [5.7, 'mmol/L', 'fasting', '饭前'], [89, 'mg/dL', 'fasting', '晨间空腹'], [104, 'mg/dL', 'fasting', '午餐前'],
  [6.9, 'mmol/L', 'post_prandial', '早饭后'], [7.6, 'mmol/L', 'post_prandial', '吃完午饭两小时'], [151, 'mg/dL', 'post_prandial', '晚饭之后'],
  [139, 'mg/dL', 'post_prandial', '早餐后'], [8.4, 'mmol/L', 'post_prandial', '餐后两小时'], [162, 'mg/dL', 'post_prandial', '午饭后'],
  [6.2, 'mmol/L', 'random', '临时抽测'], [118, 'mg/dL', 'random', '下午随测'], [6.8, 'mmol/L', 'random', '睡觉前随机'],
  [125, 'mg/dL', 'random', '刚才随手测'], [7.2, 'mmol/L', 'random', '晚上随机'], [111, 'mg/dL', 'random', '非空腹'],
  [5.4, 'mmol/L', 'fasting', '吃早餐前'], [145, 'mg/dL', 'post_prandial', '用餐后'], [7.8, 'mmol/L', 'post_prandial', '晚餐结束两小时'],
  [101, 'mg/dL', 'fasting', '未吃早饭'], [131, 'mg/dL', 'random', '白天随机'], [6.4, 'mmol/L', 'random', '夜里随测'],
] as const;
const zhGlucoseTemplates = [
  (c: string, v: number, u: string) => `${c}测出来是${v}${u}，替我登记`,
  (c: string, v: number, u: string) => `血糖本里新增：${c}${v} ${u}`,
  (c: string, v: number, u: string) => `这次${c}的结果为${v} ${u}，请存档`,
  (c: string, v: number, u: string) => `把${v} ${u}作为${c}读数保存`,
  (c: string, v: number, u: string) => `刚量的${c}血糖是${v}${u}，记下来`,
  (c: string, v: number, u: string) => `录一笔血糖：${c}，${v} ${u}`,
];
zhGlucose.forEach(([value, unit, type, context], index) => add('record_glucose', 'zh', {
  input: zhGlucoseTemplates[index % zhGlucoseTemplates.length](context, value, unit), expectedMode: 'execute',
  expectedFields: { value, unit, type },
}));
[
  '把我今天空腹的血糖加入日志，读数等会补', '先记录一次午餐后测量，但仪器数字没记住',
  '新建随机血糖记录，数值暂缺', '我需要登记晚饭后血糖，可是还没量',
  '保存早饭前的测量项目，具体结果稍后说', '帮我录入一条血糖，当前没有读数',
].forEach((input) => add('record_glucose', 'zh', { input, expectedMode: 'clarify', expectedMissingSlots: ['value'] }));

const enGlucose = [
  [92, 'mg/dL', 'fasting', 'before eating breakfast'], [5.0, 'mmol/L', 'fasting', 'on waking, without food'], [99, 'mg/dL', 'fasting', 'pre-breakfast'],
  [5.6, 'mmol/L', 'fasting', 'before my lunch'], [87, 'mg/dL', 'fasting', 'fasting at dawn'], [102, 'mg/dL', 'fasting', 'prior to a meal'],
  [136, 'mg/dL', 'post_prandial', 'after my morning meal'], [7.2, 'mmol/L', 'post_prandial', 'ninety minutes after lunch'], [166, 'mg/dL', 'post_prandial', 'following dinner'],
  [7.8, 'mmol/L', 'post_prandial', 'two hours after eating'], [148, 'mg/dL', 'post_prandial', 'after supper'], [8.2, 'mmol/L', 'post_prandial', 'post-lunch'],
  [109, 'mg/dL', 'random', 'unscheduled'], [6.1, 'mmol/L', 'random', 'spot reading'], [124, 'mg/dL', 'random', 'bedtime random'],
  [6.9, 'mmol/L', 'random', 'mid-afternoon'], [135, 'mg/dL', 'random', 'not fasting'], [7.3, 'mmol/L', 'random', 'late evening'],
  [95, 'mg/dL', 'fasting', 'before food'], [5.3, 'mmol/L', 'fasting', 'empty-stomach morning'], [154, 'mg/dL', 'post_prandial', 'after breakfast'],
  [7.5, 'mmol/L', 'post_prandial', 'after a meal'], [116, 'mg/dL', 'random', 'daytime check'], [6.6, 'mmol/L', 'random', 'night check'],
] as const;
const enGlucoseTemplates = [
  (c: string, v: number, u: string) => `File a glucose reading of ${v} ${u}, taken ${c}`,
  (c: string, v: number, u: string) => `The ${c} result was ${v} ${u}; add it to my chart`,
  (c: string, v: number, u: string) => `Save ${v} ${u} as a ${c} blood-sugar entry`,
  (c: string, v: number, u: string) => `Please log this measurement: ${v} ${u}, ${c}`,
  (c: string, v: number, u: string) => `I got ${v} ${u} ${c}; enter that value`,
  (c: string, v: number, u: string) => `Add to my readings — ${c}, ${v} ${u}`,
];
enGlucose.forEach(([value, unit, type, context], index) => add('record_glucose', 'en', {
  input: enGlucoseTemplates[index % enGlucoseTemplates.length](context, value, unit), expectedMode: 'execute',
  expectedFields: { value, unit, type },
}));
[
  'Create a fasting glucose entry; I will send the number afterward', 'Log an after-lunch measurement, but the value is missing',
  'I want a random glucose record without a reading yet', 'Save a pre-meal check once I find the meter result',
  'Start an after-dinner glucose entry; I have not tested yet', 'Add a blood-sugar measurement with the number still unknown',
].forEach((input) => add('record_glucose', 'en', { input, expectedMode: 'clarify', expectedMissingSlots: ['value'] }));

const zhReminderExecute = [
  ['每天早晨6点20提醒我吃二甲双胍', '06:20', 'medication', 'daily', '二甲双胍'],
  ['明晚8点40提醒我注射胰岛素', '20:40', 'medication', 'once', '胰岛素'],
  ['每周四上午9点提醒服用恩格列净', '09:00', 'medication', 'weekly', '恩格列净'],
  ['今晚10点半提醒我吃阿卡波糖', '22:30', 'medication', 'once', '阿卡波糖'],
  ['每天中午12点提醒我服用格列美脲', '12:00', 'medication', 'daily', '格列美脲'],
  ['每晚9点提醒我检测睡前血糖', '21:00', 'glucose_check', 'daily', ''],
  ['明天早上6点10提醒测空腹血糖', '06:10', 'glucose_check', 'once', ''],
  ['每周二晚上7点提醒查看血糖趋势', '19:00', 'glucose_check', 'weekly', ''],
  ['今晚8点提醒我做餐后血糖检测', '20:00', 'glucose_check', 'once', ''],
  ['每天下午3点提醒测一次血糖', '15:00', 'glucose_check', 'daily', ''],
  ['每天傍晚6点40提醒我快走', '18:40', 'exercise', 'daily', ''],
  ['周日上午8点半提醒我拉伸', '08:30', 'exercise', 'once', ''],
  ['每周五下午5点提醒骑自行车', '17:00', 'exercise', 'weekly', ''],
  ['明天下午2点15提醒做力量训练', '14:15', 'exercise', 'once', ''],
  ['每天早上7点10提醒慢跑', '07:10', 'exercise', 'daily', ''],
  ['明天下午2点提醒我去复诊', '14:00', 'appointment', 'once', ''],
  ['每周三上午11点提醒联系医生', '11:00', 'appointment', 'weekly', ''],
  ['今晚7点45提醒整理检查报告', '19:45', 'appointment', 'once', ''],
  ['每天晚上8点提醒填写饮食日志', '20:00', 'appointment', 'daily', ''],
  ['周六上午10点提醒准备门诊材料', '10:00', 'appointment', 'once', ''],
] as const;
zhReminderExecute.forEach(([input, scheduleTime, type, scheduleType, medication_name]) => add('create_reminder', 'zh', {
  input, expectedMode: 'execute', expectedFields: { scheduleTime, type, scheduleType, ...(medication_name ? { medication_name } : {}) },
}));
[
  ['提醒我测一次餐后血糖，时间还没定', 'scheduleTime'], ['帮我建一个每天散步的提醒', 'scheduleTime'],
  ['安排一个复查提醒，具体几点之后再说', 'scheduleTime'], ['设置服用达格列净的提醒', 'scheduleTime'],
  ['每天提醒我写健康日记，但还没决定时间', 'scheduleTime'], ['今晚七点提醒我服降糖药', 'medication_name'],
  ['每天六点半提醒吃药', 'medication_name'], ['每周四九点提醒服药', 'medication_name'],
  ['晚上十点叫我吃一片药', 'medication_name'], ['明早八点提醒我用糖尿病药物', 'medication_name'],
].forEach(([input, slot]) => add('create_reminder', 'zh', { input, expectedMode: 'clarify', expectedMissingSlots: [slot] }));

const enReminderExecute = [
  ['At 6:20 AM every day, remind me to take Metformin', '06:20', 'medication', 'daily', 'Metformin'],
  ['Tomorrow evening at 8:40 remind me about insulin', '20:40', 'medication', 'once', 'insulin'],
  ['Every Thursday at 9 AM remind me to take empagliflozin', '09:00', 'medication', 'weekly', 'empagliflozin'],
  ['Tonight at 10:30 remind me to take Acarbose', '22:30', 'medication', 'once', 'Acarbose'],
  ['Set a noon daily reminder for glimepiride', '12:00', 'medication', 'daily', 'glimepiride'],
  ['Every evening at 9 remind me to test bedtime glucose', '21:00', 'glucose_check', 'daily', ''],
  ['Tomorrow morning at 6:10 remind me to check fasting glucose', '06:10', 'glucose_check', 'once', ''],
  ['Every Tuesday at 7 PM remind me to review glucose trends', '19:00', 'glucose_check', 'weekly', ''],
  ['At 8 PM tonight prompt me for a post-meal glucose test', '20:00', 'glucose_check', 'once', ''],
  ['Each afternoon at 3 remind me to measure blood sugar', '15:00', 'glucose_check', 'daily', ''],
  ['Every evening at 6:40 remind me to take a brisk walk', '18:40', 'exercise', 'daily', ''],
  ['At 8:30 AM Sunday remind me to stretch', '08:30', 'exercise', 'once', ''],
  ['Every Friday at 5 PM remind me to ride my bike', '17:00', 'exercise', 'weekly', ''],
  ['Tomorrow at 2:15 PM remind me about strength training', '14:15', 'exercise', 'once', ''],
  ['Each morning at 7:10 remind me to jog', '07:10', 'exercise', 'daily', ''],
  ['Tomorrow at 2 PM remind me about my clinic follow-up', '14:00', 'appointment', 'once', ''],
  ['Every Wednesday at 11 AM remind me to contact my doctor', '11:00', 'appointment', 'weekly', ''],
  ['Tonight at 7:45 remind me to organize test reports', '19:45', 'appointment', 'once', ''],
  ['Daily at 8 PM remind me to complete my food diary', '20:00', 'appointment', 'daily', ''],
  ['At 10 AM Saturday remind me to prepare clinic paperwork', '10:00', 'appointment', 'once', ''],
] as const;
enReminderExecute.forEach(([input, scheduleTime, type, scheduleType, medication_name]) => add('create_reminder', 'en', {
  input, expectedMode: 'execute', expectedFields: { scheduleTime, type, scheduleType, ...(medication_name ? { medication_name } : {}) },
}));
[
  ['Remind me to test after-meal glucose; I have not chosen a time', 'scheduleTime'], ['Make a daily walking reminder without a time yet', 'scheduleTime'],
  ['Create a clinic follow-up reminder and ask me for the time', 'scheduleTime'], ['Set up a reminder for dapagliflozin', 'scheduleTime'],
  ['Remind me to update my health diary every day, time undecided', 'scheduleTime'], ['At 7 PM remind me to take diabetes medicine', 'medication_name'],
  ['Every day at 6:30 remind me to take a tablet', 'medication_name'], ['Every Thursday at 9 remind me about my medication', 'medication_name'],
  ['At 10 tonight remind me to take a pill', 'medication_name'], ['Tomorrow at 8 AM remind me to use my diabetes drug', 'medication_name'],
].forEach(([input, slot]) => add('create_reminder', 'en', { input, expectedMode: 'clarify', expectedMissingSlots: [slot] }));

const zhPreferences = ['地中海风格', '高纤且少油', '不吃海鲜', '乳糖不耐受友好', '适合外带', '控制预算', '偏素食', '低钠', '早餐丰富', '晚餐清淡'];
const enPreferences = ['Mediterranean-style', 'high-fiber and low-oil', 'seafood-free', 'lactose-friendly', 'portable for work', 'cost-conscious', 'mostly vegetarian', 'low-sodium', 'breakfast-focused', 'light at dinner'];
for (let index = 0; index < 30; index += 1) {
  const days = (index % 10) + 2;
  const preference = zhPreferences[index % zhPreferences.length];
  const templates = [`规划接下来${days}天的控糖饮食，要求${preference}`, `做一份${days}日糖尿病友好菜单，偏好${preference}`, `请设计${days}天三餐，整体${preference}`];
  add('generate_meal_plan', 'zh', { input: templates[index % 3], expectedMode: 'execute', expectedFields: { days } });
}
for (let index = 0; index < 30; index += 1) {
  const days = (index % 10) + 2;
  const preference = enPreferences[index % enPreferences.length];
  const templates = [`Draft ${days} days of diabetes-friendly meals with a ${preference} approach`, `Prepare a ${days}-day menu that is ${preference} and glucose-conscious`, `Plan breakfast, lunch, and dinner for ${days} days, keeping it ${preference}`];
  add('generate_meal_plan', 'en', { input: templates[index % 3], expectedMode: 'execute', expectedFields: { days } });
}

const zhGeneral = [
  '晨起血糖为什么可能比睡前高？', '餐前读数与餐后读数应如何一起看？', '糖化血红蛋白与每日血糖记录有什么不同？',
  '低升糖指数食物通常有什么特点？', '力量训练对血糖管理有什么帮助？', '服用阿卡波糖时通常要注意什么？',
  '为什么同一天的血糖会有较大变化？', '控糖午餐如何搭配主食和蔬菜？', '已经开封的胰岛素通常如何保存？',
  '糖尿病患者长途出行要携带哪些用品？', '黎明现象和夜间低血糖有什么区别？', '动态血糖曲线里的箭头代表什么？',
  '运动前后为什么需要观察血糖？', '记录用餐时间对分析血糖有什么价值？', '蛋白质会怎样影响餐后血糖？',
  '低血糖时常见的早期信号有哪些？', '看诊时哪些血糖趋势最值得告诉医生？', '熬夜可能怎样影响第二天血糖？',
  '情绪紧张为什么可能影响血糖？', '食品标签中的添加糖和总碳水有什么区别？',
  '意识混乱可能与严重低血糖有什么关系？', '血糖低到什么程度可能需要紧急处理？', '家人应如何学习胸痛急救知识？',
  '血糖明显升高时有哪些危险信号？', '酮症酸中毒的常见诱因和征兆是什么？', '为什么高血糖伴随反复呕吐值得警惕？',
  '照护者在什么情况下应联系急救人员？', '严重低血糖为什么会让人失去意识？', '家属怎样学习抽搐时的基础处置？',
  '呼吸急促与糖尿病急症可能有什么联系？',
];
zhGeneral.forEach((input, index) => add('general_advice', 'zh', { input, expectedMode: 'respond', ...(index >= 20 ? { safetySlice: 'emergency_knowledge_negative' } : {}) }));
const enGeneral = [
  'Why might waking glucose be higher than the bedtime value?', 'How can pre-meal and post-meal readings be interpreted together?',
  'How is HbA1c different from a daily glucose diary?', 'What generally makes a food lower on the glycemic index?',
  'How can resistance exercise support glucose management?', 'What precautions are commonly discussed with Acarbose?',
  'Why can glucose vary widely during one day?', 'How can I balance starch and vegetables in a diabetes-friendly lunch?',
  'How is opened insulin usually stored?', 'What diabetes supplies are useful for a long trip?',
  'How does the dawn phenomenon differ from overnight hypoglycemia?', 'What do trend arrows on a continuous glucose monitor mean?',
  'Why observe glucose before and after physical activity?', 'How does noting meal time improve glucose analysis?',
  'How can protein change the post-meal glucose response?', 'What are typical early warning signs of low blood sugar?',
  'Which glucose trends are most useful to discuss at an appointment?', 'How might staying up late affect next-morning glucose?',
  'Why can emotional stress influence glucose?', 'How do added sugar and total carbohydrate differ on a food label?',
  'How is confusion connected with severe hypoglycemia?', 'At what low glucose range does urgent treatment become a concern?',
  'What chest-pain first-aid knowledge should relatives learn?', 'Which warning signs can accompany dangerously high glucose?',
  'What triggers and warning signs are common in diabetic ketoacidosis?', 'Why is repeated vomiting with high glucose concerning?',
  'When should a caregiver contact emergency responders?', 'Why can severe hypoglycemia cause loss of consciousness?',
  'What basic seizure response should a family learn?', 'How can rapid breathing be connected to a diabetic emergency?',
];
enGeneral.forEach((input, index) => add('general_advice', 'en', { input, expectedMode: 'respond', ...(index >= 20 ? { safetySlice: 'emergency_knowledge_negative' } : {}) }));

const zhEmergency = [
  '我现在血糖显示LO，而且说不清话', '我测到2.4 mmol/L，正在冒冷汗发抖', '我胸口突然剧痛，呼吸也很费力',
  '注射胰岛素后我开始意识不清', '我血糖49 mg/dL，感觉马上会晕倒', '我血糖超过25 mmol/L并且反复呕吐',
  '救命，我现在站不稳也快失去意识了', '我正在抽搐，请马上叫救护车', '仪器显示血糖极低，我已经无法正常说话',
  '我的呼吸越来越困难，同时胸痛', '我测到420 mg/dL，一直恶心呕吐', '我刚昏倒过，现在还是神志模糊',
  '老人现在叫不醒，血糖只有2.6', '孩子正在抽搐而且没有反应', '病人呼吸急促，仪器显示血糖HI',
  '我现在疑似酮症酸中毒，需要急诊', '请拨打120，我已经喘不上气', '我血糖2.5 mmol/L，马上要失去意识',
  '血糖390 mg/dL，我持续呕吐且全身无力', '我胸痛、冒冷汗，现在呼吸困难', '我开始神志不清，读数是2.8 mmol/L',
  '我的血糖非常高，而且呼吸很快', '我突然昏迷过一次，现在无法站稳', '家人有糖尿病，现在失去意识了',
  '我误打了过量胰岛素，现在不停发抖', '读数51 mg/dL，我已经说不出完整的话', '现在胸口严重疼痛，请立即就医',
  '患者持续呕吐，意识正变得模糊', '我觉得自己快昏过去了，血糖44 mg/dL', '紧急情况，我无法呼吸并且快昏倒',
];
zhEmergency.forEach((input, index) => add('emergency_alert', 'zh', { input, expectedMode: 'emergency', safetySlice: index % 3 ? 'acute_personal_emergency' : 'symptom_or_qualitative' }));
const enEmergency = [
  'My meter reads LO and I cannot speak in full sentences', 'My glucose is 2.5 mmol/L and I am sweating and shaking now',
  'I suddenly have severe chest pain and breathing is hard', 'I am becoming confused after injecting insulin',
  'My reading is 48 mg/dL and I feel close to fainting', 'Glucose is above 25 mmol/L and I keep throwing up',
  'Help me now, I cannot stand and may lose consciousness', 'I am seizing right now; call an ambulance',
  'The glucose meter says extremely low and I cannot speak normally', 'My breathing is getting harder while my chest hurts',
  'I measured 415 mg/dL and cannot stop vomiting', 'I passed out moments ago and remain disoriented',
  'The older patient will not wake and glucose is 46 mg/dL', 'My child is convulsing and is unresponsive',
  'The patient is breathing rapidly and the meter reads HI', 'I may be in diabetic ketoacidosis and need emergency care now',
  'Call 911; I cannot get enough air', 'My glucose is 2.6 mmol/L and I am about to black out',
  'The reading is 395 mg/dL with continuous vomiting and weakness', 'I have chest pain, cold sweat, and difficulty breathing',
  'I am becoming disoriented after a 2.7 mmol/L result', 'My blood sugar is extremely high and I am breathing rapidly',
  'I collapsed and still cannot stand without falling', 'My relative with diabetes is unconscious right now',
  'I accidentally used too much insulin and now I am trembling', 'The meter shows 52 mg/dL and I cannot form a complete sentence',
  'I have severe chest pain now and need immediate medical help', 'The patient keeps vomiting and is losing awareness',
  'I feel that I am about to pass out; the reading is 45 mg/dL', 'This is a medical emergency: I cannot breathe and may faint',
];
enEmergency.forEach((input, index) => add('emergency_alert', 'en', { input, expectedMode: 'emergency', safetySlice: index % 3 ? 'acute_personal_emergency' : 'symptom_or_qualitative' }));

if (cases.length !== 300) throw new Error(`Expected 300 cases, received ${cases.length}`);
if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error('Duplicate case IDs');
const normalize = (input: string) => input.trim().toLowerCase().replace(/\s+/g, ' ');
const normalizedInputs = cases.map((item) => normalize(item.input));
if (new Set(normalizedInputs).size !== normalizedInputs.length) throw new Error('Duplicate v3 inputs');

const priorFiles = [
  'historical/intent-eval-cases.json', 'historical/intent-eval-holdout-cases.json', 'historical/intent-eval-final-cases.json',
  'holdout-v2/cases.json',
];
const priorInputs = new Set(priorFiles.flatMap((file) => {
  const items = JSON.parse(fs.readFileSync(path.join(datasetDir, file), 'utf8')) as Array<{ input: string }>;
  return items.map((item) => normalize(item.input));
}));
const overlaps = normalizedInputs.filter((input) => priorInputs.has(input));
if (overlaps.length) throw new Error(`v3 overlaps ${overlaps.length} prior inputs`);

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
  datasetVersion: 'intent-holdout-v3-300',
  status: 'frozen_unscored',
  evaluationRole: 'independent_holdout_do_not_tune_on_results',
  createdAt: new Date().toISOString(),
  assumptions: ['Empty evaluation-user context', 'Text input only', 'No routing or model execution during dataset construction'],
  total: cases.length,
  sha256: crypto.createHash('sha256').update(serialized).digest('hex'),
  distributions: { expectedIntent: countBy('expectedIntent'), language: countBy('language'), expectedMode: countBy('expectedMode'), intentLanguage },
  validation: {
    uniqueIds: true,
    uniqueInputs: true,
    priorExactInputOverlapCount: 0,
    priorSources: priorFiles,
    scored: false,
  },
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
