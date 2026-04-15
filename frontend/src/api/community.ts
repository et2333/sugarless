/**
 * Community API Client
 */

import apiClient from './client';

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  type: 'story' | 'question' | 'tip' | 'achievement' | 'support';
  title: string;
  content: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isAnonymous: boolean;
  createdAt: string;
  author?: {
    id: string;
    profile?: {
      firstName: string;
      lastName: string;
      diabetesType: string;
    };
  };
}

export interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  isAnonymous: boolean;
  replies?: Comment[];
}

export interface CommunityStats {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  activeUsers: number;
  popularTags: Array<{ tag: string; count: number }>;
  recentActivity: Array<{
    type: 'post' | 'comment' | 'like';
    userId: string;
    authorName: string;
    content: string;
    timestamp: string;
  }>;
}

export const communityApi = {
  // 创建帖子
  createPost: (data: {
    type: 'story' | 'question' | 'tip' | 'achievement' | 'support';
    title: string;
    content: string;
    tags: string[];
    isAnonymous?: boolean;
  }) => apiClient.post('/community/posts', data),

  // 获取帖子列表
  getPosts: (options: {
    page?: number;
    limit?: number;
    type?: string;
    tags?: string[];
    search?: string;
    sortBy?: 'newest' | 'popular' | 'trending';
  } = {}) => {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.type) params.append('type', options.type);
    if (options.tags) params.append('tags', options.tags.join(','));
    if (options.search) params.append('search', options.search);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    return apiClient.get(`/community/posts?${params.toString()}`);
  },

  // 获取单个帖子
  getPost: (postId: string) =>
    apiClient.get(`/community/posts/${postId}`),

  // 添加评论
  addComment: (postId: string, data: {
    content: string;
    parentId?: string;
    isAnonymous?: boolean;
  }) => apiClient.post(`/community/posts/${postId}/comments`, data),

  // 点赞/取消点赞
  toggleLike: (postId: string) =>
    apiClient.post(`/community/posts/${postId}/like`),

  // 获取社区统计
  getStats: () =>
    apiClient.get('/community/stats'),

  // 获取我的帖子
  getMyPosts: (page: number = 1, limit: number = 20) =>
    apiClient.get(`/community/my-posts?page=${page}&limit=${limit}`),

  // 获取热门标签
  getPopularTags: () =>
    apiClient.get('/community/popular-tags'),

  // 获取最近活动
  getRecentActivity: () =>
    apiClient.get('/community/recent-activity'),
};
