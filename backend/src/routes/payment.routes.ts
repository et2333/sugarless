/**
 * Payment Routes
 * From Report: UC-A3 Order Management - Payment processing
 */

import { Router } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/paymentService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * POST /api/payment/create-intent
 * 创建支付意图
 */
router.post('/create-intent', async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      throw new AppError('订单ID不能为空', 400, 'MISSING_ORDER_ID');
    }

    const paymentIntent = await PaymentService.createPaymentIntent(orderId);

    res.json({
      success: true,
      data: paymentIntent,
      message: '支付意图创建成功',
    });
  } catch (error: any) {
    console.error('创建支付意图失败:', error);
    throw new AppError(
      error.message || '创建支付意图失败', 
      500, 
      'CREATE_INTENT_ERROR'
    );
  }
});

/**
 * POST /api/payment/confirm
 * 确认支付
 */
router.post('/confirm', async (req: AuthRequest, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      throw new AppError('支付意图ID不能为空', 400, 'MISSING_PAYMENT_INTENT_ID');
    }

    const success = await PaymentService.confirmPayment(paymentIntentId);

    res.json({
      success,
      message: success ? '支付确认成功' : '支付确认失败',
    });
  } catch (error: any) {
    throw new AppError('确认支付失败', 500, 'CONFIRM_PAYMENT_ERROR');
  }
});

/**
 * GET /api/payment/methods
 * 获取支付方式
 */
router.get('/methods', async (req: AuthRequest, res) => {
  try {
    const paymentMethods = await PaymentService.getPaymentMethods(req.user!.userId);

    res.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error: any) {
    throw new AppError('获取支付方式失败', 500, 'GET_METHODS_ERROR');
  }
});

/**
 * POST /api/payment/refund
 * 创建退款
 */
router.post('/refund', async (req: AuthRequest, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId) {
      throw new AppError('支付意图ID不能为空', 400, 'MISSING_PAYMENT_INTENT_ID');
    }

    const refund = await PaymentService.createRefund(paymentIntentId, amount);

    res.json({
      success: true,
      data: refund,
      message: '退款创建成功',
    });
  } catch (error: any) {
    throw new AppError('创建退款失败', 500, 'CREATE_REFUND_ERROR');
  }
});

/**
 * POST /api/payment/webhook
 * Stripe webhook处理
 */
router.post('/webhook', async (req: AuthRequest, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      throw new AppError('缺少Stripe签名', 400, 'MISSING_SIGNATURE');
    }

    await PaymentService.handleWebhook(JSON.stringify(req.body), signature);

    res.json({ received: true });
  } catch (error: any) {
    throw new AppError('Webhook处理失败', 500, 'WEBHOOK_ERROR');
  }
});

export default router;
