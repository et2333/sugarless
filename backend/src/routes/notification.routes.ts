/**
 * Notification System API Routes
 * 支持邮件、短信、网页推送、日历集成
 */

import { Router } from 'express';
import { z } from 'zod';
import { NotificationService } from '../services/notificationService';
import { CalendarService } from '../services/calendarService';
import { EmailService } from '../services/emailService';
import { SMSService } from '../services/smsService';
import { PushService } from '../services/pushService';
import { GeminiService } from '../services/ai/geminiService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

const router = Router();

// Google OAuth回调不需要认证
router.get('/calendar/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '授权码缺失',
        error: 'MISSING_AUTH_CODE',
      });
    }
    
    if (!state) {
      return res.status(400).json({
        success: false,
        message: '状态参数缺失',
        error: 'MISSING_STATE',
      });
    }

    const userId = state as string;
    
    // 处理Google OAuth回调并获取凭据
    const credentials = await CalendarService.handleGoogleCallback(code as string, userId);
    
    // 存储凭据到数据库
    await prisma.calendarCredentials.upsert({
      where: {
        userId_calendarType: {
          userId,
          calendarType: 'google',
        },
      },
      update: {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        calendarId: credentials.calendarId,
        updatedAt: new Date(),
      },
      create: {
        userId,
        calendarType: 'google',
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        calendarId: credentials.calendarId,
      },
    });

    // 重定向到前端页面
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/service-test?google_auth_success=true`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/service-test?google_auth_error=true`);
  }
});

// 所有其他路由都需要认证
router.use(authenticate);

// ==================== 通知渠道管理 ====================

/**
 * POST /api/notifications/channels
 * 添加通知渠道
 */
router.post('/channels', async (req: AuthRequest, res) => {
  try {
    const { type, address, preferences } = req.body;
    const userId = req.user!.userId;

    // 验证渠道类型
    if (!['email', 'sms', 'push', 'in_app'].includes(type)) {
      throw new AppError('不支持的通知渠道类型', 400, 'INVALID_CHANNEL_TYPE');
    }

    // 验证地址格式
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      throw new AppError('无效的邮箱地址', 400, 'INVALID_EMAIL');
    }

    if (type === 'sms' && !/^\+?[1-9]\d{1,14}$/.test(address)) {
      throw new AppError('无效的手机号码', 400, 'INVALID_PHONE');
    }

    // 检查是否已存在
    const existingChannel = await prisma.notificationChannel.findFirst({
      where: {
        userId,
        type,
        address,
      },
    });

    if (existingChannel) {
      throw new AppError('该通知渠道已存在', 400, 'CHANNEL_EXISTS');
    }

    // 创建通知渠道
    const channel = await prisma.notificationChannel.create({
      data: {
        userId,
        type,
        address,
        preferences: preferences ? JSON.stringify(preferences) : null,
        isActive: true,
        verified: false,
      },
    });

    // 发送验证码
    if (type === 'email') {
      await EmailService.sendVerificationCode(address, channel.id);
    } else if (type === 'sms') {
      await SMSService.sendVerificationCode(address, channel.id);
    }

    res.status(201).json({
      success: true,
      data: channel,
      message: '通知渠道已添加，请查收验证码',
    });
  } catch (error: any) {
    throw new AppError(error.message || '添加通知渠道失败', 500, 'ADD_CHANNEL_FAILED');
  }
});

/**
 * GET /api/notifications/channels
 * 获取用户通知渠道
 */
router.get('/channels', async (req: AuthRequest, res) => {
  try {
    const channels = await prisma.notificationChannel.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    const channelsData = channels.map(channel => ({
      ...channel,
      preferences: channel.preferences ? JSON.parse(channel.preferences) : null,
    }));

    res.json({
      success: true,
      data: channelsData,
    });
  } catch (error: any) {
    throw new AppError('获取通知渠道失败', 500, 'FETCH_CHANNELS_FAILED');
  }
});

/**
 * POST /api/notifications/channels/:id/verify
 * 验证通知渠道
 */
