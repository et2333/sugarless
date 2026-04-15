/**
 * Blood Sugar API Client
 */

import apiClient from './client';

export interface BloodSugarRecord {
  id: string;
  value: number;
  unit: string;
  type: 'fasting' | 'post_prandial' | 'random' | 'hba1c';
  measurementTime: string;
  mealContext?: any;
  symptoms?: string[];
  notes?: string;
  device?: any;
  location?: string;
  tags?: string[];
  createdAt: string;
}

export interface BloodSugarTrend {
  period: string;
  average: number;
  min: number;
  max: number;
  readings: number;
  targetRange: { min: number; max: number };
  inRangePercentage: number;
  timeInRange: number;
  variability: number;
}

export interface BloodSugarInsight {
  type: 'high' | 'low' | 'trend' | 'pattern' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation?: string;
  confidence: number;
  timestamp: string;
  data?: any;
}

export interface BloodSugarAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  value?: number;
  threshold?: number;
  timestamp: string;
  acknowledged: boolean;
}

export const bloodSugarApi = {
  // 记录血糖读数
  recordReading: (data: Omit<BloodSugarRecord, 'id' | 'createdAt'>) =>
    apiClient.post('/blood-sugar/record', data),

  // 获取血糖趋势
  getTrends: (period: string = 'week', startDate?: string, endDate?: string) =>
    apiClient.get(`/blood-sugar/trends?period=${period}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`),

  // 获取智能洞察
  getInsights: (limit: number = 10) =>
    apiClient.get(`/blood-sugar/insights?limit=${limit}`),

  // 获取警报
  getAlerts: (activeOnly: boolean = true) =>
    apiClient.get(`/blood-sugar/alerts?activeOnly=${activeOnly}`),

  // 确认警报
  acknowledgeAlert: (alertId: string) =>
    apiClient.put(`/blood-sugar/alerts/${alertId}/acknowledge`),

  // 获取记录列表
  getRecords: (page: number = 1, limit: number = 20, type?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiClient.get(`/blood-sugar/records?${params.toString()}`);
  },

  // 删除记录
  deleteRecord: (recordId: string) =>
    apiClient.delete(`/blood-sugar/records/${recordId}`),
};
