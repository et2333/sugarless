/**
 * Test Stripe Routes - Stripe支付测试路由
 * 用于测试Stripe支付服务
 */

import { Router } from 'express';
import { PaymentService } from '../services/paymentService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * GET /api/test-stripe/status
 * 检查Stripe服务状态
 */
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    res.json({
      success: true,
      data: {
        service: 'Stripe',
        configured: !!stripeKey,
        secretKey: stripeKey ? '已配置' : '未配置',
        webhookSecret: webhookSecret ? '已配置' : '未配置',
        status: stripeKey ? 'ready' : 'not_configured',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: error.message || '状态检查失败',
      },
    });
  }
});

/**
 * POST /api/test-stripe/create-test-intent
 * 创建测试支付意图
 */
router.post('/create-test-intent', async (req: AuthRequest, res) => {
  try {
    const { amount = 1000, currency = 'aud', description = '测试支付' } = req.body;
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('Stripe密钥未配置', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount), // 以分为单位
      currency: currency.toLowerCase(),
      metadata: {
        test: 'true',
        userId: req.user!.userId,
        description: description,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
      message: '测试支付意图创建成功',
    });
  } catch (error: any) {
    console.error('Test payment intent creation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_INTENT_FAILED',
        message: error.message || '创建测试支付意图失败',
      },
    });
  }
});

/**
 * POST /api/test-stripe/cancel-intent
 * 取消支付意图
 */
router.post('/cancel-intent', async (req: AuthRequest, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      throw new AppError('支付意图ID不能为空', 400, 'MISSING_PAYMENT_INTENT_ID');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('Stripe密钥未配置', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      },
      message: '支付意图已取消',
    });
  } catch (error: any) {
    console.error('Cancel payment intent failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_INTENT_FAILED',
        message: error.message || '取消支付意图失败',
      },
    });
  }
});

/**
 * GET /api/test-stripe/account-info
 * 获取Stripe账户信息
 */
router.get('/account-info', async (req: AuthRequest, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('Stripe密钥未配置', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const account = await stripe.accounts.retrieve();

    res.json({
      success: true,
      data: {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency,
        type: account.type,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
      message: '账户信息获取成功',
    });
  } catch (error: any) {
    console.error('Get account info failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACCOUNT_INFO_FAILED',
        message: error.message || '获取账户信息失败',
      },
    });
  }
});

export default router;

