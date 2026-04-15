/**
 * Push Service - 网页推送通知服务
 * 支持Web Push、Firebase Cloud Messaging
 */

import { AppError } from '../middleware/errorHandler';

export interface PushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  fcmServerKey?: string;
}

export interface PushMessage {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
}

export interface DeviceInfo {
  deviceToken: string;
  platform: 'web' | 'android' | 'ios';
  userAgent?: string;
  lastSeen: Date;
}

export class PushService {
  private static config: PushConfig;

  /**
   * 初始化推送服务
   */
  static initialize() {
    this.config = {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
      vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      fcmServerKey: process.env.FCM_SERVER_KEY || '',
    };
  }

  /**
   * 发送推送通知
   */
  static async sendPushNotification(
    deviceToken: string,
    message: PushMessage,
    platform: 'web' | 'android' | 'ios' = 'web'
  ): Promise<void> {
    try {
      if (!this.config) {
        this.initialize();
      }

      switch (platform) {
        case 'web':
          await this.sendWebPush(deviceToken, message);
          break;
        case 'android':
        case 'ios':
          await this.sendFCM(deviceToken, message, platform);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error: any) {
      console.error('Failed to send push notification:', error);
      throw new AppError('发送推送通知失败', 500, 'PUSH_SEND_FAILED');
    }
  }

  /**
   * 发送血糖警报推送
   */
  static async sendBloodSugarAlert(
    deviceToken: string,
    value: number,
    type: string,
    severity: string,
    platform: 'web' | 'android' | 'ios' = 'web'
  ): Promise<void> {
    const severityText = {
      low: '偏低',
      normal: '正常',
      high: '偏高',
      critical: '严重异常'
    }[severity] || '异常';

    const urgency = severity === 'critical' ? '🚨' : '⚠️';
    
    const message: PushMessage = {
      title: `${urgency}血糖警报`,
      body: `血糖值: ${value} mg/dL (${severityText})`,
      icon: '/icons/blood-sugar-alert.png',
      badge: '/icons/badge.png',
      data: {
        type: 'blood_sugar_alert',
        value,
        severity,
        alertType: type,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'record',
          title: '记录血糖',
          icon: '/icons/record.png',
        },
        {
          action: 'view',
          title: '查看详情',
          icon: '/icons/view.png',
        },
      ],
      requireInteraction: severity === 'critical',
      tag: 'blood-sugar-alert',
      renotify: true,
    };

    await this.sendPushNotification(deviceToken, message, platform);
  }

  /**
   * 发送药物提醒推送
   */
  static async sendMedicationReminder(
    deviceToken: string,
    medicationName: string,
    dosage: string,
    time: string,
    platform: 'web' | 'android' | 'ios' = 'web'
  ): Promise<void> {
    const message: PushMessage = {
      title: '💊 用药提醒',
      body: `该服用 ${medicationName} ${dosage} 了`,
      icon: '/icons/medication.png',
      badge: '/icons/badge.png',
      data: {
        type: 'medication_reminder',
        medicationName,
        dosage,
        time,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'taken',
          title: '已服用',
          icon: '/icons/check.png',
        },
        {
          action: 'snooze',
          title: '稍后提醒',
          icon: '/icons/snooze.png',
        },
      ],
      requireInteraction: true,
      tag: `medication-${medicationName}`,
    };

