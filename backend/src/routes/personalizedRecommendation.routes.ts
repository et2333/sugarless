/**
 * Personalized Recommendation API Routes
 * POST /api/personalized-recommendations
 */

import { Router, Request, Response } from 'express';
import * as personalizedService from '../services/personalizedRecommendationService';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * POST /api/personalized-recommendations
 * Generate AI-powered personalized supplement recommendations based on user health profile
 */
router.post('/', async (req: AuthRequest, res: Response) => {
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

export default router;