router.post('/channels/:id/verify', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    const channel = await prisma.notificationChannel.findFirst({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!channel) {
      throw new AppError('通知渠道不存在', 404, 'CHANNEL_NOT_FOUND');
    }

    if (channel.verified) {
      return res.json({
        success: true,
        message: '渠道已验证',
      });
    }

    // 验证验证码（这里简化处理，实际应该存储验证码并验证）
    if (code !== '123456') {
      throw new AppError('验证码错误', 400, 'INVALID_CODE');
    }

    // 更新验证状态
    await prisma.notificationChannel.update({
      where: { id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: '通知渠道验证成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '验证通知渠道失败', 500, 'VERIFY_CHANNEL_FAILED');
  }
});

/**
 * DELETE /api/notifications/channels/:id
 * 删除通知渠道
 */
router.delete('/channels/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const channel = await prisma.notificationChannel.findFirst({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!channel) {
      throw new AppError('通知渠道不存在', 404, 'CHANNEL_NOT_FOUND');
    }

    await prisma.notificationChannel.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '通知渠道已删除',
    });
  } catch (error: any) {
    throw new AppError(error.message || '删除通知渠道失败', 500, 'DELETE_CHANNEL_FAILED');
  }
});

// ==================== 通知管理 ====================

/**
 * GET /api/notifications
 * 获取用户通知
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { limit = '20', offset = '0', type, status } = req.query;
    const userId = req.user!.userId;

    const where: any = { userId };
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset as string),
        take: parseInt(limit as string),
        include: {
          channel: {
            select: {
              type: true,
              address: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    const notificationsData = notifications.map(notification => ({
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
    }));

    res.json({
      success: true,
      data: notificationsData,
      metadata: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    throw new AppError('获取通知失败', 500, 'FETCH_NOTIFICATIONS_FAILED');
  }
});

/**
 * GET /api/notifications/unread-count
 * 获取未读通知数量
 */
router.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user!.userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    throw new AppError('获取未读通知数量失败', 500, 'FETCH_UNREAD_COUNT_FAILED');
  }
});

/**
 * PUT /api/notifications/:id/read
 * 标记通知为已读
 */
router.put('/:id/read', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!notification) {
      throw new AppError('通知不存在', 404, 'NOTIFICATION_NOT_FOUND');
    }

    await NotificationService.markAsRead(id);

    res.json({
      success: true,
      message: '通知已标记为已读',
    });
  } catch (error: any) {
    throw new AppError(error.message || '标记通知失败', 500, 'MARK_READ_FAILED');
  }
});

/**
 * POST /api/notifications/test
 * 发送测试通知
 */
router.post('/test', async (req: AuthRequest, res) => {
  try {
    const { type, title, content } = req.body;
    const userId = req.user!.userId;

    const notifications = await NotificationService.sendNotification({
      userId,
      type: type || 'update',
      title: title || '测试通知',
      content: content || '这是一条测试通知',
      priority: 'medium',
    });

    res.json({
      success: true,
      data: notifications,
      message: '测试通知已发送',
    });
  } catch (error: any) {
    throw new AppError(error.message || '发送测试通知失败', 500, 'SEND_TEST_FAILED');
  }
});

// ==================== 日历集成 ====================

/**
 * GET /api/notifications/calendar/google/auth-url
 * 获取Google Calendar授权URL
 */
router.get('/calendar/google/auth-url', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const authUrl = CalendarService.getGoogleAuthUrl(userId);
    
    res.json({
      success: true,
      data: {
        authUrl,
      },
      message: 'Google Calendar授权URL生成成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '生成Google Calendar授权URL失败', 500, 'GOOGLE_AUTH_URL_FAILED');
  }
});


/**
 * POST /api/notifications/calendar/sync
 * 同步日历事件
 */
