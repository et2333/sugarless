/** Browser speech synthesis that follows the application's global language. */

export type VoiceLocale = 'zh-CN' | 'en-US';

interface SpeakOptions {
  language?: VoiceLocale;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

class VoiceService {
  private voices: SpeechSynthesisVoice[] = [];
  private language: VoiceLocale = 'en-US';

  constructor() {
    this.loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    this.voices = speechSynthesis.getVoices();
  }

  setLanguage(language: VoiceLocale) {
    this.language = language;
  }

  private selectVoice(language: VoiceLocale): SpeechSynthesisVoice | null {
    const exact = this.voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase());
    if (exact) return exact;
    const base = language.split('-')[0].toLowerCase();
    return this.voices.find((voice) => voice.lang.toLowerCase().startsWith(base)) || null;
  }

  private cleanText(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_#`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  speak(text: string, options: SpeakOptions = {}) {
    this.stop();
    const spokenText = this.cleanText(text);
    if (!spokenText) {
      options.onError?.('No text to speak');
      return;
    }

    const language = options.language || this.language;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = language;
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;
    utterance.voice = this.selectVoice(language);
    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => {
      options.onEnd?.();
    };
    utterance.onerror = (event) => {
      options.onError?.(event.error || 'Speech synthesis failed');
    };
    speechSynthesis.speak(utterance);
  }

  stop() {
    speechSynthesis.cancel();
  }

  pause() {
    speechSynthesis.pause();
  }

  resume() {
    speechSynthesis.resume();
  }
}

export const voiceService = new VoiceService();
export default voiceService;
