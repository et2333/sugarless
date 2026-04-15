/**
 * AI Response Service
 * 简化AI响应，使其更简洁直接
 */

class AIResponseService {
  // 简化响应模板
  getSimpleResponse(intent: string, data?: any): string {
    const responses: Record<string, any> = {
      // 血糖记录 - 超级简洁
      blood_sugar_record: {
        success: data?.value 
          ? `Recorded: ${data.value} ${data?.unit || 'mg/dL'} ✓`
          : 'What value?',
      },
      
      // 提醒设置 - 直接确认
      set_reminder: {
        success: data?.time 
          ? `${data.time} reminder set ✓`
          : 'What time?',
        needInfo: data?.title ? `${data.title} at ${data.time} ✓` : 'What should I remind you about?',
      },
      
      // 天气查询 - 直接回答
      weather: {
        response: data?.condition 
          ? `Today: ${data.condition}, ${data.temp || ''}°C`
          : 'Checking weather...',
      },
      
      // 药物提醒
      medication: {
        time: data?.name 
          ? `Medicine time: ${data.name} ✓`
          : 'Medicine reminder set ✓',
        taken: '✓ Marked as taken',
      }
    };
    
    const response = responses[intent];
    if (!response) return 'OK';
    
    // 返回成功消息或需要信息
    return response.success || response.needInfo || response.response || response.time || response.taken || 'OK';
  }
  
  // 配置AI提示词 - 让它说话简洁
  getSystemPrompt(language: 'en' | 'zh'): string {
    if (language === 'zh') {
      return `你是健康助手。关键规则：
1. 回复极其简短（最多20个字）
2. 不要说"我很乐意帮助"或"请咨询医生"等免责声明
3. 只需用✓确认操作
4. 只在绝对必要时询问缺失信息
5. 绝不重复用户刚说的话

示例：
用户："记录血糖7.5"
你："已记录 7.5 mmol/L ✓"

用户："9点提醒我"  
你："9点提醒已设置 ✓ 什么事？"

用户："今天天气"
你："晴天 22°C"`;
    }
    
    return `You are a health assistant. 
CRITICAL RULES:
1. Keep responses EXTREMELY brief (max 20 words)
2. No disclaimers like "I'm here to help" or "consult your doctor"
3. Just confirm actions with checkmark ✓
4. Only ask for missing info when absolutely necessary
5. Never repeat what the user just said

Examples:
User: "Record blood sugar 7.5"
You: "Recorded 7.5 mmol/L ✓"

User: "Remind me at 9pm"  
You: "9pm reminder set ✓ About what?"

User: "Weather today"
You: "Sunny, 22°C"`;
  }
}

export default AIResponseService;

