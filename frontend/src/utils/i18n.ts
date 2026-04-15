/**
 * Internationalization (i18n) Configuration
 * 国际化配置
 */

export type SupportedLanguage = 'zh' | 'en';

export interface AIAssistantTranslations {
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  sendButton: string;
  recordingStart: string;
  recordingStop: string;
  aiThinking: string;
  emergencyDetected: string;
  statusChecking: string;
  statusOnline: string;
  statusOffline: string;
  statusHealthy: string;
  statusDegraded: string;
  quickRepliesTitle: string;
  suggestions: string;
  voiceInput: string;
  repeatLastMessage: string;
  stopPlayback: string;
  clearChat: string;
  noMessages: string;
  welcomeMessage: string;
  errorLoadingStatus: string;
  errorSendingMessage: string;
  recordingNotSupported: string;
  recordingFailed: string;
  languageSwitch: string;
}

const translations: Record<SupportedLanguage, AIAssistantTranslations> = {
  zh: {
    title: 'AI健康助手',
    subtitle: '您的个人健康顾问，随时为您提供专业建议',
    inputPlaceholder: '请输入您的问题或需求...',
    sendButton: '发送',
    recordingStart: '开始录音',
    recordingStop: '停止录音',
    aiThinking: 'AI正在思考...',
    emergencyDetected: '⚠️ 紧急情况检测',
    statusChecking: '检查中',
    statusOnline: '在线',
    statusOffline: '离线',
    statusHealthy: '健康',
    statusDegraded: '降级',
    quickRepliesTitle: '💡 快速回复',
    suggestions: '建议',
    voiceInput: '语音输入',
    repeatLastMessage: '重复播放AI回复',
    stopPlayback: '停止语音播放',
    clearChat: '清空对话',
    noMessages: '暂无对话消息，开始与AI助手对话吧！',
    welcomeMessage: '您好！我是您的AI健康助手，有什么可以帮助您的吗？',
    errorLoadingStatus: '加载AI状态失败',
    errorSendingMessage: '发送消息失败',
    recordingNotSupported: '您的浏览器不支持语音录制',
    recordingFailed: '语音录制失败',
    languageSwitch: '切换到英文'
  },
  en: {
    title: 'AI Health Assistant',
    subtitle: 'Your personal health advisor, always ready to provide professional advice',
    inputPlaceholder: 'Type your question or request...',
    sendButton: 'Send',
    recordingStart: 'Start Recording',
    recordingStop: 'Stop Recording',
    aiThinking: 'AI is thinking...',
    emergencyDetected: '⚠️ Emergency Detected',
    statusChecking: 'Checking',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    statusHealthy: 'Healthy',
    statusDegraded: 'Degraded',
    quickRepliesTitle: '💡 Quick Replies',
    suggestions: 'Suggestions',
    voiceInput: 'Voice Input',
    repeatLastMessage: 'Repeat AI Response',
    stopPlayback: 'Stop Playback',
    clearChat: 'Clear Chat',
    noMessages: 'No messages yet. Start chatting with the AI assistant!',
    welcomeMessage: 'Hello! I\'m your AI Health Assistant. How can I help you today?',
    errorLoadingStatus: 'Failed to load AI status',
    errorSendingMessage: 'Failed to send message',
    recordingNotSupported: 'Your browser does not support voice recording',
    recordingFailed: 'Voice recording failed',
    languageSwitch: 'Switch to Chinese'
  }
};

/**
 * 检测浏览器语言
 * Detect browser language
 */
export function detectBrowserLanguage(): SupportedLanguage {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

/**
 * 获取翻译文本
 * Get translation
 */
export function getTranslation(lang: SupportedLanguage): AIAssistantTranslations {
  return translations[lang] || translations.zh;
}

/**
 * 语言配置 Hook
 */
export function useLanguage() {
  const [language, setLanguage] = React.useState<SupportedLanguage>(() => {
    // 从 localStorage 获取保存的语言偏好
    const saved = localStorage.getItem('preferred_language');
    if (saved === 'zh' || saved === 'en') {
      return saved;
    }
    // 否则使用浏览器语言
    return detectBrowserLanguage();
  });

  const switchLanguage = () => {
    const newLang: SupportedLanguage = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    localStorage.setItem('preferred_language', newLang);
  };

  const t = getTranslation(language);

  return { language, switchLanguage, t };
}

// For non-React usage
import React from 'react';

export default {
  getTranslation,
  detectBrowserLanguage
};

