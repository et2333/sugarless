/**
 * Intent Parser Service
 * 智能意图解析器，识别用户意图并提取数据
 */

interface ParsedIntent {
  intent: string;
  data?: any;
  text?: string;
}

class IntentParser {
  parseIntent(text: string): ParsedIntent {
    const cleaned = text.toLowerCase().trim();
    
    // 关键词映射
    const intents = [
      {
        keywords: ['record', 'blood sugar', 'glucose', 'mmol', 'mg/dl', 'blood sugar is'],
        intent: 'blood_sugar_record',
        extract: (observedText: string) => {
          // 提取血糖值 - 支持多种格式
          const patterns = [
            /(\d+\.?\d*)\s*(mmol|l)/i,           // "7.5 mmol" or "7.5 L"
            /(\d+\.?\d*)\s*(mg\/dl|mg)/i,        // "110 mg/dl" or "110 mg"
            /blood sugar is\s*(\d+\.?\d*)/i,     // "blood sugar is 110"
            /is\s*(\d+\.?\d*)/i,                 // "is 110" (上下文：blood sugar)
            /(\d+\.?\d*)$/,                       // 末尾数字 "110"
            /(\d{3,4})/,                         // 3-4位数字（mg/dL格式）
          ];
          
          let value: number | null = null;
          let unit: string = 'mg/dL';
          
          for (const pattern of patterns) {
            const match = observedText.match(pattern);
            if (match) {
              value = parseFloat(match[1]);
              // 检测单位
              if (match[2]) {
                if (match[2].toLowerCase().includes('mmol') || match[2].toLowerCase() === 'l') {
                  unit = 'mmol/L';
                }
              } else if (value < 30) {
                // 小于30的数值很可能是mmol/L
                unit = 'mmol/L';
              }
              break;
            }
          }
          
          // 识别血糖类型
          let type = 'random';
          if (observedText.includes('fasting') || observedText.includes('before meal') || observedText.includes('早餐前')) {
            type = 'fasting';
          } else if (observedText.includes('post') || observedText.includes('after meal') || observedText.includes('餐后')) {
            type = 'post_prandial';
          } else if (observedText.includes('hba1c') || observedText.includes('糖化')) {
            type = 'hba1c';
          }
          
          // 提取备注（不适症状等）
          let notes = '';
          const discomfortKeywords = ['discomfort', 'dizzy', 'headache', 'nausea', 'tired', 'no discomfort', 'feel fine'];
          for (const keyword of discomfortKeywords) {
            if (observedText.includes(keyword)) {
              const index = observedText.indexOf(keyword);
              notes = observedText.substring(index).trim();
              break;
            }
          }
          
          return value ? { value, unit, type, notes } : null;
        }
      },
      {
        keywords: ['remind', 'reminder', 'alarm', 'set reminder'],
        intent: 'set_reminder',
        extract: (observedText: string) => {
          // 提取时间
          const timePatterns = [
            /(\d{1,2}):?(\d{0,2})?\s*(am|pm|AM|PM)/i,  // "9:00 PM", "9 PM"
            /(\d{1,2})\s*(am|pm|AM|PM)/i,              // "9 PM"
            /at\s*(\d{1,2}):?(\d{0,2})?/i,             // "at 9", "at 9:00"
            /(\d{1,2}):(\d{2})/i,                       // "9:00"
          ];
          
          let time = '';
          for (const pattern of timePatterns) {
            const match = observedText.match(pattern);
            if (match) {
              const hour = parseInt(match[1]);
              const minute = match[2] ? parseInt(match[2]) : 0;
              const period = match[3] ? match[3].toLowerCase() : (hour >= 12 ? 'pm' : 'am');
              
              let hour24 = hour;
              if (period === 'pm' && hour !== 12) hour24 = hour + 12;
              if (period === 'am' && hour === 12) hour24 = 0;
              
              time = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              break;
            }
          }
          
          // 提取提醒内容
          let title = '';
          let type = 'appointment';
          
          if (observedText.includes('medication') || observedText.includes('medicine') || observedText.includes('take')) {
            type = 'medication';
            const medMatch = observedText.match(/(?:take|medicine|medication)\s+(.+?)(?:\s+at|\s*$)/i);
            title = medMatch ? medMatch[1].trim() : 'Take medication';
          } else if (observedText.includes('blood sugar') || observedText.includes('glucose')) {
            type = 'glucose_check';
            title = 'Check blood sugar';
          } else {
            // 提取提醒主题
            const remindMatch = observedText.match(/remind me (?:to|about)?\s*(.+?)(?:\s+at|\s*$)/i);
            title = remindMatch ? remindMatch[1].trim() : 'Reminder';
          }
          
          // 识别频率
          const scheduleType = (observedText.includes('daily') || observedText.includes('every day') || observedText.includes('每天')) 
            ? 'daily' 
            : 'once';
          
          return { time, title, type, scheduleType };
        }
      },
      {
        keywords: ['weather', 'rain', 'sunny', 'cloudy', 'temperature', 'rainy day'],
        intent: 'weather',
        extract: (observedText: string) => {
          let condition = 'unknown';
          if (observedText.includes('rain')) condition = 'rainy';
          else if (observedText.includes('sun')) condition = 'sunny';
          else if (observedText.includes('cloud')) condition = 'cloudy';
          
          return { condition, query: 'today' };
        }
      },
      {
        keywords: ['medicine', 'medication', 'pill', 'drug', 'take medicine'],
        intent: 'medication',
        extract: (observedText: string) => {
          const action = observedText.includes('taken') ? 'taken' : 'reminder';
          return { action };
        }
      }
    ];
    
    // 找到最匹配的意图
    for (const item of intents) {
      const hasKeyword = item.keywords.some(kw => cleaned.includes(kw));
      if (hasKeyword) {
        const data = item.extract(cleaned);
        return { intent: item.intent, data };
      }
    }
    
    // 默认：不理解
    return { intent: 'unknown', text: cleaned };
  }
}

export default IntentParser;

