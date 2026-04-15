/**
 * B2: OTC与补充剂推荐API路由
 */

import { Router, Request, Response } from 'express';
import * as recommendationService from '../services/recommendationService';
import * as personalizedService from '../services/personalizedRecommendationService';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate as any);

// ==================== 个性化推荐 ====================

/**
 * POST /api/personalized-recommendations
 * Generate AI-powered personalized supplement recommendations
 */
router.post('/personalized-recommendations', async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.body;
    const userId = req.user!.userId;

    const result = await personalizedService.generatePersonalizedRecommendations(
      userId,
      category || 'general'
    );

    res.json({
      success: true,
      data: result,
      message: 'Personalized recommendations generated successfully',
    });
  } catch (error: any) {
    console.error('Personalized recommendation generation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PERSONALIZED_RECOMMENDATION_FAILED',
        message: error.message || 'Failed to generate personalized recommendations',
      },
    });
  }
});

// ==================== 推荐生成 ====================

/**
 * POST /api/recommendations/generate
 * 生成个性化推荐
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { focus } = req.body;
    const userId = req.user!.userId;

    const recommendation = await recommendationService.generateRecommendations({
      userId,
      focus,
    });

    res.json({
      success: true,
      data: recommendation,
      message: '推荐生成成功',
    });
  } catch (error: any) {
    console.error('生成推荐失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMENDATION_GENERATION_FAILED',
        message: error.message || '生成推荐失败',
      },
    });
  }
});

// ==================== 推荐查询 ====================

/**
 * GET /api/recommendations
 * 获取用户的推荐历史
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getUserRecommendations(userId, limit);

    res.json({
      success: true,
      data: recommendations,
      metadata: {
        total: recommendations.length,
      },
    });
  } catch (error: any) {
    console.error('获取推荐历史失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_RECOMMENDATIONS_FAILED',
        message: error.message || '获取推荐历史失败',
      },
    });
  }
});

/**
 * GET /api/recommendations/:id
 * 获取推荐详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recommendation = await recommendationService.getRecommendation(id);

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error: any) {
    console.error('获取推荐详情失败:', error);
    res.status(404).json({
      success: false,
      error: {
        code: 'RECOMMENDATION_NOT_FOUND',
        message: error.message || '推荐不存在',
      },
    });
  }
});

/**
 * POST /api/recommendations/:id/feedback
 * 提交用户反馈
 */
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, accepted, comment } = req.body;

    // 验证评分
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: '评分必须在1-5之间',
        },
      });
    }

    const recommendation = await recommendationService.submitFeedback(id, {
      rating,
      accepted,
      comment,
    });

    res.json({
      success: true,
      data: recommendation,
      message: '反馈提交成功',
    });
  } catch (error: any) {
    console.error('提交反馈失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FEEDBACK_SUBMISSION_FAILED',
        message: error.message || '提交反馈失败',
      },
    });
  }
});

// ==================== 补充剂查询 ====================

/**
 * GET /api/recommendations/supplements
 * 搜索补充剂
 */
router.get('/supplements/search', async (req: Request, res: Response) => {
  try {
    const { query, category } = req.query;

    const supplements = await recommendationService.searchSupplements(
      query as string,
      category as string
    );

    res.json({
      success: true,
      data: supplements,
      metadata: {
        total: supplements.length,
      },
    });
  } catch (error: any) {
    console.error('搜索补充剂失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUPPLEMENT_SEARCH_FAILED',
        message: error.message || '搜索补充剂失败',
      },
    });
  }
});

/**
 * GET /api/recommendations/supplements/categories
 * 获取所有补充剂分类
 */
router.get('/supplements/categories', async (req: Request, res: Response) => {
  try {
    const categories = await recommendationService.getSupplementCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('获取分类失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CATEGORIES_FAILED',
        message: error.message || '获取分类失败',
      },
    });
  }
});

/**
 * GET /api/recommendations/supplements/:id
 * Get supplement detail with complete information
 */
router.get('/supplements/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplement = await recommendationService.getSupplementDetail(id);

    res.json({
      success: true,
      data: supplement,
    });
  } catch (error: any) {
    console.error('Failed to get supplement detail:', error);
    res.status(404).json({
      success: false,
      error: {
        code: 'SUPPLEMENT_NOT_FOUND',
        message: error.message || 'Supplement not found',
      },
    });
  }
});

/**
 * GET /api/recommendations/supplements/:id/complete
 * Get complete supplement detail with all information (precautions, scientific evidence, etc.)
 */
router.get('/supplements/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplementDetailService = await import('../services/supplementDetailService');
    const supplement = await supplementDetailService.getCompleteSupplementDetail(id);

    res.json({
      success: true,
      data: supplement,
    });
  } catch (error: any) {
    console.error('Failed to get complete supplement detail:', error);
    res.status(404).json({
      success: false,
      error: {
        code: 'SUPPLEMENT_NOT_FOUND',
        message: error.message || 'Supplement not found',
      },
    });
  }
});

// ==================== 关注列表 ====================

/**
 * GET /api/recommendations/watchlist
 * 获取用户关注列表
 */
router.get('/watchlist/items', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const watchlist = await recommendationService.getUserWatchlist(userId);

    res.json({
      success: true,
      data: watchlist,
    });
  } catch (error: any) {
    console.error('获取关注列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_WATCHLIST_FAILED',
        message: error.message || '获取关注列表失败',
      },
    });
  }
});

/**
 * POST /api/recommendations/watchlist
 * 添加到关注列表
 */
router.post('/watchlist', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { supplementId, notes, targetPrice } = req.body;

    if (!supplementId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SUPPLEMENT_ID',
          message: '补充剂ID不能为空',
        },
      });
    }

    const watchlistItem = await recommendationService.addToWatchlist(
      userId,
      supplementId,
      notes,
      targetPrice
    );

    res.json({
      success: true,
      data: watchlistItem,
      message: '已添加到关注列表',
    });
  } catch (error: any) {
    console.error('添加到关注列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_TO_WATCHLIST_FAILED',
        message: error.message || '添加到关注列表失败',
      },
    });
  }
});

/**
 * DELETE /api/recommendations/watchlist/:supplementId
 * 从关注列表移除
 */
router.delete('/watchlist/:supplementId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { supplementId } = req.params;

    await recommendationService.removeFromWatchlist(userId, supplementId);

    res.json({
      success: true,
      message: '已从关注列表移除',
    });
  } catch (error: any) {
    console.error('从关注列表移除失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_FROM_WATCHLIST_FAILED',
        message: error.message || '从关注列表移除失败',
      },
    });
  }
});

export default router;

