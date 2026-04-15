/**
 * English Voice Service
 * 专门处理英语语音合成，自动清理中文字符
 */

class EnglishVoiceService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized: boolean = false;
  private englishVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // 确保语音列表加载完成
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
    this.loadVoices();
  }

  private loadVoices() {
    const voices = speechSynthesis.getVoices();
    
    // 只选择英语语音，优先级排序
    const preferredVoices = [
      'Google US English',
      'Microsoft David - English (United States)',
      'Microsoft Mark - English (United States)',
      'Microsoft Zira - English (United States)',
      'Alex',
      'Samantha',
      'Victoria',
      'Google UK English Female',
      'Google UK English Male'
    ];

    // 查找最佳英语语音
    for (let name of preferredVoices) {
      const voice = voices.find(v => 
        v.name.includes(name) || 
        (v.lang === 'en-US' && v.name.includes(name.split(' ')[0]))
      );
      if (voice) {
        this.englishVoice = voice;
        console.log('Selected voice:', voice.name);
        break;
      }
    }

    // 如果没找到首选，使用任何英语语音
    if (!this.englishVoice) {
      this.englishVoice = voices.find(v => 
        v.lang.startsWith('en-') || 
        v.lang === 'en'
      );
    }

    this.isInitialized = true;
  }

  // 清理文本，移除所有中文
  private cleanText(text: string): string {
    // 移除所有中文字符
    let cleanedText = text.replace(/[\u4e00-\u9fa5]/g, '');
    
    // 常见中文词汇替换（以防遗漏）
    const replacements: Record<string, string> = {
      '百分之': 'percent',
      '点': 'point',
      '您': 'you',
      '的': '',
      '了': '',
      '吗': '',
      '请': 'please',
      '是': 'is'
    };

    for (let [chinese, english] of Object.entries(replacements)) {
      cleanedText = cleanedText.replace(new RegExp(chinese, 'g'), english);
    }

    // 处理百分比格式
    cleanedText = cleanedText.replace(/(\d+)\.(\d+)%/g, '$1 point $2 percent');
    cleanedText = cleanedText.replace(/(\d+)%/g, '$1 percent');

    // 确保文本流畅
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
    
    console.log('Original text:', text);
    console.log('Cleaned text:', cleanedText);
    
    return cleanedText;
  }

  speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  } = {}) {
    // 立即停止当前朗读
    this.stop();

    // 清理文本
    const englishText = this.cleanText(text);
    
    if (!englishText) {
      console.warn('No English text to speak after cleaning');
      if (options.onError) {
        options.onError('No English text to speak after cleaning');
      }
      return;
    }

    // 创建新的语音实例
    this.currentUtterance = new SpeechSynthesisUtterance(englishText);
    
    // 强制设置英语
    this.currentUtterance.lang = 'en-US';
    
    // 设置语音参数
    this.currentUtterance.rate = options.rate || 0.9; // 稍慢，避免卡顿
    this.currentUtterance.pitch = options.pitch || 1.0;
    this.currentUtterance.volume = options.volume || 1.0;
    
    // 使用选定的英语语音
    if (this.englishVoice) {
      this.currentUtterance.voice = this.englishVoice;
    }

    // 事件监听
    this.currentUtterance.onstart = () => {
      console.log('Started speaking:', englishText);
      if (options.onStart) {
        options.onStart();
      }
    };

    this.currentUtterance.onend = () => {
      console.log('Speech ended');
      if (options.onEnd) {
        options.onEnd();
      }
      this.currentUtterance = null;
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      if (options.onError) {
        options.onError(event.error || 'Unknown error');
      }
      // 如果出错，尝试使用备用方案
      this.fallbackSpeak(englishText, options);
    };

    // 添加延迟以避免卡顿
    setTimeout(() => {
      speechSynthesis.speak(this.currentUtterance!);
    }, 100);
  }

  // 备用语音方案
  private fallbackSpeak(text: string, options: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  } = {}) {
    console.log('Using fallback speech method');
    
    // 重试浏览器API
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = options.rate || 0.8;
      
      utterance.onstart = () => {
        if (options.onStart) {
          options.onStart();
        }
      };
      
      utterance.onend = () => {
        if (options.onEnd) {
          options.onEnd();
        }
      };
      
      utterance.onerror = () => {
        if (options.onError) {
          options.onError('Fallback speech failed');
        }
      };
      
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Fallback speech failed:', error);
      if (options.onError) {
        options.onError('Speech synthesis failed completely');
      }
    }
  }

  stop() {
    speechSynthesis.cancel();
    if (this.currentUtterance) {
      this.currentUtterance = null;
    }
  }

  pause() {
    speechSynthesis.pause();
  }

  resume() {
    speechSynthesis.resume();
  }
}

// 导出单例实例
export const voiceService = new EnglishVoiceService();
export default voiceService;

