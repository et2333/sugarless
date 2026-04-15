/**
 * 模拟支付路由 - 用于开发和演示
 * Mock Payment Routes for Development and Demo
 */

import { Router } from 'express';
import { z } from 'zod';
import { MockPaymentService } from '../services/mockPaymentService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * POST /api/mock-payment/create-intent
 * 创建模拟支付意图
 */
router.post('/create-intent', async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      throw new AppError('订单ID不能为空', 400, 'MISSING_ORDER_ID');
    }

    console.log(`🎭 [模拟支付] 创建支付意图，订单ID: ${orderId}`);

    const paymentIntent = await MockPaymentService.createPaymentIntent(orderId);

    console.log(`✅ [模拟支付] 支付意图创建成功: ${paymentIntent.id}`);

    res.json({
      success: true,
      data: paymentIntent,
      message: '支付意图创建成功',
    });
  } catch (error: any) {
    console.error('❌ [模拟支付] 创建支付意图失败:', error);
    throw new AppError(
      error.message || '创建支付意图失败',
      500,
      'CREATE_INTENT_ERROR'
    );
  }
});

/**
 * POST /api/mock-payment/confirm
 * 确认模拟支付
 */
router.post('/confirm', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      clientSecret: z.string(),
      cardNumber: z.string(),
    });

    const { clientSecret, cardNumber } = schema.parse(req.body);

    console.log(`🎭 [模拟支付] 确认支付，卡号: ${cardNumber.slice(0, 4)}****`);

    const result = await MockPaymentService.confirmPayment(clientSecret, cardNumber);

    if (result.success) {
      console.log(`✅ [模拟支付] 支付成功`);
      res.json({
        success: true,
        message: '支付成功',
      });
    } else {
      console.log(`❌ [模拟支付] 支付失败: ${result.error}`);
      res.status(400).json({
        success: false,
        message: result.error || '支付失败',
      });
    }
  } catch (error: any) {
    console.error('❌ [模拟支付] 确认支付失败:', error);
    throw new AppError(
      error.message || '确认支付失败',
      500,
      'CONFIRM_PAYMENT_ERROR'
    );
  }
});

/**
 * GET /api/mock-payment/intent/:id
 * 获取支付意图详情
 */
router.get('/intent/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const paymentIntent = await MockPaymentService.getPaymentIntent(id);

    res.json({
      success: true,
      data: paymentIntent,
    });
  } catch (error: any) {
    throw new AppError(
      error.message || '获取支付意图失败',
      500,
      'GET_INTENT_ERROR'
    );
  }
});

export default router;