    await this.sendPushNotification(deviceToken, message, platform);
  }

  /**
   * 发送预约提醒推送
   */
  static async sendAppointmentReminder(
    deviceToken: string,
    doctorName: string,
    appointmentTime: Date,
    location?: string,
    platform: 'web' | 'android' | 'ios' = 'web'
  ): Promise<void> {
    const timeStr = appointmentTime.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const message: PushMessage = {
      title: '📅 预约提醒',
      body: `${doctorName} - ${timeStr}${location ? ` (${location})` : ''}`,
      icon: '/icons/appointment.png',
      badge: '/icons/badge.png',
      data: {
        type: 'appointment_reminder',
        doctorName,
        appointmentTime: appointmentTime.toISOString(),
        location,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'view',
          title: '查看详情',
          icon: '/icons/view.png',
        },
        {
          action: 'directions',
          title: '导航',
          icon: '/icons/navigation.png',
        },
      ],
      requireInteraction: true,
      tag: 'appointment-reminder',
    };

    await this.sendPushNotification(deviceToken, message, platform);
  }

  /**
   * 发送膳食计划推送
   */
  static async sendMealPlanNotification(
    deviceToken: string,
    mealType: string,
    mealName: string,
    platform: 'web' | 'android' | 'ios' = 'web'
  ): Promise<void> {
    const message: PushMessage = {
      title: `🍽️ ${mealType}时间`,
      body: `建议食用: ${mealName}`,
      icon: '/icons/meal.png',
      badge: '/icons/badge.png',
      data: {
        type: 'meal_plan',
        mealType,
        mealName,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'view_plan',
          title: '查看计划',
          icon: '/icons/view.png',
        },
        {
          action: 'log_meal',
          title: '记录用餐',
          icon: '/icons/log.png',
        },
      ],
      tag: 'meal-plan',
    };

    await this.sendPushNotification(deviceToken, message, platform);
  }

  /**
   * 发送订单更新推送
   */
  static async sendOrderUpdate(
    deviceToken: string,
    orderNumber: string,
    status: string,
    platform: 'web' | 'android' | 'ios' = 'web'
  ): Promise<void> {
    const statusMessages: { [key: string]: string } = {
      confirmed: '订单已确认',
      shipped: '订单已发货',
      delivered: '订单已送达',
      cancelled: '订单已取消',
    };

    const message: PushMessage = {
      title: '📦 订单更新',
      body: `订单 #${orderNumber} ${statusMessages[status] || status}`,
      icon: '/icons/order.png',
      badge: '/icons/badge.png',
      data: {
        type: 'order_update',
        orderNumber,
        status,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'view_order',
          title: '查看订单',
          icon: '/icons/view.png',
        },
      ],
      tag: `order-${orderNumber}`,
    };

    await this.sendPushNotification(deviceToken, message, platform);
  }

  /**
   * 发送Web Push通知
   */
  private static async sendWebPush(deviceToken: string, message: PushMessage): Promise<void> {
    try {
      const webpush = require('web-push');
      
      // 设置VAPID详情
      webpush.setVapidDetails(
        this.config.vapidSubject,
        this.config.vapidPublicKey,
        this.config.vapidPrivateKey
      );

      // 解析设备令牌（应该是订阅对象的JSON字符串）
      let subscription;
      try {
        subscription = typeof deviceToken === 'string' ? JSON.parse(deviceToken) : deviceToken;
      } catch (error) {
        throw new Error(`Invalid device token format: ${error}`);
      }

      // 构建推送载荷
      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        icon: message.icon || '/icons/icon-192x192.png',
        badge: message.badge || '/icons/badge-72x72.png',
        image: message.image,
        data: message.data,
        actions: message.actions,
        requireInteraction: message.requireInteraction || false,
        silent: message.silent || false,
        tag: message.tag,
        renotify: message.renotify || false,
      });

      console.log(`Sending Web Push to ${subscription.endpoint}:`);
      console.log(`Title: ${message.title}`);
      console.log(`Body: ${message.body}`);

      // 发送推送通知
      await webpush.sendNotification(subscription, payload);
      
      console.log('Web Push notification sent successfully');
      
    } catch (error: any) {
      console.error('Failed to send web push:', error);
      
      // 如果是400错误，可能是订阅已过期
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('Push subscription expired or invalid, removing from database');
        throw new Error('Push subscription expired');
      }
      
      throw error;
    }
  }

  /**
   * 发送FCM通知
   */
  private static async sendFCM(
    deviceToken: string, 
    message: PushMessage, 
    platform: 'android' | 'ios'
  ): Promise<void> {
    try {
      // 在实际环境中，这里应该使用Firebase Admin SDK
      // 这里模拟发送过程
      console.log(`FCM sent to ${deviceToken} (${platform}):`);
      console.log(`Title: ${message.title}`);
      console.log(`Body: ${message.body}`);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 在实际实现中，使用Firebase Admin SDK：
      /*
      const admin = require('firebase-admin');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FCM_PROJECT_ID,
            clientEmail: process.env.FCM_CLIENT_EMAIL,
            privateKey: process.env.FCM_PRIVATE_KEY,
          }),
        });
      }
      
      const fcmMessage = {
        token: deviceToken,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: {
          ...message.data,
          icon: message.icon || '',
          badge: message.badge || '',
          image: message.image || '',
        },
        android: {
          notification: {
            icon: message.icon,
            color: '#3498db',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: message.title,
                body: message.body,
              },
              badge: 1,
              sound: 'default',
              category: 'DIABETES_NOTIFICATION',
            },
          },
        },
      };
      
      await admin.messaging().send(fcmMessage);
      */
      
    } catch (error: any) {
      console.error('Failed to send FCM:', error);
      throw error;
    }
  }

  /**
   * 获取VAPID公钥（用于前端订阅）
   */
  static getVapidPublicKey(): string {
    if (!this.config) {
      this.initialize();
    }
    return this.config.vapidPublicKey;
  }

  /**
   * 验证设备令牌
   */
  static validateDeviceToken(deviceToken: string, platform: 'web' | 'android' | 'ios'): boolean {
    if (!deviceToken || typeof deviceToken !== 'string') {
      return false;
    }

    switch (platform) {
      case 'web':
        // Web Push订阅对象通常是JSON字符串
        try {
          const subscription = JSON.parse(deviceToken);
          return subscription && subscription.endpoint && subscription.keys;
        } catch {
          return false;
        }
      case 'android':
      case 'ios':
        // FCM令牌格式验证
        return /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(deviceToken);
      default:
        return false;
    }
  }

  /**
   * 获取推送统计信息
   */
  static async getPushStats(deviceToken: string): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    lastSent?: Date;
  }> {
    // 在实际环境中，这里应该从数据库查询统计信息
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
    };
  }

  /**
   * 批量发送推送通知
   */
  static async sendBatchPush(
    deviceTokens: string[],
    message: PushMessage,
    platform: 'web' | 'android' | 'ios' = 'web'
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const token of deviceTokens) {
      try {
        await this.sendPushNotification(token, message, platform);
        results.success.push(token);
      } catch (error) {
        console.error(`Failed to send push to ${token}:`, error);
        results.failed.push(token);
      }
    }

    return results;
  }
}
