/**
 * Email Service - 邮件通知服务
 * 支持发送验证码、通知邮件、模板邮件
 * 使用Resend API发送邮件
 */

import { Resend } from 'resend';
import { AppError } from '../middleware/errorHandler';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static resend: Resend;

  /**
   * 初始化邮件服务
   */
  static initialize() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required');
    }
    this.resend = new Resend(apiKey);
  }

  /**
   * 发送验证码邮件
   */
  static async sendVerificationCode(email: string, channelId: string): Promise<void> {
    const code = this.generateVerificationCode();
    
    // 存储验证码（实际应该存储到数据库或Redis）
    // 这里简化处理
    console.log(`Verification code for ${email}: ${code}`);

    const template = this.getVerificationTemplate(code);
    
    await this.sendEmail(email, '验证您的通知渠道', template);
  }

  /**
   * 发送通知邮件
   */
  static async sendNotificationEmail(
    email: string, 
    title: string, 
    content: string, 
    actionUrl?: string
  ): Promise<void> {
    const template = this.getNotificationTemplate(title, content, actionUrl);
    
    await this.sendEmail(email, title, template);
  }

  /**
   * 发送血糖警报邮件
   */
  static async sendBloodSugarAlert(
    email: string,
    value: number,
    type: string,
    severity: string
  ): Promise<void> {
    const title = '血糖警报';
    const content = this.getBloodSugarAlertContent(value, type, severity);
    const template = this.getAlertTemplate(title, content);
    
    await this.sendEmail(email, title, template);
  }

  /**
   * 发送药物补充提醒邮件
   */
  static async sendMedicationReminder(
    email: string,
    medicationName: string,
    daysRemaining: number
  ): Promise<void> {
    const title = '药物补充提醒';
    const content = this.getMedicationReminderContent(medicationName, daysRemaining);
    const template = this.getReminderTemplate(title, content);
    
    await this.sendEmail(email, title, template);
  }

  /**
   * 发送膳食计划邮件
   */
  static async sendMealPlan(
    email: string,
    mealPlan: any
  ): Promise<void> {
    const title = '您的个性化膳食计划';
    const content = this.getMealPlanContent(mealPlan);
    const template = this.getMealPlanTemplate(title, content);
    
    await this.sendEmail(email, title, template);
  }

  /**
   * 发送注册欢迎邮件
   */
  static async sendWelcomeEmail(
    email: string,
    firstName?: string
  ): Promise<void> {
    const title = '欢迎加入糖尿病支持平台';
    const content = this.getWelcomeContent(firstName);
    const template = this.getWelcomeTemplate(title, content);
    
    await this.sendEmail(email, title, template);
  }

  /**
   * 发送密码重置邮件
   */
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<void> {
    const title = '重置您的密码';
    const content = this.getPasswordResetContent(resetToken);
    const template = this.getPasswordResetTemplate(title, content);
    
    await this.sendEmail(email, title, template);
  }

  /**
   * 发送订单更新邮件
   */
  static async sendOrderUpdate(
    email: string,
    orderNumber: string,
    status: string,
    details?: any
  ): Promise<void> {
    const title = `订单更新 - #${orderNumber}`;
    const content = this.getOrderUpdateContent(orderNumber, status, details);
    const template = this.getOrderTemplate(title, content);
    
    await this.sendEmail(email, title, template);
  }

  /**
   * 发送通用邮件
   */
  private static async sendEmail(
    to: string, 
    subject: string, 
    template: EmailTemplate
  ): Promise<void> {
    try {
      if (!this.resend) {
        this.initialize();
      }

      const { data, error } = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [to],
        subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('Resend error:', error);
        throw new AppError(`发送邮件失败: ${error.message}`, 500, 'EMAIL_SEND_FAILED');
      }

      console.log(`Email sent to ${to}: ${subject}, ID: ${data?.id}`);
    } catch (error: any) {
      console.error('Failed to send email:', error);
      throw new AppError('发送邮件失败', 500, 'EMAIL_SEND_FAILED');
    }
  }

  /**
   * 生成验证码
   */
  private static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 获取验证码邮件模板
   */
  private static getVerificationTemplate(code: string): EmailTemplate {
    return {
      subject: '验证您的通知渠道',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">验证您的通知渠道</h2>
          <p>您正在设置通知渠道，请使用以下验证码完成验证：</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #e74c3c; font-size: 32px; margin: 0;">${code}</h1>
          </div>
          <p>验证码有效期为10分钟，请及时使用。</p>
          <p>如果这不是您的操作，请忽略此邮件。</p>
        </div>
      `,
      text: `验证码：${code}\n\n请使用此验证码完成通知渠道验证。\n\n验证码有效期为10分钟。`,
    };
  }

  /**
   * 获取通知邮件模板
   */
  private static getNotificationTemplate(
    title: string, 
    content: string, 
    actionUrl?: string
  ): EmailTemplate {
    return {
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">${title}</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; line-height: 1.6;">${content}</p>
          </div>
          ${actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${actionUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">查看详情</a>
            </div>
          ` : ''}
        </div>
      `,
      text: `${title}\n\n${content}${actionUrl ? `\n\n查看详情：${actionUrl}` : ''}`,
    };
  }

  /**
   * 获取血糖警报邮件内容
   */
  private static getBloodSugarAlertContent(value: number, type: string, severity: string): string {
    const severityText = {
      low: '偏低',
      normal: '正常',
      high: '偏高',
      critical: '严重异常'
    }[severity] || '异常';

    return `您的血糖值为 ${value} mg/dL，属于${severityText}范围。请${severity === 'critical' ? '立即' : '及时'}采取相应措施。`;
  }

  /**
   * 获取血糖警报邮件模板
   */
  private static getAlertTemplate(title: string, content: string): EmailTemplate {
    return {
      subject: `⚠️ ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">⚠️ ${title}</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
            <p style="margin: 0; line-height: 1.6; font-size: 16px;">${content}</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 3px;">
              <p style="margin: 0; color: #856404;"><strong>建议：</strong>请记录此次测量结果，并考虑调整饮食或药物剂量。如有疑问，请咨询您的医生。</p>
            </div>
          </div>
        </div>
      `,
      text: `⚠️ ${title}\n\n${content}\n\n建议：请记录此次测量结果，并考虑调整饮食或药物剂量。如有疑问，请咨询您的医生。`,
    };
  }

  /**
   * 获取药物补充提醒邮件内容
   */
  private static getMedicationReminderContent(medicationName: string, daysRemaining: number): string {
    if (daysRemaining <= 0) {
      return `您的药物 ${medicationName} 已经用完，请立即补充。`;
    } else if (daysRemaining <= 3) {
      return `您的药物 ${medicationName} 将在 ${daysRemaining} 天内用完，请尽快补充。`;
    } else {
      return `您的药物 ${medicationName} 将在 ${daysRemaining} 天后用完，建议提前准备。`;
    }
  }

  /**
   * 获取药物提醒邮件模板
   */
  private static getReminderTemplate(title: string, content: string): EmailTemplate {
    return {
      subject: `💊 ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f39c12; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">💊 ${title}</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
            <p style="margin: 0; line-height: 1.6; font-size: 16px;">${content}</p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="/medications" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">管理药物</a>
            </div>
          </div>
        </div>
      `,
      text: `💊 ${title}\n\n${content}\n\n管理药物：/medications`,
    };
  }

  /**
   * 获取膳食计划邮件内容
   */
  private static getMealPlanContent(mealPlan: any): string {
    return `我们为您生成了个性化的膳食计划，包含 ${mealPlan.duration} 天的健康食谱。\n\n请查看附件或访问平台查看详细计划。`;
  }

  /**
   * 获取膳食计划邮件模板
   */
  private static getMealPlanTemplate(title: string, content: string): EmailTemplate {
    return {
      subject: `🍽️ ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">🍽️ ${title}</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
            <p style="margin: 0; line-height: 1.6; font-size: 16px;">${content}</p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="/meal-plans" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">查看膳食计划</a>
            </div>
          </div>
        </div>
      `,
      text: `🍽️ ${title}\n\n${content}\n\n查看膳食计划：/meal-plans`,
    };
  }

  /**
   * 获取订单更新邮件内容
   */
  private static getOrderUpdateContent(orderNumber: string, status: string, details?: any): string {
    const statusMessages: { [key: string]: string } = {
      confirmed: '您的订单已确认，我们正在为您准备商品。',
      shipped: '您的订单已发货，请注意查收。',
      delivered: '您的订单已送达，感谢您的购买！',
      cancelled: '您的订单已取消。',
    };

    return statusMessages[status] || `您的订单状态已更新为：${status}`;
  }

  /**
   * 获取订单邮件模板
   */
  private static getOrderTemplate(title: string, content: string): EmailTemplate {
    return {
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3498db; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">${title}</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
            <p style="margin: 0; line-height: 1.6; font-size: 16px;">${content}</p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="/orders" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">查看订单</a>
            </div>
          </div>
        </div>
      `,
      text: `${title}\n\n${content}\n\n查看订单：/orders`,
    };
  }

  /**
   * 获取欢迎邮件内容
   */
  private static getWelcomeContent(firstName?: string): string {
    const name = firstName ? ` ${firstName}` : '';
    return `亲爱的${name}，\n\n欢迎您加入糖尿病支持平台！我们很高兴您选择我们的服务来管理您的健康。\n\n在我们的平台上，您可以：\n• 记录和跟踪血糖数据\n• 获取个性化的膳食计划\n• 管理您的用药提醒\n• 与AI健康助手对话获得专业建议\n• 与其他糖友交流经验\n\n立即开始您的健康管理之旅吧！`;
  }

  /**
   * 获取欢迎邮件模板
   */
  private static getWelcomeTemplate(title: string, content: string): EmailTemplate {
    return {
      subject: `🎉 ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2ecc71; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">🎉 ${title}</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
            <div style="white-space: pre-line; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">${content}</div>
            <div style="text-align: center; margin-top: 20px;">
              <a href="/dashboard" style="background-color: #2ecc71; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">开始使用</a>
              <a href="/profile" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">完善档案</a>
            </div>
          </div>
        </div>
      `,
      text: `🎉 ${title}\n\n${content}\n\n开始使用：/dashboard\n完善档案：/profile`,
    };
  }

  /**
   * 获取密码重置邮件内容
   */
  private static getPasswordResetContent(resetToken: string): string {
    return `您请求重置密码。请点击以下链接重置您的密码：\n\n${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}\n\n如果这不是您的操作，请忽略此邮件。链接将在24小时后过期。`;
  }

  /**
   * 获取密码重置邮件模板
   */
  private static getPasswordResetTemplate(title: string, content: string): EmailTemplate {
    return {
      subject: `🔐 ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">🔐 ${title}</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
            <div style="white-space: pre-line; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">${content}</div>
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #666; font-size: 14px;">如果这不是您的操作，请忽略此邮件。链接将在24小时后过期。</p>
            </div>
          </div>
        </div>
      `,
      text: `🔐 ${title}\n\n${content}\n\n如果这不是您的操作，请忽略此邮件。链接将在24小时后过期。`,
    };
  }
}
