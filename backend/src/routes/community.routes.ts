/**
 * Community Routes
 * From Report: UC-C2.1 Community Interaction, UC-C2.2 Community Follow-Up
 */

import { Router } from 'express';
import { z } from 'zod';
import { CommunityService } from '../services/communityService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 帖子创建验证schema
const createPostSchema = z.object({
  type: z.enum(['story', 'question', 'tip', 'achievement', 'support']),
  title: z.string().min(1, '标题不能为空').max(200, '标题过长'),
  content: z.string().min(1, '内容不能为空').max(5000, '内容过长'),
  tags: z.array(z.string()).max(10, '标签数量过多'),
  isAnonymous: z.boolean().optional(),
});

// 评论创建验证schema
const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(1000, '评论过长'),
  parentId: z.string().optional(),
  isAnonymous: z.boolean().optional(),
});

/**
 * POST /api/community/posts
 * 创建新帖子
 */
router.post('/posts', async (req: AuthRequest, res) => {
  try {
    const data = createPostSchema.parse(req.body);
    
    const post = await CommunityService.createPost({
      userId: req.user!.userId,
      ...data,
    });

    res.status(201).json({
      success: true,
      data: post,
      message: '帖子发布成功',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new AppError('输入验证失败', 400, 'VALIDATION_ERROR');
    }
    throw error;
  }
});

/**
 * GET /api/community/posts
 * 获取帖子列表
 */
router.get('/posts', async (req: AuthRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      tags, 
      search, 
      sortBy = 'newest' 
    } = req.query;

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as string,
      tags: tags ? (tags as string).split(',') : undefined,
      search: search as string,
      sortBy: sortBy as 'newest' | 'popular' | 'trending',
    };

    const result = await CommunityService.getPosts(options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    throw new AppError('获取帖子列表失败', 500, 'POSTS_ERROR');
  }
});

/**
 * GET /api/community/posts/:postId
 * 获取单个帖子详情
 */
router.get('/posts/:postId', async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    
    const post = await CommunityService.getPost(postId);

    if (!post) {
      throw new AppError('帖子未找到', 404, 'POST_NOT_FOUND');
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    throw new AppError('获取帖子详情失败', 500, 'POST_ERROR');
  }
});

/**
 * POST /api/community/posts/:postId/comments
 * 添加评论
 */
router.post('/posts/:postId/comments', async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const data = createCommentSchema.parse(req.body);
    
    const comment = await CommunityService.addComment({
      postId,
      userId: req.user!.userId,
      ...data,
    });

    res.status(201).json({
      success: true,
      data: comment,
      message: '评论发布成功',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new AppError('输入验证失败', 400, 'VALIDATION_ERROR');
    }
    throw error;
  }
});

/**
 * POST /api/community/posts/:postId/like
 * 点赞/取消点赞
 */
router.post('/posts/:postId/like', async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    
    const result = await CommunityService.toggleLike(postId, req.user!.userId);

    res.json({
      success: true,
      data: result,
      message: result.liked ? '点赞成功' : '取消点赞成功',
    });
  } catch (error: any) {
    throw new AppError('操作失败', 500, 'LIKE_ERROR');
  }
});

/**
 * GET /api/community/stats
 * 获取社区统计信息
 */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = await CommunityService.getCommunityStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    throw new AppError('获取社区统计失败', 500, 'STATS_ERROR');
  }
});

/**
 * GET /api/community/my-posts
 * 获取我的帖子
 */
router.get('/my-posts', async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await CommunityService.getPosts({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      userId: req.user!.userId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    throw new AppError('获取我的帖子失败', 500, 'MY_POSTS_ERROR');
  }
});

/**
 * GET /api/community/popular-tags
 * 获取热门标签
 */
router.get('/popular-tags', async (req: AuthRequest, res) => {
  try {
    const stats = await CommunityService.getCommunityStats();

    res.json({
      success: true,
      data: stats.popularTags,
    });
  } catch (error: any) {
    throw new AppError('获取热门标签失败', 500, 'TAGS_ERROR');
  }
});

/**
 * GET /api/community/recent-activity
 * 获取最近活动
 */
router.get('/recent-activity', async (req: AuthRequest, res) => {
  try {
    const stats = await CommunityService.getCommunityStats();

    res.json({
      success: true,
      data: stats.recentActivity,
    });
  } catch (error: any) {
    throw new AppError('获取最近活动失败', 500, 'ACTIVITY_ERROR');
  }
});

export default router;
