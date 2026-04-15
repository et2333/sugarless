/**
 * Test Email Routes - 邮件测试路由
 * 用于测试Resend邮件服务
 */

import { Router } from 'express';
import { EmailService } from '../services/emailService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * POST /api/test-email/send
 * 发送测试邮件
 */
router.post('/send', async (req: AuthRequest, res) => {
  try {
    const { to = 'cody00313@gmail.com', type = 'test' } = req.body;
    
    // Resend免费账户只能发送到注册邮箱
    if (to !== 'cody00313@gmail.com') {
      console.warn(`⚠️ Resend免费账户限制：只能发送到注册邮箱 cody00313@gmail.com，当前目标：${to}`);
    }

    let result;
    
    switch (type) {
      case 'verification':
        await EmailService.sendVerificationCode(to, 'test-channel-id');
        result = { message: '验证码邮件发送成功' };
        break;
        
      case 'blood-sugar-alert':
        await EmailService.sendBloodSugarAlert(to, 8.5, '餐后', 'high');
        result = { message: '血糖警报邮件发送成功' };
        break;
        
      case 'medication-reminder':
        await EmailService.sendMedicationReminder(to, '二甲双胍', 3);
        result = { message: '药物提醒邮件发送成功' };
        break;
        
      case 'meal-plan':
        await EmailService.sendMealPlan(to, {
          duration: 7,
          meals: [{ day: 1, breakfast: '燕麦粥', lunch: '鸡胸肉沙拉', dinner: '蒸蛋羹' }]
        });
        result = { message: '膳食计划邮件发送成功' };
        break;
        
      case 'order-update':
        await EmailService.sendOrderUpdate(to, 'ORD-12345', 'shipped', {
          trackingNumber: 'TRK-67890',
          estimatedDelivery: '2024-01-20'
        });
        result = { message: '订单更新邮件发送成功' };
        break;
        
      default:
        await EmailService.sendNotificationEmail(
          to, 
          '测试邮件', 
          '这是一封测试邮件，用于验证Resend邮件服务是否正常工作。',
          'https://diabetes-platform.com'
        );
        result = { message: '测试邮件发送成功' };
    }

    res.json({
      success: true,
      data: result,
      message: `邮件已发送到 ${to}`,
    });
  } catch (error: any) {
    console.error('Test email failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_TEST_FAILED',
        message: error.message || '邮件发送失败',
      },
    });
  }
});

/**
 * GET /api/test-email/status
 * 检查邮件服务状态
 */
router.get('/status', async (req: AuthRequest, res) => {
  try {
    // 检查Resend API密钥是否配置
    const hasApiKey = !!process.env.RESEND_API_KEY;
    
    res.json({
      success: true,
      data: {
        service: 'Resend',
        configured: hasApiKey,
        apiKey: hasApiKey ? '已配置' : '未配置',
        status: hasApiKey ? 'ready' : 'not_configured',
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

export default router;