router.post('/calendar/sync', async (req: AuthRequest, res) => {
  try {
    const { calendarType, credentials } = req.body;
    const userId = req.user!.userId;

    // 验证日历类型
    if (!['google', 'outlook', 'apple'].includes(calendarType)) {
      throw new AppError('不支持的日历类型', 400, 'INVALID_CALENDAR_TYPE');
    }

    const result = await CalendarService.syncCalendar(userId, calendarType, credentials);

    res.json({
      success: true,
      data: result,
      message: '日历同步成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '日历同步失败', 500, 'CALENDAR_SYNC_FAILED');
  }
});

/**
 * GET /api/notifications/calendar/status
 * 获取日历连接状态
 */
router.get('/calendar/status', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const status = await CalendarService.getCalendarStatus(userId);
    
    res.json({
      success: true,
      data: status,
      message: '日历状态获取成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '获取日历状态失败', 500, 'GET_CALENDAR_STATUS_FAILED');
  }
});

/**
 * GET /api/notifications/calendar/events
 * 获取日历事件
 */
router.get('/calendar/events', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user!.userId;

    const events = await CalendarService.getEvents(userId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    throw new AppError(error.message || '获取日历事件失败', 500, 'FETCH_EVENTS_FAILED');
  }
});

/**
 * POST /api/notifications/calendar/events
 * 创建日历事件
 */
router.post('/calendar/events', async (req: AuthRequest, res) => {
  try {
    const { title, description, startTime, endTime, location, reminders } = req.body;
    const userId = req.user!.userId;

    const event = await CalendarService.createEvent(userId, {
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      reminders,
    });

    res.status(201).json({
      success: true,
      data: event,
      message: '日历事件创建成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '创建日历事件失败', 500, 'CREATE_EVENT_FAILED');
  }
});

// ==================== 推送通知 ====================

/**
 * GET /api/notifications/push/vapid-key
 * 获取VAPID公钥
 */
router.get('/push/vapid-key', async (req: AuthRequest, res) => {
  try {
    PushService.initialize();
    const vapidKey = PushService.getVapidPublicKey();
    
    res.json({
      success: true,
      data: {
        publicKey: vapidKey,
      },
      message: 'VAPID公钥获取成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '获取VAPID公钥失败', 500, 'GET_VAPID_KEY_FAILED');
  }
});

/**
 * POST /api/notifications/push/subscribe
 * 订阅推送通知
 */
router.post('/push/subscribe', async (req: AuthRequest, res) => {
  try {
    const { deviceToken, platform } = req.body;
    const userId = req.user!.userId;

    if (!deviceToken) {
      throw new AppError('设备令牌不能为空', 400, 'MISSING_DEVICE_TOKEN');
    }

    // 创建或更新推送渠道
    const channel = await prisma.notificationChannel.upsert({
      where: {
        id: `push_${userId}_${deviceToken.slice(0, 10)}`, // 使用组合ID
      },
      update: {
        preferences: JSON.stringify({ platform }),
        isActive: true,
        verified: true,
      },
      create: {
        userId,
        type: 'push',
        address: deviceToken,
        preferences: JSON.stringify({ platform }),
        isActive: true,
        verified: true,
      },
    });

    res.json({
      success: true,
      data: channel,
      message: '推送通知订阅成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '订阅推送通知失败', 500, 'SUBSCRIBE_PUSH_FAILED');
  }
});

/**
 * POST /api/notifications/push/unsubscribe
 * 取消订阅推送通知
 */
router.post('/push/unsubscribe', async (req: AuthRequest, res) => {
  try {
    const { deviceToken } = req.body;
    const userId = req.user!.userId;

    await prisma.notificationChannel.updateMany({
      where: {
        userId,
        type: 'push',
        address: deviceToken,
      },
      data: {
        isActive: false,
      },
    });

    res.json({
      success: true,
      message: '推送通知取消订阅成功',
    });
  } catch (error: any) {
    throw new AppError(error.message || '取消订阅推送通知失败', 500, 'UNSUBSCRIBE_PUSH_FAILED');
  }
});

// ==================== AI服务测试 ====================

/**
 * GET /api/notifications/ai/gemini/test
 * 测试Gemini AI连接
 */
router.get('/ai/gemini/test', async (req: AuthRequest, res) => {
  try {
    const isConnected = await GeminiService.testConnection();
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        service: 'Gemini AI',
        timestamp: new Date().toISOString(),
      },
      message: isConnected ? 'Gemini AI连接正常' : 'Gemini AI连接失败',
    });
  } catch (error: any) {
    res.json({
      success: false,
      data: {
        connected: false,
        service: 'Gemini AI',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      message: 'Gemini AI服务不可用',
    });
  }
});

export default router;
