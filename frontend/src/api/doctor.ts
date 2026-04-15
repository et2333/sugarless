/**
 * Doctor API Client
 */

import apiClient from './client';

export interface DoctorProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  specialization: string;
  qualifications: string[];
  experience: number;
  clinicName?: string;
  clinicAddress?: string;
  phone?: string;
  email?: string;
  consultationFee?: number;
  availableSlots: string[];
  languages: string[];
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  type: 'video' | 'phone' | 'in_person';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  duration: number;
  actualStartAt?: string;
  actualEndAt?: string;
  reason?: string;
  symptoms: string[];
  medications: string[];
  notes?: string;
  prescription?: any;
  fee?: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
  doctor?: DoctorProfile;
}

export interface DoctorStats {
  totalConsultations: number;
  completedConsultations: number;
  pendingConsultations: number;
  totalRevenue: number;
  averageRating: number;
}

export const doctorApi = {
  // 创建或更新医生档案
  createOrUpdateProfile: (data: {
    licenseNumber: string;
    specialization: string;
    qualifications: string[];
    experience: number;
    clinicName?: string;
    clinicAddress?: string;
    phone?: string;
    email?: string;
    consultationFee?: number;
    availableSlots: string[];
    languages: string[];
  }) => apiClient.post('/doctor/profile', data),

  // 获取医生档案
  getProfile: () =>
    apiClient.get('/doctor/profile'),

  // 搜索医生
  searchDoctors: (filters: {
    specialization?: string;
    experience?: number;
    languages?: string[];
    location?: string;
    maxFee?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.specialization) params.append('specialization', filters.specialization);
    if (filters.experience) params.append('experience', filters.experience.toString());
    if (filters.languages) params.append('languages', filters.languages.join(','));
    if (filters.location) params.append('location', filters.location);
    if (filters.maxFee) params.append('maxFee', filters.maxFee.toString());
    return apiClient.get(`/doctor/search?${params.toString()}`);
  },

  // 预约咨询
  bookConsultation: (data: {
    doctorId: string;
    type: 'video' | 'phone' | 'in_person';
    scheduledAt: string;
    duration: number;
    reason?: string;
    symptoms: string[];
    medications: string[];
  }) => apiClient.post('/doctor/consultation', data),

  // 获取医生的咨询列表
  getDoctorConsultations: (status?: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);
    return apiClient.get(`/doctor/consultations?${params.toString()}`);
  },

  // 更新咨询状态
  updateConsultationStatus: (consultationId: string, status: string) =>
    apiClient.put(`/doctor/consultations/${consultationId}/status`, { status }),

  // 添加咨询笔记
  addConsultationNotes: (consultationId: string, notes: string, prescription?: any) =>
    apiClient.put(`/doctor/consultations/${consultationId}/notes`, { notes, prescription }),

  // 获取医生统计信息
  getStats: () =>
    apiClient.get('/doctor/stats'),

  // 获取患者的咨询列表
  getPatientConsultations: (status?: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);
    return apiClient.get(`/doctor/patient-consultations?${params.toString()}`);
  },
};
