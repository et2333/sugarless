import apiClient from './client';

export interface Reminder {
  id: string;
  userId: string;
  type: 'medication' | 'glucose_check' | 'meal' | 'exercise' | 'appointment' | 'review' | 'other';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  scheduleType: 'once' | 'daily' | 'weekly' | 'custom';
  scheduleTime: string;
  daysOfWeek: number[];
  startDate: string;
  endDate?: string;
  relatedId?: string;
  noResponseCount?: number;
  lastRemindedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderDto {
  type: 'medication' | 'glucose_check' | 'meal' | 'exercise' | 'appointment' | 'review' | 'other';
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  scheduleType: 'once' | 'daily' | 'weekly' | 'custom';
  scheduleTime: string;
  daysOfWeek?: number[];
  startDate?: string;
  endDate?: string;
  relatedId?: string;
  isActive?: boolean;
}

export interface ReminderCompletion {
  id: string;
  reminderId: string;
  completedAt: string;
  skipped: boolean;
  note?: string;
}

export interface NoResponseReminder {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  noResponseCount: number;
  lastRemindedAt?: string;
  createdAt: string;
}

export const reminderAPI = {
  // 获取所有提醒
  async getReminders(): Promise<Reminder[]> {
    try {
      const response = await apiClient.get('/reminders');
      console.log('getReminders response:', response);
      console.log('response type:', typeof response);
      console.log('response.data:', response?.data);
      console.log('is response.data array?', Array.isArray(response?.data));
      
      // apiClient already returns response.data, so we need to access the nested data field
      // 后端返回格式: { success: true, data: [...] }
      // apiClient 拦截器已经返回了 response.data，所以这里的 response 就是 { success: true, data: [...] }
      
      // 处理不同的响应格式
      if (Array.isArray(response)) {
        console.log('✅ Response is array directly');
        return response;
      }
      
      if (response && typeof response === 'object') {
        // 优先检查 response.data 是否是数组
        if (Array.isArray(response.data)) {
          console.log('✅ Response.data is array');
          return response.data;
        }
        // 检查是否有 success 字段
        if ('success' in response && 'data' in response) {
          console.log('✅ Response has success and data fields');
          if (Array.isArray(response.data)) {
            return response.data;
          }
        }
      }
      
      console.error('❌ Unexpected response format for getReminders:', response);
      console.error('Response keys:', response ? Object.keys(response) : 'null');
      return [];
    } catch (error) {
      console.error('Error fetching reminders:', error);
      throw error;
    }
  },

  // 获取单个提醒
  async getReminder(id: string): Promise<Reminder> {
    const response = await apiClient.get(`/reminders/${id}`);
    return response.data;
  },

  // 创建提醒
  async createReminder(data: CreateReminderDto): Promise<Reminder> {
    const response = await apiClient.post('/reminders', data);
    return response.data;
  },

  // 更新提醒
  async updateReminder(id: string, data: Partial<CreateReminderDto>): Promise<Reminder> {
    const response = await apiClient.put(`/reminders/${id}`, data);
    return response.data;
  },

  // 删除提醒
  async deleteReminder(id: string): Promise<void> {
    await apiClient.delete(`/reminders/${id}`);
  },

  // 标记完成
  async completeReminder(id: string, note?: string, skipped: boolean = false): Promise<ReminderCompletion> {
    const response = await apiClient.post(`/reminders/${id}/complete`, { note, skipped });
    return response.data;
  },

  // 跳过提醒
  async skipReminder(id: string, note?: string): Promise<ReminderCompletion> {
    const response = await apiClient.post(`/reminders/${id}/complete`, { note, skipped: true });
    return response.data;
  },

  // 获取完成历史
  async getCompletions(id: string): Promise<ReminderCompletion[]> {
    const response = await apiClient.get(`/reminders/${id}/completions`);
    return response.data;
  },

  // 获取需要特别关注的提醒（连续3次没有反馈）
  async getNoResponseReminders(): Promise<NoResponseReminder[]> {
    try {
      const response = await apiClient.get('/reminders/no-response-reminders');
      console.log('getNoResponseReminders response:', response);
      console.log('getNoResponseReminders response.data:', response?.data);
      
      // 处理不同的响应格式
      if (Array.isArray(response)) {
        console.log('✅ No-response reminders: response is array');
        return response;
      }
      
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          console.log('✅ No-response reminders: response.data is array');
          return response.data;
        }
        if ('success' in response && 'data' in response) {
          console.log('✅ No-response reminders: has success and data');
          if (Array.isArray(response.data)) {
            return response.data;
          }
        }
      }
      
      console.warn('❌ Unexpected response format for getNoResponseReminders:', response);
      return [];
    } catch (error) {
      console.error('Error fetching no-response reminders:', error);
      // 这个 API 失败不应该阻止整个页面
      return [];
    }
  },

  // 增加无反馈计数
  async incrementNoResponse(id: string): Promise<any> {
    const response = await apiClient.post(`/reminders/${id}/increment-no-response`);
    return response.data;
  },
};

