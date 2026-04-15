/**
 * NotificationService - Multi-channel Notification System
 * From Report: UC-B3.1 Receive Alerts, UC-C1 Health Reminder - Multi-channel delivery
 */

import prisma from '../utils/prisma';

export interface NotificationChannel {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  address: string;
  isActive: boolean;
  preferences?: any;
  verified: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  channelId: string;
  type: 'reminder' | 'alert' | 'update' | 'marketing';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: any;
  actionUrl?: string;
  createdAt: Date;
}

export class NotificationService {

  /**
   * Send notification to user through all active channels
   */
  static async sendNotification(data: {
    userId: string;
    type: 'reminder' | 'alert' | 'update' | 'marketing';
    title: string;
    content: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    metadata?: any;
    actionUrl?: string;
  }): Promise<Notification[]> {
    const channels = await prisma.notificationChannel.findMany({
      where: {
        userId: data.userId,
        isActive: true,
        verified: true,
      },
    });

    const notifications: Notification[] = [];

    for (const channel of channels) {
      const notification = await this.createNotification({
        userId: data.userId,
        channelId: channel.id,
        type: data.type,
        title: data.title,
        content: data.content,
        priority: data.priority || 'medium',
        metadata: data.metadata,
        actionUrl: data.actionUrl,
      });

      notifications.push(notification);

      // Send through appropriate channel
      await this.sendThroughChannel(notification, channel);
    }

    return notifications;
  }

