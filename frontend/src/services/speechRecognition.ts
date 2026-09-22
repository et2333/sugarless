/**
 * Improved Speech Recognition Service
 * 改进的语音识别服务，提高准确性
 */

type RecognitionLocale = 'zh-CN' | 'en-US';

class ImprovedSpeechRecognition {
  private recognition: any;
  private isSupported: boolean;

  constructor(language: RecognitionLocale = 'en-US') {
    this.isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    
    if (this.isSupported) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition(language);
    }
  }

  private setupRecognition(language: RecognitionLocale) {
    // 关键设置
    this.recognition.lang = language;
    this.recognition.continuous = false; // 单次识别
    this.recognition.interimResults = false; // 不要临时结果
    this.recognition.maxAlternatives = 1;
    
    // 提高准确性的设置
    try {
      if (language === 'en-US' && ('webkitSpeechGrammarList' in window || 'SpeechGrammarList' in window)) {
        const SpeechGrammarList = (window as any).webkitSpeechGrammarList || (window as any).SpeechGrammarList;
        const grammar = `#JSGF V1.0;
        grammar health;
        public <command> = record blood sugar <number> |
                          remind me at <time> |
                          weather today |
                          rainy day | sunny day | cloudy |
                          take medication | medicine reminder |
                          remind me to take <medication> |
                          my blood sugar is <number>;
        <number> = one | two | three | four | five | six | seven | eight | nine | ten |
                   eleven | twelve | thirteen | fourteen | fifteen | sixteen | seventeen |
                   eighteen | nineteen | twenty | thirty | forty | fifty | sixty | seventy |
                   eighty | ninety | hundred |
                   1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
                   15 | 16 | 17 | 18 | 19 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 |
                   100 | 110 | 120 | 130 | 140 | 150;
        <time> = 1 AM | 2 AM | 3 AM | 4 AM | 5 AM | 6 AM | 7 AM | 8 AM | 9 AM |
                 10 AM | 11 AM | 12 PM | 1 PM | 2 PM | 3 PM | 4 PM | 5 PM |
                 6 PM | 7 PM | 8 PM | 9 PM | 10 PM | 11 PM | 12 AM;`;
        
        const speechRecognitionList = new SpeechGrammarList();
        speechRecognitionList.addFromString(grammar, 1);
        this.recognition.grammars = speechRecognitionList;
      }
    } catch (error) {
      console.warn('Grammar setup failed:', error);
      // 继续，不使用grammar
    }
  }

  // 清理识别结果
  private cleanRecognitionResult(text: string): string {
    // 修复常见识别错误
    const corrections: Record<string, string> = {
      'remained me': 'remind me',
      'remained': 'remind',
      'and to': 'at',
      'raining day': 'rainy day',
      '9:00 p.m.': '9 PM',
      '9 p.m.': '9 PM',
      '10 p.m.': '10 PM',
      '8 p.m.': '8 PM',
      'weather today': 'weather',
      'bloodsugar': 'blood sugar',
      'blood sugar is': 'blood sugar is',
      'record my blood sugar': 'record blood sugar',
      'can you record': 'record',
      'help me record': 'record',
    };

    let cleaned = text.toLowerCase().trim();
    
    // 应用修正
    for (const [wrong, right] of Object.entries(corrections)) {
      cleaned = cleaned.replace(new RegExp(wrong, 'gi'), right);
    }
    
    // 移除多余的标点
    cleaned = cleaned.replace(/[.,!?;]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  // 开始识别
  start(): Promise<string> {
    if (!this.isSupported) {
      return Promise.reject(new Error('Speech recognition not supported'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.recognition.stop();
        reject(new Error('Speech recognition timeout'));
      }, 10000); // 10秒超时

      this.recognition.onresult = (event: any) => {
        clearTimeout(timeout);
        if (event.results && event.results.length > 0) {
          const rawText = event.results[0][0].transcript;
          const cleanedText = this.cleanRecognitionResult(rawText);
          console.log('Raw recognition:', rawText, '→ Cleaned:', cleanedText);
          resolve(cleanedText);
        } else {
          reject(new Error('No recognition result'));
        }
      };

      this.recognition.onerror = (event: any) => {
        clearTimeout(timeout);
        console.error('Recognition error:', event.error);
        
        // 不抛出错误对于某些情况
        if (event.error === 'no-speech') {
          reject(new Error('No speech detected'));
        } else if (event.error === 'audio-capture') {
          reject(new Error('No microphone found'));
        } else {
          reject(new Error(`Recognition error: ${event.error}`));
        }
      };

      this.recognition.onend = () => {
        clearTimeout(timeout);
      };

      try {
        this.recognition.start();
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.message && error.message.includes('already started')) {
          this.recognition.stop();
          setTimeout(() => {
            this.recognition.start();
          }, 100);
        } else {
          reject(error);
        }
      }
    });
  }

  stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore stop errors
      }
    }
  }

  getSupported(): boolean {
    return this.isSupported;
  }
}

export default ImprovedSpeechRecognition;

