/**
 * Payment API Client
 */

import apiClient from './client';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export const paymentApi = {
  // 创建支付意图
  createPaymentIntent: (orderId: string) =>
    apiClient.post('/payment/create-intent', { orderId }),

  // 确认支付
  confirmPayment: (paymentIntentId: string) =>
    apiClient.post('/payment/confirm', { paymentIntentId }),

  // 获取支付方式
  getPaymentMethods: () =>
    apiClient.get('/payment/methods'),

  // 创建退款
  createRefund: (paymentIntentId: string, amount?: number) =>
    apiClient.post('/payment/refund', { paymentIntentId, amount }),

  // Stripe测试API
  test: {
    // 获取Stripe服务状态
    getStatus: () => apiClient.get('/test-stripe/status'),
    
    // 获取账户信息
    getAccountInfo: () => apiClient.get('/test-stripe/account-info'),
    
    // 创建测试支付意图
    createTestIntent: (data: { amount: number; currency: string; description: string }) =>
      apiClient.post('/test-stripe/create-test-intent', data),
    
    // 取消支付意图
    cancelIntent: (paymentIntentId: string) =>
      apiClient.post('/test-stripe/cancel-intent', { paymentIntentId }),
  },
};
