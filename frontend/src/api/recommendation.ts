/**
 * B2: OTC与补充剂推荐API客户端
 */

import apiClient from './client';

// ==================== 类型定义 ====================

export interface Supplement {
  id: string;
  name: string;
  nameEn?: string;
  type: string;
  category: string;
  activeIngredients: string; // JSON
  benefits: string; // JSON
  indications: string; // JSON
  suitableFor: string; // JSON
  contraindications: string; // JSON
  dosage: string; // JSON
  sideEffects: string; // JSON
  evidenceLevel: string;
  evidenceSources: string; // JSON
  expectedImpact: string; // JSON
  averagePrice?: number;
  imageUrl?: string;
  productUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationItem {
  id: string;
  recommendationId: string;
  supplementId: string;
  rank: number;
  strength: 'strong' | 'moderate' | 'weak';
  reasons: string; // JSON
  expectedImpact: string; // JSON
  evidenceLevel: string;
  evidenceSources: string; // JSON
  interactions: string; // JSON
  pricing?: string; // JSON
  relevanceScore: number;
  createdAt: string;
  supplement?: Supplement;
}

export interface Recommendation {
  id: string;
  userId: string;
  focus?: string;
  items: RecommendationItem[];
  rationale?: string;
  aiModel?: string;
  confidence?: number;
  feedback?: string; // JSON
  status: string;
  generatedAt: string;
  viewedAt?: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  supplementId: string;
  notes?: string;
  targetPrice?: number;
  notifyOnPrice: boolean;
  addedAt: string;
  supplement?: Supplement;
}

export interface GenerateRecommendationRequest {
  focus?: 'blood_sugar' | 'weight' | 'energy' | 'general';
}

export interface SubmitFeedbackRequest {
  rating: number; // 1-5
  accepted: boolean;
  comment?: string;
}

export interface AddToWatchlistRequest {
  supplementId: string;
  notes?: string;
  targetPrice?: number;
}

// ==================== 推荐API ====================

/**
 * 生成个性化推荐
 */
export async function generateRecommendations(
  request: GenerateRecommendationRequest = {}
): Promise<Recommendation> {
  const response = await apiClient.post('/recommendations/generate', request);
  return response.data;
}

/**
 * 获取用户的推荐历史
 */
export async function getUserRecommendations(limit: number = 10): Promise<Recommendation[]> {
  const response = await apiClient.get('/recommendations', {
    params: { limit },
  });
  return response.data;
}

/**
 * 获取推荐详情
 */
export async function getRecommendation(recommendationId: string): Promise<Recommendation> {
  const response = await apiClient.get(`/recommendations/${recommendationId}`);
  return response.data;
}

/**
 * 提交用户反馈
 */
export async function submitFeedback(
  recommendationId: string,
  feedback: SubmitFeedbackRequest
): Promise<Recommendation> {
  const response = await apiClient.post(`/recommendations/${recommendationId}/feedback`, feedback);
  return response.data;
}

// ==================== 补充剂API ====================

/**
 * 搜索补充剂
 */
export async function searchSupplements(
  query?: string,
  category?: string
): Promise<Supplement[]> {
  const response = await apiClient.get('/recommendations/supplements/search', {
    params: { query, category },
  });
  return response.data;
}

/**
 * 获取所有补充剂分类
 */
export async function getSupplementCategories(): Promise<string[]> {
  const response = await apiClient.get('/recommendations/supplements/categories');
  return response.data;
}

/**
 * 获取补充剂详情
 */
export async function getSupplementDetail(supplementId: string): Promise<Supplement> {
  const response = await apiClient.get(`/recommendations/supplements/${supplementId}`);
  return response.data;
}

// ==================== 关注列表API ====================

/**
 * 获取用户关注列表
 */
export async function getUserWatchlist(): Promise<WatchlistItem[]> {
  const response = await apiClient.get('/recommendations/watchlist/items');
  return response.data;
}

/**
 * 添加到关注列表
 */
export async function addToWatchlist(request: AddToWatchlistRequest): Promise<WatchlistItem> {
  const response = await apiClient.post('/recommendations/watchlist', request);
  return response.data;
}

/**
 * 从关注列表移除
 */
export async function removeFromWatchlist(supplementId: string): Promise<void> {
  await apiClient.delete(`/recommendations/watchlist/${supplementId}`);
}

// ==================== 工具函数 ====================

/**
 * 解析JSON字段
 */
export function parseJsonField<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}

/**
 * 格式化循证等级
 */
export function formatEvidenceLevel(level: string): { label: string; color: string } {
  switch (level) {
    case 'A':
      return { label: 'Grade A Evidence (Strong Recommendation)', color: 'green' };
    case 'B':
      return { label: 'Grade B Evidence (Moderate Recommendation)', color: 'blue' };
    case 'C':
      return { label: 'Grade C Evidence (Weak Recommendation)', color: 'orange' };
    case 'D':
      return { label: 'Grade D Evidence (Expert Opinion)', color: 'gray' };
    default:
      return { label: 'Not Rated', color: 'gray' };
  }
}

/**
 * 格式化推荐强度
 */
export function formatStrength(strength: string): { label: string; color: string } {
  switch (strength) {
    case 'strong':
      return { label: 'Strong Recommendation', color: 'green' };
    case 'moderate':
      return { label: 'Moderate Recommendation', color: 'blue' };
    case 'weak':
      return { label: 'Weak Recommendation', color: 'orange' };
    default:
      return { label: 'Unknown', color: 'gray' };
  }
}

/**
 * 格式化相互作用严重程度
 */
export function formatInteractionSeverity(severity: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (severity) {
    case 'severe':
      return { label: '严重', color: 'red', icon: '⛔' };
    case 'moderate':
      return { label: '中度', color: 'orange', icon: '⚠️' };
    case 'mild':
      return { label: '轻度', color: 'yellow', icon: 'ℹ️' };
    default:
      return { label: '未知', color: 'gray', icon: '?' };
  }
}

/**
 * 计算预期改善百分比
 */
export function calculateImprovementPercentage(
  current: number,
  expectedChange: number
): number {
  if (current === 0) return 0;
  return Math.round((Math.abs(expectedChange) / current) * 100);
}

