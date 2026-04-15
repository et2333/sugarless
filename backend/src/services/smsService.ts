/**
 * SMS Service - 短信通知服务
 * 支持发送验证码、通知短信
 * 使用ClickSend API发送短信
 */

import { AppError } from '../middleware/errorHandler';

export interface SMSConfig {
  username: string;
  apiKey: string;
  senderId: string;
}

export class SMSService {
  private static config: SMSConfig;

  /**
   * 初始化短信服务
   */
  static initialize() {
    this.config = {
      username: process.env.CLICKSEND_USERNAME || '',
      apiKey: process.env.CLICKSEND_API_KEY || '',
      senderId: process.env.CLICKSEND_SENDER_ID || '6143523147',
    };
  }

  /**
   * 发送验证码短信
   */
  static async sendVerificationCode(phone: string, channelId: string): Promise<void> {
    const code = this.generateVerificationCode();
    
    // 存储验证码（实际应该存储到数据库或Redis）
    console.log(`SMS verification code for ${phone}: ${code}`);

    const message = `您的验证码是：${code}，有效期10分钟。请勿泄露给他人。`;
    
    await this.sendSMS(phone, message);
  }

  /**
   * 发送通知短信
   */
  static async sendNotificationSMS(
    phone: string, 
    title: string, 
    content: string
  ): Promise<void> {
    const message = `${title}\n\n${content}`;
    
    await this.sendSMS(phone, message);
  }

  /**
   * 发送血糖警报短信
   */
  static async sendBloodSugarAlert(
    phone: string,
    value: number,
    type: string,
    severity: string
  ): Promise<void> {
    const severityText = {
      low: '偏低',
      normal: '正常',
      high: '偏高',
      critical: '严重异常'
    }[severity] || '异常';

    const urgency = severity === 'critical' ? '🚨紧急' : '⚠️';
    const message = `${urgency}血糖警报\n\n您的血糖值为 ${value} mg/dL，属于${severityText}范围。\n\n请${severity === 'critical' ? '立即' : '及时'}采取相应措施。`;
    
    await this.sendSMS(phone, message);
  }

  /**
   * 发送药物补充提醒短信
   */
  static async sendMedicationReminder(
    phone: string,
    medicationName: string,
    daysRemaining: number
  ): Promise<void> {
    let message: string;
    
    if (daysRemaining <= 0) {
      message = `💊药物补充提醒\n\n您的药物 ${medicationName} 已经用完，请立即补充。`;
    } else if (daysRemaining <= 3) {
      message = `💊药物补充提醒\n\n您的药物 ${medicationName} 将在 ${daysRemaining} 天内用完，请尽快补充。`;
    } else {
      message = `💊药物补充提醒\n\n您的药物 ${medicationName} 将在 ${daysRemaining} 天后用完，建议提前准备。`;
    }
    
    await this.sendSMS(phone, message);
  }

  /**
   * 发送预约提醒短信
   */
  static async sendAppointmentReminder(
    phone: string,
    doctorName: string,
    appointmentTime: Date,
    location?: string
  ): Promise<void> {
    const timeStr = appointmentTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let message = `📅预约提醒\n\n您有预约：\n医生：${doctorName}\n时间：${timeStr}`;
    
    if (location) {
      message += `\n地点：${location}`;
    }
    
    message += '\n\n请提前15分钟到达。';
    
    await this.sendSMS(phone, message);
  }

  /**
   * 发送紧急联系短信
   */
  static async sendEmergencyAlert(
    phone: string,
    patientName: string,
    emergencyType: string,
    location?: string
  ): Promise<void> {
    const message = `🚨紧急情况\n\n患者：${patientName}\n情况：${emergencyType}${location ? `\n位置：${location}` : ''}\n\n请立即联系相关人员。`;
    
    await this.sendSMS(phone, message);
  }

