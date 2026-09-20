/**
 * AI Chat Service
 * 实现AI健康助手对话系统
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AssemblyAI } from 'assemblyai';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../utils/prisma';
import { 
  detectLanguage, 
  getLanguageConfig, 
  getQuickReplies,
  detectEmergency as detectEmergencyMultilang,
  getEmergencyResponse,
  SupportedLanguage 
} from '../../utils/languageDetector';
import { getCachedContext, setCachedContext } from '../../utils/contextCache';
import { normalizeActionData } from '../../utils/actionNormalizer';
import { tryRuleBasedIntent } from '../../utils/intentRouter';

// 初始化AI服务
const apiKey = process.env.GEMINI_API_KEY || '';
const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY || '';

if (!apiKey) {
  console.error('GEMINI_API_KEY not configured');
}

const genAI = new GoogleGenerativeAI(apiKey);
const assemblyai = new AssemblyAI({
  apiKey: assemblyApiKey,
});

console.log('AI服务初始化完成 - Gemini API Key:', apiKey ? '已配置' : '未配置');
console.log('AI服务初始化完成 - AssemblyAI API Key:', assemblyApiKey ? '已配置' : '未配置');

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    isAudio?: boolean;
    audioUrl?: string;
    healthData?: any;
  };
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
}

class ChatService {
  private static model: any = null;

  private static initializeModel() {
    if (this.model) {
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError('GEMINI_API_KEY未配置', 500, 'MISSING_GEMINI_API_KEY');
    }

    console.log('正在初始化Gemini模型，API Key:', apiKey ? '已设置' : '未设置');

    try {
      const currentGenAI = new GoogleGenerativeAI(apiKey);

      const modelsToTry = process.env.GEMINI_MODEL
        ? [process.env.GEMINI_MODEL]
        : [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
          ];

      let modelInitialized = false;
      for (const modelName of modelsToTry) {
        try {
          this.model = currentGenAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 512,
              responseMimeType: 'application/json',
            },
          });
          console.log(`Successfully initialized model: ${modelName}`);
          modelInitialized = true;
          break;
        } catch (error: any) {
          console.log(`Failed to initialize ${modelName}, trying next...`, error.message);
        }
      }

      if (!modelInitialized) {
        console.error('All Gemini models failed to initialize');
        throw new Error('无法初始化任何Gemini模型');
      }
    } catch (error) {
      console.error('Failed to initialize Gemini model:', error);
      throw error;
    }
  }

  /**
   * 语音转文字（支持多语言）
   * Speech to text (multilingual support)
   */
  static async transcribeAudio(audioUrl: string, language?: string): Promise<string> {
    try {
      // 确保使用正确的AssemblyAI API密钥
      const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
      if (!assemblyApiKey) {
        throw new AppError('ASSEMBLYAI_API_KEY未配置', 500, 'MISSING_ASSEMBLYAI_API_KEY');
      }
      const currentAssemblyAI = new AssemblyAI({ apiKey: assemblyApiKey });
      
      // 确定语言代码（支持中英文）
      // AssemblyAI支持的语言代码：zh=中文, en=英文
      const languageCode = language === 'en' ? 'en' : 'zh';
      
      console.log(`语音转文字 - 使用语言: ${languageCode}`);
      
      // 常见药物名称词汇表（提高识别准确率）
      const medicationVocabulary = [
        // 中文药物
        '二甲双胍', '格列齐特', '阿卡波糖', '格列美脲', '瑞格列奈',
        '胰岛素', '门冬胰岛素', '甘精胰岛素', '赖脯胰岛素',
        '西格列汀', '沙格列汀', '利格列汀', '阿格列汀',
        '恩格列净', '达格列净', '卡格列净',
        // 英文药物
        'Metformin', 'Gliclazide', 'Acarbose', 'Glimepiride', 'Repaglinide',
        'Insulin', 'Aspart', 'Glargine', 'Lispro',
        'Sitagliptin', 'Saxagliptin', 'Linagliptin', 'Alogliptin',
        'Empagliflozin', 'Dapagliflozin', 'Canagliflozin'
      ];
      
      // 创建转录任务
      const transcript = await currentAssemblyAI.transcripts.create({
        audio_url: audioUrl,
        language_code: languageCode,
        speaker_labels: true,
        word_boost: medicationVocabulary, // 提高药物名称识别率
        boost_param: 'high' // 高优先级增强
      });

      if (!transcript.id) {
        throw new AppError('创建转录任务失败', 500, 'TRANSCRIPTION_ERROR');
      }

      console.log('转录任务已创建，ID:', transcript.id);

      // 等待转录完成（带超时处理）
      let completedTranscript = await currentAssemblyAI.transcripts.get(transcript.id);
      let attempts = 0;
      const maxAttempts = 60; // 最多等待60秒
      
      while ((completedTranscript.status === 'processing' || completedTranscript.status === 'queued') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        completedTranscript = await currentAssemblyAI.transcripts.get(transcript.id);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new AppError('语音识别超时', 500, 'TRANSCRIPTION_TIMEOUT');
      }

      if (completedTranscript.status === 'error') {
        console.error('转录错误:', completedTranscript.error);
        throw new AppError('语音识别失败', 500, 'TRANSCRIPTION_ERROR');
      }

      const transcribedText = completedTranscript.text || '';
      console.log('转录完成:', transcribedText);

      return transcribedText;
    } catch (error: any) {
      console.error('语音转文字失败:', error);
      throw new AppError('语音识别服务不可用', 500, 'TRANSCRIPTION_SERVICE_ERROR');
    }
  }

  /**
   * 获取用户上下文数据
   */
  private static async getUserContext(userId: string): Promise<ChatContext> {
    const cached = getCachedContext(userId);
    if (cached) {
      return cached as ChatContext;
    }

    try {
      const [profile, recentGlucose, medications] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.bloodSugarRecord.findMany({
          where: { userId },
          orderBy: { measurementTime: 'desc' },
          take: 3,
        }),
        prisma.medication.findMany({
          where: { userId, isActive: true },
        }),
      ]);

      const context: ChatContext = {
        userId,
        userProfile: profile,
        recentGlucose,
        medications,
      };
      setCachedContext(userId, context);
      return context;
    } catch (error) {
      console.error('获取用户上下文失败:', error);
      return { userId };
    }
  }

  /**
   * 健康对话主函数（支持中英文）
   * Health chat main function (supports Chinese and English)
   */
  static async healthChat(message: string, userId: string): Promise<HealthQueryResult> {
    try {
      // 检测语言
      const detectedLanguage = detectLanguage(message);
      const langConfig = getLanguageConfig(detectedLanguage);
      
      console.log('检测到语言 / Detected language:', detectedLanguage);

      // Keep safety checks and high-confidence actions deterministic. This path
      // also avoids an unnecessary model call for common health-management tasks.
      if (detectEmergencyMultilang(message, detectedLanguage)) {
        const emergency = getEmergencyResponse(detectedLanguage);
        return {
          response: emergency.response,
          action: { type: 'emergency_alert', data: {} },
          suggestions: emergency.suggestions,
        };
      }

      const ruleBasedResult = tryRuleBasedIntent(message, detectedLanguage);
      if (ruleBasedResult) {
        return ruleBasedResult;
      }

      // 检查API密钥
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('GEMINI_API_KEY not configured');
        throw new AppError('AI服务配置错误', 500, 'AI_CONFIG_ERROR');
      }
      console.log('healthChat - API Key status:', apiKey ? 'configured' : 'missing');

      this.initializeModel();
      
      if (!this.model) {
        throw new AppError('AI服务未初始化', 500, 'AI_SERVICE_ERROR');
      }

      // 获取用户上下文
      const context = await this.getUserContext(userId);

      // 构建多语言提示词
      const userInfoLabel = detectedLanguage === 'zh' ? '用户信息：' : 'User Information:';
      const userQuestionLabel = detectedLanguage === 'zh' ? '用户问题：' : 'User Question:';
      
      const userInfo = detectedLanguage === 'zh' ? {
        糖尿病类型: context.userProfile?.diabetesType || '未知',
        HbA1c: context.userProfile?.hba1c || '未知',
        最近血糖: context.recentGlucose?.slice(0, 3) || [],
        用药: context.medications?.map(m => ({ name: m.name, dosage: m.dosage })) || []
      } : {
        'Diabetes Type': context.userProfile?.diabetesType || 'Unknown',
        'HbA1c': context.userProfile?.hba1c || 'Unknown',
        'Recent Blood Sugar': context.recentGlucose?.slice(0, 3) || [],
        'Medications': context.medications?.map(m => ({ name: m.name, dosage: m.dosage })) || []
      };

      const requirements = detectedLanguage === 'zh' 
        ? `请提供极其简洁的中文回答（最多20个字）

关键规则：
1. 回复极其简短，不要冗长
2. 不要使用免责声明（如"我很乐意帮助"、"请咨询医生"）
3. 只需用✓确认操作完成
4. 只在绝对必要时询问缺失信息
5. 绝不重复用户刚说的话
6. 如果识别到紧急情况，明确建议立即就医

回复格式：
- 操作确认：用"已记录/已设置 ✓"这样的简短确认
- 需要信息：只需问"什么时间？"或"什么值？"
- **重要：response和suggestions字段的所有内容都必须是中文**

特别关注用户想要设定提醒的意图，包括：
- "提醒我"、"设定提醒"、"设置提醒"
- "提醒我吃药"、"提醒我测血糖"
- "明天X点提醒我"、"每天X点提醒我"
- "提醒我复查"、"提醒我运动"等

**用药提醒特别处理**：
如果是用药提醒，务必提取以下信息：
- medication_name: 药物名称（如"二甲双胍"、"胰岛素"）
- dosage: 剂量信息（如"500mg"、"按医嘱"）
- scheduleTime: 具体时间（早上=08:00, 中午=12:00, 晚上=19:00, 睡前=22:00）
- meal_timing: 与用餐关系（"饭前"、"饭后"、"随餐"、空字符串表示无关）
- scheduleType: daily（每天）或 weekly（指定星期几）
- daysOfWeek: 如果是weekly，指定星期几数组[1-7]

示例：
"每天早上8点提醒我吃二甲双胍" → 
{
  "type": "medication",
  "medication_name": "二甲双胍",
  "title": "服用二甲双胍",
  "message": "请按时服用二甲双胍",
  "scheduleTime": "08:00",
  "scheduleType": "daily",
  "dosage": ""
}`
        : `Keep responses EXTREMELY brief (max 20 words) IN ENGLISH

CRITICAL RULES:
1. Keep responses EXTREMELY brief (max 20 words)
2. No disclaimers like "I'm here to help" or "consult your doctor"
3. Just confirm actions with checkmark ✓
4. Only ask for missing info when absolutely necessary
5. Never repeat what the user just said
6. If emergency situation detected, clearly recommend immediate medical attention
7. **CRITICAL: Both the "response" and "suggestions" fields MUST be entirely in English**
8. NO Chinese characters anywhere in your response

Response format:
- Action confirmation: "Recorded 7.5 mmol/L ✓" (just confirm, no extra words)
- Need info: Just ask "What time?" or "What value?"

Pay special attention to reminder setting intentions, including:
- "remind me", "set reminder", "set up reminder"
- "remind me to take medication", "remind me to check blood sugar"
- "remind me at X tomorrow", "remind me daily at X"
- "remind me to follow up", "remind me to exercise", etc.

**Medication Reminder Special Handling**:
For medication reminders, extract the following information:
- medication_name: Name of medication (e.g., "Metformin", "Insulin")
- dosage: Dosage information (e.g., "500mg", "as prescribed")
- scheduleTime: Specific time (morning=08:00, noon=12:00, evening=19:00, bedtime=22:00)
- meal_timing: Meal relation ("before meal", "after meal", "with meal", empty for none)
- scheduleType: daily or weekly
- daysOfWeek: If weekly, specify day numbers [1-7]

Example:
"Remind me to take Metformin every morning at 8" → 
{
  "type": "medication",
  "medication_name": "Metformin",
  "title": "Take Metformin",
  "message": "Please take Metformin on time",
  "scheduleTime": "08:00",
  "scheduleType": "daily",
  "dosage": ""
}`;

      // 构建强调语言的 prompt - 放在最前面
      const languageEmphasis = detectedLanguage === 'zh'
        ? `==============================
重要指令：你必须用中文回复！
==============================
用户用中文提问，你的回复必须全部使用中文。
包括response字段、suggestions字段的所有内容都必须是中文。
不要使用任何英文词汇（除非是专业医学术语）。

`
        : `==============================
CRITICAL INSTRUCTION: You MUST respond in English ONLY!
==============================
The user asked in English. Your response MUST be entirely in English.
This includes the response field and suggestions field - ALL content must be in English.
DO NOT use any Chinese characters in your response.
Use English medical terminology throughout.

`;

      const prompt = `${languageEmphasis}${langConfig.prompts.systemRole}

${userInfoLabel}${JSON.stringify(userInfo, null, 2)}

${userQuestionLabel}${message}

${requirements}

${langConfig.prompts.reminderFormat}

${langConfig.prompts.responseFormat}

${detectedLanguage === 'zh' 
  ? `如果用户要求记录血糖（如"帮我记录血糖"、"记录我的血糖"、"can you record my blood sugar"等），action.type应该是"record_glucose"，data应该是JSON对象包含：
- value: 血糖数值（数字，必需，从用户描述中提取）
- type: 血糖类型（必需，从用户描述中识别：fasting=空腹, post_prandial=餐后, random=随机, hba1c=糖化血红蛋白）
  * 识别规则：提到"fasting"、"空腹"、"餐前"→fasting
  * 提到"post"、"meal"、"餐后"、"饭后"→post_prandial
  * 提到"random"、"随机"、"随时"→random
  * 提到"hba1c"、"糖化"、"HbA1c"→hba1c
  * 如果无法识别，默认使用"random"
- unit: 单位（可选，默认"mg/dL"，如果用户明确提到"mmol/L"则使用"mmol/L"）
- notes: 用户提到的不适症状或其他备注（可选，字符串）
- measurementTime: 测量时间ISO字符串（可选，如果用户提到具体时间则解析，否则默认当前时间）

如果用户要求设定提醒，action.type应该是"create_reminder"，data应该包含：
- title: 提醒标题（**必须使用英文**，如"Take Metformin"或"Medication Reminder"）
- message: 提醒内容（**必须使用英文**，如"Take Metformin (500mg) - before meal"）
- scheduleTime: 时间格式 "HH:MM"（时间表达转换：早上/早晨=08:00, 上午=09:00, 中午=12:00, 下午=14:00, 傍晚=17:00, 晚上=19:00, 睡前=22:00）
- type: 提醒类型 (medication, glucose_check, meal, exercise, appointment, review)
- scheduleType: 频率 (once, daily, weekly, custom)
- medication_name: [仅medication类型] 药物名称（**必须使用英文**，即使输入是中文也要转换为英文，如"维C"→"Vitamin C"）
- dosage: [仅medication类型] 剂量（**必须使用英文或数字格式**，如"500mg"或"500 mg"）
- meal_timing: [仅medication类型] 与用餐关系（**必须使用英文**，如"before meal"、"after meal"、"with meal"）

如果用户要求生成膳食计划/餐单/食谱（如"生成餐单"、"膳食计划"、"meal plan"、"create meal plan"），action.type应该是"generate_meal_plan"，data可包含：
- days: 天数（数字，默认7）
- preferences: 饮食偏好（可选字符串）

**重要：即使用户用中文输入，所有字段都必须输出为英文！**

示例：
用户说："帮我记录我的血糖，我空腹血糖是110，没有不适"
应返回：
{
  "response": "好的，我已经为您记录了空腹血糖110 mg/dL。",
  "action": {
    "type": "record_glucose",
    "data": {
      "value": 110,
      "type": "fasting",
      "unit": "mg/dL",
      "notes": "没有不适"
    }
  },
  "suggestions": ["查看血糖趋势", "设置血糖提醒"]
}`
  : `If user requests to record blood sugar (e.g., "can you record my blood sugar", "record my blood sugar"), action.type should be "record_glucose", data should be a JSON object containing:
- value: Blood sugar value (number, required, extract from user description)
- type: Blood sugar type (required, identify from user description: fasting=before meal, post_prandial=after meal, random=random measurement, hba1c=HbA1c)
  * Recognition rules: mention "fasting", "before meal"→fasting
  * Mention "post", "meal", "after meal"→post_prandial
  * Mention "random"→random
  * Mention "hba1c"→hba1c
  * If cannot identify, default to "random"
- unit: Unit (optional, default "mg/dL", use "mmol/L" if user explicitly mentions "mmol/L")
- notes: Discomfort symptoms or other notes mentioned by user (optional, string)
- measurementTime: Measurement time in ISO string (optional, parse if user mentions specific time, otherwise default to current time)

If user requests a reminder, action.type should be "create_reminder", data should include:
- title: Reminder title (**MUST be in English**, e.g., "Take Metformin" or "Medication Reminder")
- message: Reminder content (**MUST be in English**, e.g., "Take Metformin (500mg) - before meal")
- scheduleTime: Time format "HH:MM" (time conversion: morning=08:00, noon=12:00, afternoon=14:00, evening=17:00, night=19:00, bedtime=22:00)
- type: Reminder type (medication, glucose_check, meal, exercise, appointment, review)
- scheduleType: Frequency (once, daily, weekly, custom)
- medication_name: [medication type only] Medication name (**MUST be in English**, even if user input is Chinese, translate it, e.g., "维C"→"Vitamin C")
- dosage: [medication type only] Dosage (**MUST be in English/number format**, e.g., "500mg" or "500 mg")
- meal_timing: [medication type only] Meal relation (**MUST be in English**, e.g., "before meal", "after meal", "with meal")

If user requests a meal plan (e.g., "generate meal plan", "create a meal plan", "personalized meal plan for diabetes"), action.type should be "generate_meal_plan", data may include:
- days: Number of days (number, default 7)
- preferences: Dietary preferences (optional string)

**CRITICAL: Even if user input is in Chinese, ALL fields MUST be output in English!**

Example:
User says: "Can you record my blood sugar? My fasting blood sugar is 110 and I feel no discomfort"
Should return:
{
  "response": "Sure! I've recorded your fasting blood sugar as 110 mg/dL.",
  "action": {
    "type": "record_glucose",
    "data": {
      "value": 110,
      "type": "fasting",
      "unit": "mg/dL",
      "notes": "no discomfort"
    }
  },
  "suggestions": ["View blood sugar trends", "Set blood sugar reminder"]
}`}`;

      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('AI原始回复:', text);
        console.log('期望语言 / Expected language:', detectedLanguage);
        
        // 解析AI回复
        try {
          // 尝试提取JSON部分
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedResponse = JSON.parse(jsonMatch[0]);
            
            // 验证回复语言是否正确
            const responseLanguage = detectLanguage(parsedResponse.response || '');
            console.log('实际回复语言 / Actual response language:', responseLanguage);
            
            // 如果语言不匹配，使用降级响应
            if (responseLanguage !== detectedLanguage) {
              console.warn(`语言不匹配！期望${detectedLanguage}，实际${responseLanguage}。使用降级响应。`);
              console.warn(`Language mismatch! Expected ${detectedLanguage}, got ${responseLanguage}. Using fallback.`);
              return this.generateFallbackResponse(message, detectedLanguage);
            }
            
            // 如果action是create_reminder，确保data格式正确
            if (parsedResponse.action?.type && parsedResponse.action.data) {
              parsedResponse.action.data = normalizeActionData(
                parsedResponse.action.type,
                parsedResponse.action.data,
                message
              );
            }

            if (parsedResponse.action && parsedResponse.action.type === 'create_reminder') {
              if (typeof parsedResponse.action.data === 'string') {
                try {
                  parsedResponse.action.data = JSON.parse(parsedResponse.action.data);
                } catch (dataParseError) {
                  console.log('提醒数据解析失败，使用默认格式:', dataParseError);
                  // 如果解析失败，尝试从文本中提取信息
                  const timeMatch = text.match(/(\d{1,2}):(\d{2})|(\d{1,2})点/);
                  const titleMatch = text.match(/提醒.*?([^，。！？]+)/) || text.match(/remind.*?([^,.!?]+)/i);
                  
                  const defaultTitle = detectedLanguage === 'zh' ? 'AI助手提醒' : 'AI Assistant Reminder';
                  const defaultMessage = detectedLanguage === 'zh' ? '请按时完成' : 'Please complete on time';
                  
                  parsedResponse.action.data = {
                    title: titleMatch ? titleMatch[1].trim() : defaultTitle,
                    message: parsedResponse.response || defaultMessage,
                    scheduleTime: timeMatch ? (timeMatch[1] ? `${timeMatch[1]}:${timeMatch[2] || '00'}` : `${timeMatch[3]}:00`) : '09:00',
                    type: 'appointment',
                    scheduleType: (text.includes('每天') || text.includes('daily') || text.includes('every day')) ? 'daily' : 'once'
                  };
                }
              }
            }
            
            return parsedResponse;
          } else {
            // 如果没有JSON格式，检查是否是提醒请求
            const lowerText = text.toLowerCase();
            const isReminderRequest = 
              (lowerText.includes('提醒') && (lowerText.includes('我') || lowerText.includes('设定') || lowerText.includes('设置'))) ||
              (lowerText.includes('remind') && (lowerText.includes('me') || lowerText.includes('set')));
            
            if (isReminderRequest) {
              // 提取时间信息
              const timeMatch = text.match(/(\d{1,2}):(\d{2})|(\d{1,2})点/);
              const reminderText = text.replace(/[，。！？,.!?]/g, '');
              
              const defaultTitle = detectedLanguage === 'zh' ? 'AI助手提醒' : 'AI Assistant Reminder';
              const isDaily = text.includes('每天') || text.includes('每日') || text.includes('daily') || text.includes('every day');
              
              return {
                response: text,
                action: {
                  type: 'create_reminder',
                  data: {
                    title: defaultTitle,
                    message: reminderText,
                    scheduleTime: timeMatch ? (timeMatch[1] ? `${timeMatch[1]}:${timeMatch[2] || '00'}` : `${timeMatch[3]}:00`) : '09:00',
                    type: 'appointment',
                    scheduleType: isDaily ? 'daily' : 'once'
                  }
                },
                suggestions: []
              };
            }
            
            // 如果没有JSON格式且不是提醒请求，验证语言后返回
            const responseLanguage = detectLanguage(text);
            if (responseLanguage !== detectedLanguage) {
              console.warn(`语言不匹配！期望${detectedLanguage}，实际${responseLanguage}。使用降级响应。`);
              return this.generateFallbackResponse(message, detectedLanguage);
            }
            
            return {
              response: text,
              suggestions: []
            };
          }
        } catch (parseError) {
          console.error('JSON解析失败:', parseError);
          console.error('原始文本:', text);
          
          const fallbackMsg = detectedLanguage === 'zh' 
            ? '抱歉，我暂时无法处理您的请求，请稍后重试。'
            : 'Sorry, I am temporarily unable to process your request. Please try again later.';
          
          // 如果解析失败，返回原始文本
          return {
            response: text || fallbackMsg,
            suggestions: getQuickReplies(detectedLanguage)
          };
        }
      } catch (apiError: any) {
        console.error('Gemini API调用失败:', apiError);
        
        // 提供基于用户消息的基本响应作为降级
        const fallbackResponse = this.generateFallbackResponse(message, detectedLanguage);
        return fallbackResponse;
      }
    } catch (error: any) {
      console.error('健康对话失败:', error);
      
      // 所有错误都返回降级响应，而不是抛出错误
      console.log('使用降级响应处理错误');
      const detectedLanguage = detectLanguage(message);
      const fallbackResponse = this.generateFallbackResponse(message, detectedLanguage);
      return fallbackResponse;
    }
  }

  /**
   * 保存对话记录
   */
  static async saveChatMessage(userId: string, role: 'user' | 'assistant', content: string, metadata?: any) {
    try {
      // 这里可以保存到数据库，暂时先返回
      return {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
        metadata
      };
    } catch (error) {
      console.error('保存对话记录失败:', error);
    }
  }

  /**
   * 获取对话历史
   */
  static async getChatHistory(userId: string, limit = 50): Promise<ChatMessage[]> {
    try {
      // 这里可以从数据库获取，暂时返回空数组
      return [];
    } catch (error) {
      console.error('获取对话历史失败:', error);
      return [];
    }
  }

  /**
   * 生成降级响应（当AI服务不可用时）- 支持多语言
   * Generate fallback response (when AI service unavailable) - Multilingual support
   */
  static generateFallbackResponse(message: string, language?: SupportedLanguage): HealthQueryResult {
    const detectedLang = language || detectLanguage(message);
    const langConfig = getLanguageConfig(detectedLang);
    const lowerMessage = message.toLowerCase();
    
    // 基于关键词提供基本响应
    // Blood sugar related
    if (lowerMessage.includes('血糖') || lowerMessage.includes('glucose') || lowerMessage.includes('blood sugar')) {
      return {
        response: langConfig.fallbackResponses.bloodSugar,
        suggestions: getQuickReplies(detectedLang).slice(0, 3)
      };
    }
    
    // Diet related
    if (lowerMessage.includes('饮食') || lowerMessage.includes('吃') || lowerMessage.includes('食物') || 
        lowerMessage.includes('diet') || lowerMessage.includes('eat') || lowerMessage.includes('food')) {
      return {
        response: langConfig.fallbackResponses.diet,
        suggestions: getQuickReplies(detectedLang).slice(1, 4)
      };
    }
    
    // Exercise related
    if (lowerMessage.includes('运动') || lowerMessage.includes('锻炼') || 
        lowerMessage.includes('exercise') || lowerMessage.includes('workout')) {
      return {
        response: langConfig.fallbackResponses.exercise,
        suggestions: getQuickReplies(detectedLang).slice(2, 5)
      };
    }
    
    // 默认响应
    return {
      response: langConfig.fallbackResponses.default,
      suggestions: getQuickReplies(detectedLang)
    };
  }

  /**
   * 检测紧急情况（支持中英文）
   * Detect emergency situations (supports Chinese and English)
   */
  static detectEmergency(message: string): boolean {
    return detectEmergencyMultilang(message);
  }

  /**
   * 提取血糖数值
   */
  static extractGlucoseValue(message: string): number | null {
    const glucoseRegex = /(?:血糖|血糖值|血糖水平).*?(\d+(?:\.\d+)?)/;
    const directRegex = /(\d+(?:\.\d+)?)(?:的血糖|血糖|点血糖)/;
    
    let match = message.match(glucoseRegex) || message.match(directRegex);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  }

  /**
   * 生成快速回复建议（支持多语言）
   * Generate quick replies suggestions (multilingual support)
   */
  static getQuickReplies(language?: SupportedLanguage): string[] {
    // 如果没有指定语言，返回中文（默认）
    const lang = language || 'zh';
    return getQuickReplies(lang);
  }
}

export { ChatService };
