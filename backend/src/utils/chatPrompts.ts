/**
 * 完整版 Gemini Prompt（LLM 评测 / 生产默认）
 */
import { SupportedLanguage, getLanguageConfig } from './languageDetector';

export function buildFullChatPrompt(
  lang: SupportedLanguage,
  message: string,
  userInfo: Record<string, unknown>
): string {
  const langConfig = getLanguageConfig(lang);
  const userInfoLabel = lang === 'zh' ? '用户信息：' : 'User Information:';
  const userQuestionLabel = lang === 'zh' ? '用户问题：' : 'User Question:';

  const requirements =
    lang === 'zh'
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
- "提醒我复查"、"提醒我运动"等`
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
- "remind me to follow up", "remind me to exercise", etc.`;

  const languageEmphasis =
    lang === 'zh'
      ? `==============================
重要指令：你必须用中文回复！
==============================
用户用中文提问，你的回复必须全部使用中文。
包括response字段、suggestions字段的所有内容都必须是中文。

`
      : `==============================
CRITICAL INSTRUCTION: You MUST respond in English ONLY!
==============================
The user asked in English. Your response MUST be entirely in English.
This includes the response field and suggestions field - ALL content must be in English.
DO NOT use any Chinese characters in your response.

`;

  const actionSchema =
    lang === 'zh'
      ? `如果用户要求记录血糖，action.type应该是"record_glucose"，data包含 value、type、unit 等。
如果用户要求设定提醒，action.type应该是"create_reminder"，data包含 title、message、scheduleTime、type、scheduleType 等（字段英文）。
如果用户要求生成膳食计划/餐单，action.type应该是"generate_meal_plan"，data可包含 days、preferences。
咨询类问题 action.type 应为 null。`
      : `If user requests to record blood sugar, action.type should be "record_glucose".
If user requests a reminder, action.type should be "create_reminder".
If user requests a meal plan, action.type should be "generate_meal_plan".
For general advice questions, action.type should be null.`;

  return `${languageEmphasis}${langConfig.prompts.systemRole}

${userInfoLabel}${JSON.stringify(userInfo, null, 2)}

${userQuestionLabel}${message}

${requirements}

${langConfig.prompts.reminderFormat}

${langConfig.prompts.responseFormat}

${actionSchema}`;
}

/** @deprecated 仅性能实验用，LLM 评测请用 buildFullChatPrompt */
export function buildCompactChatPrompt(
  lang: SupportedLanguage,
  message: string,
  userInfo: Record<string, unknown>
): string {
  return buildFullChatPrompt(lang, message, userInfo);
}