  /**
   * 发送通用短信
   */
  private static async sendSMS(to: string, message: string): Promise<void> {
    try {
      if (!this.config) {
        this.initialize();
      }

      // 验证配置
      if (!this.config.username || !this.config.apiKey) {
        throw new Error('ClickSend配置不完整');
      }

      // 格式化手机号
      const formattedPhone = this.formatPhoneNumber(to);
      
      // 构建ClickSend API请求
      const authString = Buffer.from(`${this.config.username}:${this.config.apiKey}`).toString('base64');
      
      const requestBody = {
        messages: [
          {
            source: 'sdk',
            body: message,
            to: formattedPhone,
            from: this.config.senderId,
          }
        ]
      };

      console.log('ClickSend API请求:', {
        url: 'https://rest.clicksend.com/v3/sms/send',
        body: requestBody,
        auth: `${this.config.username}:${this.config.apiKey.substring(0, 8)}...`
      });

      const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      console.log('ClickSend API响应:', {
        status: response.status,
        statusText: response.statusText,
        result: result
      });

      if (!response.ok) {
        console.error('ClickSend API Error:', result);
        // 如果是401错误，提供更详细的错误信息
        if (response.status === 401) {
          throw new Error(`ClickSend认证失败: ${result.response_msg || '请检查用户名和API密钥是否正确'}`);
        }
        throw new Error(`ClickSend API Error: ${result.response_msg || 'Unknown error'}`);
      }

      if (result.response_code !== 'SUCCESS') {
        console.error('ClickSend SMS Error:', result);
        throw new Error(`SMS发送失败: ${result.response_msg || 'Unknown error'}`);
      }

      console.log(`SMS sent to ${formattedPhone} successfully`);
      console.log(`Message ID: ${result.data?.messages?.[0]?.message_id}`);
      
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      throw new AppError(`发送短信失败: ${error.message}`, 500, 'SMS_SEND_FAILED');
    }
  }

  /**
   * 生成验证码
   */
  private static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 验证手机号码格式
   */
  static validatePhoneNumber(phone: string): boolean {
    // 支持国际格式和中国手机号格式
    const phoneRegex = /^(\+?86|0)?1[3-9]\d{9}$|^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 格式化手机号码
   */
  static formatPhoneNumber(phone: string): string {
    // 移除所有非数字字符
    const cleaned = phone.replace(/\D/g, '');
    
    // 如果是中国手机号，添加+86前缀
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+86${cleaned}`;
    }
    
    // 如果已经是国际格式，直接返回
    if (cleaned.startsWith('86') && cleaned.length === 13) {
      return `+${cleaned}`;
    }
    
    // 其他情况，添加+号
    return `+${cleaned}`;
  }

  /**
   * 检查短信发送限制
   */
  static async checkRateLimit(phone: string): Promise<boolean> {
    // 在实际环境中，这里应该检查Redis或数据库中的发送记录
    // 防止频繁发送短信
    
    // 模拟检查：每分钟最多发送1条短信
    const now = Date.now();
    const lastSent = this.getLastSentTime(phone);
    
    if (lastSent && (now - lastSent) < 60000) { // 60秒
      return false;
    }
    
    this.setLastSentTime(phone, now);
    return true;
  }

  /**
   * 获取最后发送时间（模拟实现）
   */
  private static getLastSentTime(phone: string): number | null {
    // 在实际环境中，这里应该从Redis获取
    return null;
  }

  /**
   * 设置最后发送时间（模拟实现）
   */
  private static setLastSentTime(phone: string, timestamp: number): void {
    // 在实际环境中，这里应该存储到Redis
    console.log(`SMS rate limit updated for ${phone}: ${timestamp}`);
  }

  /**
   * 获取短信发送状态
   */
  static async getDeliveryStatus(messageId: string): Promise<string> {
    try {
      // 在实际环境中，这里应该查询Twilio API获取发送状态
      // 这里返回模拟状态
      return 'delivered';
    } catch (error: any) {
      console.error('Failed to get SMS delivery status:', error);
      return 'unknown';
    }
  }

  /**
   * 获取短信发送统计
   */
  static async getSendingStats(phone: string, period: 'day' | 'week' | 'month'): Promise<{
    sent: number;
    delivered: number;
    failed: number;
  }> {
    // 在实际环境中，这里应该从数据库查询统计信息
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
    };
  }
}
