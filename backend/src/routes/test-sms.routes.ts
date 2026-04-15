/**
 * Test SMS Routes - 短信测试路由
 * 用于测试ClickSend短信服务
 */

import { Router } from 'express';
import { SMSService } from '../services/smsService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * POST /api/test-sms/send
 * 发送测试短信
 */
router.post('/send', async (req: AuthRequest, res) => {
  try {
    const { to, type = 'test' } = req.body;
    
    if (!to) {
      throw new AppError('手机号码不能为空', 400, 'MISSING_PHONE');
    }

    // 验证手机号码格式
    if (!SMSService.validatePhoneNumber(to)) {
      throw new AppError('手机号码格式不正确', 400, 'INVALID_PHONE');
    }

    let result;
    
    switch (type) {
      case 'verification':
        await SMSService.sendVerificationCode(to, 'test-channel-id');
        result = { message: '验证码短信发送成功' };
        break;
        
      case 'blood-sugar-alert':
        await SMSService.sendBloodSugarAlert(to, 8.5, '餐后', 'high');
        result = { message: '血糖警报短信发送成功' };
        break;
        
      case 'medication-reminder':
        await SMSService.sendMedicationReminder(to, '二甲双胍', 3);
        result = { message: '药物提醒短信发送成功' };
        break;
        
      case 'appointment-reminder':
        await SMSService.sendAppointmentReminder(
          to, 
          '张医生', 
          new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
          '人民医院内分泌科'
        );
        result = { message: '预约提醒短信发送成功' };
        break;
        
      case 'emergency':
        await SMSService.sendEmergencyAlert(to, '测试患者', '血糖异常', '家庭住址');
        result = { message: '紧急警报短信发送成功' };
        break;
        
      default:
        await SMSService.sendNotificationSMS(
          to, 
          '测试短信', 
          '这是一条测试短信，用于验证ClickSend短信服务是否正常工作。'
        );
        result = { message: '测试短信发送成功' };
    }

    res.json({
      success: true,
      data: result,
      message: `短信已发送到 ${to}`,
    });
  } catch (error: any) {
    console.error('Test SMS failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SMS_TEST_FAILED',
        message: error.message || '短信发送失败',
      },
    });
  }
});

/**
 * GET /api/test-sms/status
 * 检查短信服务状态
 */
router.get('/status', async (req: AuthRequest, res) => {
  try {
    // 检查ClickSend配置
    const hasUsername = !!process.env.CLICKSEND_USERNAME;
    const hasApiKey = !!process.env.CLICKSEND_API_KEY;
    const senderId = process.env.CLICKSEND_SENDER_ID || '6143523147';
    
    res.json({
      success: true,
      data: {
        service: 'ClickSend',
        configured: hasUsername && hasApiKey,
        username: hasUsername ? '已配置' : '未配置',
        apiKey: hasApiKey ? '已配置' : '未配置',
        senderId: senderId,
        status: (hasUsername && hasApiKey) ? 'ready' : 'not_configured',
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
 * POST /api/test-sms/validate-phone
 * 验证手机号码格式
 */
router.post('/validate-phone', async (req: AuthRequest, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      throw new AppError('手机号码不能为空', 400, 'MISSING_PHONE');
    }

    const isValid = SMSService.validatePhoneNumber(phone);
    const formatted = SMSService.formatPhoneNumber(phone);

    res.json({
      success: true,
      data: {
        phone: phone,
        isValid: isValid,
        formatted: formatted,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PHONE_VALIDATION_FAILED',
        message: error.message || '手机号码验证失败',
      },
    });
  }
});

export default router;

