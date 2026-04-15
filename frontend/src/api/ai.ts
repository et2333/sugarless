/**
 * AI API Client
 * AI健康助手相关API调用
 */

import apiClient from './client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    isAudio?: boolean;
    isEmergency?: boolean;
    suggestions?: string[];
  };
}

export interface ChatResponse {
  success: boolean;
  data: {
    response: string;
    originalMessage: string;
    isAudio: boolean;
    isEmergency?: boolean;
    actionResult?: any;
    suggestions: string[];
    quickReplies: string[];
  };
  message: string;
}

export interface AIStatusResponse {
  success: boolean;
  data: {
    geminiAI: {
      status: 'connected' | 'disconnected';
      model: string;
    };
    assemblyAI: {
      status: 'connected' | 'disconnected';
      features: string[];
    };
    overall: 'healthy' | 'degraded';
  };
  message: string;
}

const aiApi = {
  /**
   * 发送聊天消息
   */
  sendMessage: async (message: string, isAudio = false, audioUrl?: string): Promise<ChatResponse> => {
    const response = await apiClient.post('/ai/chat', {
      message,
      isAudio,
      audioUrl,
    });
    return response; // apiClient already returns response.data, so we don't need .data again
  },

  /**
   * 获取对话历史
   */
  getChatHistory: async (limit = 50) => {
    const response = await apiClient.get(`/ai/chat/history?limit=${limit}`);
    return response; // apiClient already returns response.data
  },

  /**
   * 获取快速回复建议（支持多语言）
   */
  getQuickReplies: async (lang?: string) => {
    const langParam = lang ? `?lang=${lang}` : '';
    const response = await apiClient.get(`/ai/quick-replies${langParam}`);
    return response; // apiClient already returns response.data
  },

  /**
   * 语音转文字
   */
  transcribeAudio: async (audioUrl: string) => {
    const response = await apiClient.post('/ai/transcribe', { audioUrl });
    return response; // apiClient already returns response.data
  },

  /**
   * 获取AI服务状态
   */
  getStatus: async (): Promise<AIStatusResponse> => {
    const response = await apiClient.get('/ai/status');
    return response; // apiClient already returns response.data
  },
};

export default aiApi;