  /**
   * Send reminder notification
   */
  static async sendReminder(reminderId: string): Promise<void> {
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { user: true },
    });

    if (!reminder || !reminder.isActive) {
      return;
    }

    await this.sendNotification({
      userId: reminder.userId,
      type: 'reminder',
      title: `提醒: ${reminder.title}`,
      content: reminder.message,
      priority: reminder.priority === 'high' ? 'high' : 'medium',
      metadata: {
        reminderId: reminder.id,
        reminderType: reminder.type,
      },
      actionUrl: `/reminders/${reminder.id}`,
    });
  }

  /**
   * Send blood sugar alert
   */
  static async sendBloodSugarAlert(alertId: string): Promise<void> {
    const alert = await prisma.bloodSugarAlert.findUnique({
      where: { id: alertId },
      include: { user: true },
    });

    if (!alert || alert.acknowledged) {
      return;
    }

    const priority = alert.severity === 'critical' ? 'urgent' : 
                    alert.severity === 'high' ? 'high' : 'medium';

    await this.sendNotification({
      userId: alert.userId,
      type: 'alert',
      title: '血糖警报',
      content: alert.message,
      priority,
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        value: alert.value,
      },
      actionUrl: `/blood-sugar/alerts/${alert.id}`,
    });
  }

  /**
   * Send medication refill alert
   */
  static async sendRefillAlert(refillAlertId: string): Promise<void> {
    const refillAlert = await prisma.refillAlert.findUnique({
      where: { id: refillAlertId },
      include: { 
        user: true,
        medication: true,
      },
    });

    if (!refillAlert || refillAlert.status !== 'pending') {
      return;
    }

    const priority = refillAlert.priority === 'urgent' ? 'urgent' : 
                    refillAlert.priority === 'high' ? 'high' : 'medium';

    await this.sendNotification({
      userId: refillAlert.userId,
      type: 'alert',
      title: '药物补充提醒',
      content: `您的 ${refillAlert.medication.name} 即将用完，请及时补充`,
      priority,
      metadata: {
        refillAlertId: refillAlert.id,
        medicationId: refillAlert.medicationId,
        daysRemaining: refillAlert.daysRemaining,
      },
      actionUrl: `/medications/alerts/${refillAlert.id}`,
    });
  }

  /**
   * Send order update notification
   */
  static async sendOrderUpdate(orderId: string, status: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      return;
    }

    const statusMessages: { [key: string]: { title: string; content: string } } = {
      confirmed: {
        title: '订单确认',
        content: `您的订单 #${order.orderNumber} 已确认，正在准备发货`,
      },
      shipped: {
        title: '订单已发货',
        content: `您的订单 #${order.orderNumber} 已发货，请注意查收`,
      },
      delivered: {
        title: '订单已送达',
        content: `您的订单 #${order.orderNumber} 已送达，感谢您的购买`,
      },
      cancelled: {
        title: '订单已取消',
        content: `您的订单 #${order.orderNumber} 已取消`,
      },
    };

    const message = statusMessages[status];
    if (!message) return;

    await this.sendNotification({
      userId: order.userId,
      type: 'update',
      title: message.title,
      content: message.content,
      priority: 'medium',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status,
      },
      actionUrl: `/orders/${order.id}`,
    });
  }

  /**
   * Create notification record
   */
  private static async createNotification(data: {
    userId: string;
    channelId: string;
    type: string;
    title: string;
    content: string;
    priority: string;
    metadata?: any;
    actionUrl?: string;
  }): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        channelId: data.channelId,
        type: data.type,
        title: data.title,
        content: data.content,
        priority: data.priority,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        actionUrl: data.actionUrl,
        status: 'pending',
      },
    });

    return {
      id: notification.id,
      userId: notification.userId,
      channelId: notification.channelId,
      type: notification.type as any,
      title: notification.title,
      content: notification.content,
      priority: notification.priority as any,
      status: notification.status as any,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : undefined,
      actionUrl: notification.actionUrl || undefined,
      createdAt: notification.createdAt,
    };
  }

  /**
   * Send notification through specific channel
   */
  private static async sendThroughChannel(notification: Notification, channel: NotificationChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmail(channel.address, notification);
          break;
        case 'sms':
          await this.sendSMS(channel.address, notification);
          break;
        case 'push':
          await this.sendPush(channel.address, notification);
          break;
        case 'in_app':
          // In-app notifications are automatically available
          await this.updateNotificationStatus(notification.id, 'delivered');
          break;
      }
    } catch (error) {
      console.error(`Failed to send notification through ${channel.type}:`, error);
      await this.updateNotificationStatus(notification.id, 'failed', error.message);
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(email: string, notification: Notification): Promise<void> {
    try {
      const { EmailService } = await import('./emailService');
      
      // 根据通知类型发送不同类型的邮件
      switch (notification.type) {
        case 'alert':
          if (notification.metadata?.alertType === 'blood_sugar') {
            await EmailService.sendBloodSugarAlert(
              email,
              notification.metadata.value,
              notification.metadata.alertType,
              notification.metadata.severity
            );
          } else if (notification.metadata?.medicationName) {
            await EmailService.sendMedicationReminder(
              email,
              notification.metadata.medicationName,
              notification.metadata.daysRemaining || 0
            );
          } else {
            await EmailService.sendNotificationEmail(
              email,
              notification.title,
              notification.content,
              notification.actionUrl
            );
          }
          break;
        case 'reminder':
          if (notification.metadata?.medicationName) {
            await EmailService.sendMedicationReminder(
              email,
              notification.metadata.medicationName,
              notification.metadata.daysRemaining || 0
            );
          } else {
            await EmailService.sendNotificationEmail(
              email,
              notification.title,
              notification.content,
              notification.actionUrl
            );
          }
          break;
        case 'update':
          if (notification.metadata?.orderNumber) {
            await EmailService.sendOrderUpdate(
              email,
              notification.metadata.orderNumber,
              notification.metadata.status,
              notification.metadata
            );
          } else {
            await EmailService.sendNotificationEmail(
              email,
              notification.title,
              notification.content,
              notification.actionUrl
            );
          }
          break;
        default:
          await EmailService.sendNotificationEmail(
            email,
            notification.title,
            notification.content,
            notification.actionUrl
          );
      }
      
      await this.updateNotificationStatus(notification.id, 'sent');
    } catch (error: any) {
      console.error('Failed to send email:', error);
      await this.updateNotificationStatus(notification.id, 'failed', error.message);
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMS(phone: string, notification: Notification): Promise<void> {
    try {
      const { SMSService } = await import('./smsService');
      
      // 根据通知类型发送不同类型的短信
      switch (notification.type) {
        case 'alert':
          if (notification.metadata?.alertType === 'blood_sugar') {
            await SMSService.sendBloodSugarAlert(
              phone,
              notification.metadata.value,
              notification.metadata.alertType,
              notification.metadata.severity
            );
          } else if (notification.metadata?.medicationName) {
            await SMSService.sendMedicationReminder(
              phone,
              notification.metadata.medicationName,
              notification.metadata.daysRemaining || 0
            );
          } else {
            await SMSService.sendNotificationSMS(
              phone,
              notification.title,
              notification.content
            );
          }
          break;
        case 'reminder':
          if (notification.metadata?.medicationName) {
            await SMSService.sendMedicationReminder(
              phone,
              notification.metadata.medicationName,
              notification.metadata.daysRemaining || 0
            );
          } else if (notification.metadata?.doctorName) {
            await SMSService.sendAppointmentReminder(
              phone,
              notification.metadata.doctorName,
              new Date(notification.metadata.appointmentTime),
              notification.metadata.location
            );
          } else {
            await SMSService.sendNotificationSMS(
              phone,
              notification.title,
              notification.content
            );
          }
          break;
        default:
          await SMSService.sendNotificationSMS(
            phone,
            notification.title,
            notification.content
          );
      }
      
      await this.updateNotificationStatus(notification.id, 'sent');
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      await this.updateNotificationStatus(notification.id, 'failed', error.message);
    }
  }

  /**
   * Send push notification
   */
  private static async sendPush(deviceToken: string, notification: Notification): Promise<void> {
    try {
      const { PushService } = await import('./pushService');
      
      // 解析设备信息
      const deviceInfo = JSON.parse(deviceToken);
      const platform = deviceInfo.platform || 'web';
      
      // 根据通知类型发送不同类型的推送
      switch (notification.type) {
        case 'alert':
          if (notification.metadata?.alertType === 'blood_sugar') {
            await PushService.sendBloodSugarAlert(
              deviceToken,
              notification.metadata.value,
              notification.metadata.alertType,
              notification.metadata.severity,
              platform
            );
          } else if (notification.metadata?.medicationName) {
            await PushService.sendMedicationReminder(
              deviceToken,
              notification.metadata.medicationName,
              notification.metadata.dosage || '',
              notification.metadata.time || '',
              platform
            );
          } else {
            await PushService.sendPushNotification(
              deviceToken,
              {
                title: notification.title,
                body: notification.content,
                data: notification.metadata,
                actions: [
                  {
                    action: 'view',
                    title: '查看详情',
                  },
                ],
              },
              platform
            );
          }
          break;
        case 'reminder':
          if (notification.metadata?.medicationName) {
            await PushService.sendMedicationReminder(
              deviceToken,
              notification.metadata.medicationName,
              notification.metadata.dosage || '',
              notification.metadata.time || '',
              platform
            );
          } else if (notification.metadata?.doctorName) {
            await PushService.sendAppointmentReminder(
              deviceToken,
              notification.metadata.doctorName,
              new Date(notification.metadata.appointmentTime),
              notification.metadata.location,
              platform
            );
          } else {
            await PushService.sendPushNotification(
              deviceToken,
              {
                title: notification.title,
                body: notification.content,
                data: notification.metadata,
                requireInteraction: true,
              },
              platform
            );
          }
          break;
        case 'update':
          if (notification.metadata?.orderNumber) {
            await PushService.sendOrderUpdate(
              deviceToken,
              notification.metadata.orderNumber,
              notification.metadata.status,
              platform
            );
          } else {
            await PushService.sendPushNotification(
              deviceToken,
              {
                title: notification.title,
                body: notification.content,
                data: notification.metadata,
              },
              platform
            );
          }
          break;
        default:
          await PushService.sendPushNotification(
            deviceToken,
            {
              title: notification.title,
              body: notification.content,
              data: notification.metadata,
            },
            platform
          );
      }
      
      await this.updateNotificationStatus(notification.id, 'sent');
    } catch (error: any) {
      console.error('Failed to send push notification:', error);
      await this.updateNotificationStatus(notification.id, 'failed', error.message);
    }
  }

  /**
   * Update notification status
   */
  private static async updateNotificationStatus(
    notificationId: string, 
    status: string, 
    failureReason?: string
  ): Promise<void> {
    const updateData: any = { status };
    
    switch (status) {
      case 'sent':
        updateData.sentAt = new Date();
        break;
      case 'delivered':
        updateData.deliveredAt = new Date();
        break;
      case 'failed':
        updateData.failedAt = new Date();
        updateData.failureReason = failureReason;
        break;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: updateData,
    });
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications: notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        channelId: notification.channelId,
        type: notification.type as any,
        title: notification.title,
        content: notification.content,
        priority: notification.priority as any,
        status: notification.status as any,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : undefined,
        actionUrl: notification.actionUrl || undefined,
        createdAt: notification.createdAt,
      })),
      total,
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        status: {
          in: ['delivered', 'sent'],
        },
      },
    });
  }
}
