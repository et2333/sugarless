/**
 * Notification API Client - 邮件和短信服务
 */

import apiClient from './client';

export interface EmailTestRequest {
  to: string;
  type?: 'test' | 'verification' | 'blood-sugar-alert' | 'medication-reminder' | 'meal-plan' | 'order-update';
}

export interface SmsTestRequest {
  to: string;
  type?: 'test' | 'verification' | 'blood-sugar-alert' | 'medication-reminder' | 'appointment-reminder' | 'emergency';
}

export interface ValidatePhoneRequest {
  phone: string;
}

export interface PushSubscriptionRequest {
  deviceToken: string;
  platform?: 'web';
}

export interface PushTestRequest {
  deviceToken: string;
  type?: 'test' | 'blood-sugar-alert' | 'medication-reminder' | 'appointment-reminder';
}

export const notificationApi = {
  // 邮件服务API
  email: {
    // 发送测试邮件
    sendTest: (data: EmailTestRequest) =>
      apiClient.post('/test-email/send', data),
    
    // 检查邮件服务状态
    getStatus: () => apiClient.get('/test-email/status'),
  },

  // 短信服务API
  sms: {
    // 发送测试短信
    sendTest: (data: SmsTestRequest) =>
      apiClient.post('/test-sms/send', data),
    
    // 检查短信服务状态
    getStatus: () => apiClient.get('/test-sms/status'),
    
    // 验证手机号码
    validatePhone: (data: ValidatePhoneRequest) =>
      apiClient.post('/test-sms/validate-phone', data),
  },

  // 推送通知API
  push: {
    // 保存推送订阅
    saveSubscription: (data: PushSubscriptionRequest) =>
      apiClient.post('/notifications/channels', {
        type: 'push',
        address: data.deviceToken,
        platform: data.platform || 'web',
      }),
    
    // 发送测试推送
    sendTest: (data: PushTestRequest) =>
      apiClient.post('/notifications/send', {
        type: 'push',
        deviceToken: data.deviceToken,
        title: '测试推送',
        content: '这是一条测试推送通知',
        metadata: {
          type: data.type || 'test',
        },
      }),
    
    // 获取VAPID公钥
    getVapidKey: () => apiClient.get('/notifications/push/vapid-key'),
  },
};
