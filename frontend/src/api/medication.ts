import apiClient from './client';

export interface Medication {
  id: string;
  userId: string;
  name: string;
  genericName?: string;
  brand?: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'other';
  prescribedDose: number;
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'as_needed' | 'other';
  timings: string[];
  currentQuantity: number;
  refillThreshold: number;
  prescribedBy?: string;
  prescriptionDate?: string;
  validUntil?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicationDto {
  name: string;
  genericName?: string;
  brand?: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'other';
  prescribedDose: number;
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'as_needed' | 'other';
  timings?: string[];
  currentQuantity: number;
  refillThreshold?: number;
  prescribedBy?: string;
  prescriptionDate?: string;
  validUntil?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface RefillAlert {
  id: string;
  userId: string;
  medicationId: string;
  alertType: 'low_stock' | 'out_of_stock';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  daysRemaining: number;
  estimatedRunOutDate: string;
  status: 'pending' | 'acknowledged' | 'dismissed';
  createdAt: string;
  acknowledgedAt?: string;
  medication?: Medication;
}

export const medicationAPI = {
  // 获取所有药物
  async getMedications(includeInactive: boolean = false): Promise<Medication[]> {
    const params = includeInactive ? { includeInactive: 'true' } : {};
    const response = await apiClient.get('/medications', { params });
    return response.data;
  },

  // 获取单个药物
  async getMedication(id: string): Promise<Medication> {
    const response = await apiClient.get(`/medications/${id}`);
    return response.data;
  },

  // 创建药物
  async createMedication(data: CreateMedicationDto): Promise<Medication> {
    const response = await apiClient.post('/medications', data);
    return response.data;
  },

  // 更新药物
  async updateMedication(id: string, data: Partial<CreateMedicationDto>): Promise<Medication> {
    const response = await apiClient.put(`/medications/${id}`, data);
    return response.data;
  },

  // 停用药物
  async deleteMedication(id: string): Promise<void> {
    await apiClient.delete(`/medications/${id}`);
  },

  // 重新启用药物
  async activateMedication(id: string): Promise<void> {
    await apiClient.post(`/medications/${id}/activate`);
  },

  // 更新药物数量
  async updateQuantity(id: string, change: number): Promise<Medication> {
    const response = await apiClient.post(`/medications/${id}/quantity`, { change });
    return response.data;
  },

  // 获取补充提醒
  async getRefillAlerts(): Promise<RefillAlert[]> {
    const response = await apiClient.get('/medications/alerts/refill');
    return response.data;
  },

  // 确认提醒
  async acknowledgeAlert(id: string): Promise<RefillAlert> {
    const response = await apiClient.post(`/medications/alerts/refill/${id}/acknowledge`);
    return response.data;
  },
};

