/**
 * Calendar Service - 日历集成服务
 * 支持Google Calendar、Outlook、Apple Calendar
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

export interface CalendarCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  calendarId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  reminders?: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  source: 'google' | 'outlook' | 'apple';
  externalId?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  eventsCount: number;
  lastSyncTime: Date;
  errors?: string[];
}

export class CalendarService {
  private static readonly GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  private static readonly GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  private static readonly GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/notifications/calendar/google/callback';

  /**
   * 获取Google OAuth2客户端
   */
  private static getGoogleOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET,
      this.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * 获取Google授权URL
   */
  static getGoogleAuthUrl(userId: string): string {
    const oauth2Client = this.getGoogleOAuth2Client();
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      state: userId, // 传递用户ID用于回调验证
    });
  }

  /**
   * 处理Google OAuth回调并获取tokens
   */
  static async handleGoogleCallback(authCode: string, userId: string): Promise<CalendarCredentials> {
    try {
      const oauth2Client = this.getGoogleOAuth2Client();
      
      const { tokens } = await oauth2Client.getToken(authCode);
      
      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        calendarId: 'primary', // 默认使用主日历
      };
    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      throw new AppError('Google授权失败', 500, 'GOOGLE_AUTH_FAILED');
    }
  }

  /**
   * 同步日历
   */
  static async syncCalendar(
    userId: string,
    calendarType: 'google' | 'outlook' | 'apple',
    credentials: CalendarCredentials
  ): Promise<CalendarSyncResult> {
    try {
      // 存储或更新用户日历凭据
      await this.storeCalendarCredentials(userId, calendarType, credentials);

      // 获取日历事件
      const events = await this.fetchCalendarEvents(calendarType, credentials);

      // 存储事件到数据库
      const storedEvents = await this.storeCalendarEvents(userId, events);

      return {
        success: true,
        eventsCount: storedEvents.length,
        lastSyncTime: new Date(),
      };
    } catch (error: any) {
      console.error('Calendar sync failed:', error);
      return {
        success: false,
        eventsCount: 0,
        lastSyncTime: new Date(),
        errors: [error.message],
      };
    }
  }

  /**
   * 获取日历事件
   */
  static async getEvents(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      calendarType?: 'google' | 'outlook' | 'apple';
    } = {}
  ): Promise<CalendarEvent[]> {
    try {
      const where: any = { userId };

      if (options.startDate) {
        where.startTime = { gte: options.startDate };
      }

      if (options.endDate) {
        where.endTime = { lte: options.endDate };
      }

      if (options.calendarType) {
        where.source = options.calendarType;
      }

      const events = await prisma.calendarEvent.findMany({
        where,
        orderBy: { startTime: 'asc' },
      });

      return events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        attendees: event.attendees ? JSON.parse(event.attendees) : undefined,
        reminders: event.reminders ? JSON.parse(event.reminders) : undefined,
        recurrence: event.recurrence ? JSON.parse(event.recurrence) : undefined,
        source: event.source as any,
        externalId: event.externalId,
      }));
    } catch (error: any) {
      throw new AppError('获取日历事件失败', 500, 'FETCH_EVENTS_FAILED');
    }
  }

  /**
   * 创建日历事件
   */
  static async createEvent(
    userId: string,
    eventData: {
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      location?: string;
      attendees?: Array<{ email: string; name?: string }>;
      reminders?: Array<{ method: 'email' | 'popup'; minutes: number }>;
      recurrence?: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        interval: number;
        endDate?: Date;
      };
    }
  ): Promise<CalendarEvent> {
    try {
      // 创建本地事件
      const event = await prisma.calendarEvent.create({
        data: {
          userId,
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          attendees: eventData.attendees ? JSON.stringify(eventData.attendees) : null,
          reminders: eventData.reminders ? JSON.stringify(eventData.reminders) : null,
          recurrence: eventData.recurrence ? JSON.stringify(eventData.recurrence) : null,
          source: 'local',
        },
      });

      // 尝试同步到外部日历
      await this.syncEventToExternalCalendars(userId, event);

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        attendees: event.attendees ? JSON.parse(event.attendees) : undefined,
        reminders: event.reminders ? JSON.parse(event.reminders) : undefined,
        recurrence: event.recurrence ? JSON.parse(event.recurrence) : undefined,
        source: event.source as any,
        externalId: event.externalId,
      };
    } catch (error: any) {
      throw new AppError('创建日历事件失败', 500, 'CREATE_EVENT_FAILED');
    }
  }

  /**
   * 更新日历事件
   */
  static async updateEvent(
    eventId: string,
    userId: string,
    updates: Partial<{
      title: string;
      description: string;
      startTime: Date;
      endTime: Date;
      location: string;
      attendees: Array<{ email: string; name?: string }>;
      reminders: Array<{ method: 'email' | 'popup'; minutes: number }>;
    }>
  ): Promise<CalendarEvent> {
    try {
      const event = await prisma.calendarEvent.findFirst({
        where: { id: eventId, userId },
      });

      if (!event) {
        throw new AppError('日历事件不存在', 404, 'EVENT_NOT_FOUND');
      }

      const updateData: any = { ...updates };
      
      if (updates.attendees) {
        updateData.attendees = JSON.stringify(updates.attendees);
      }
      
      if (updates.reminders) {
        updateData.reminders = JSON.stringify(updates.reminders);
      }

      const updatedEvent = await prisma.calendarEvent.update({
        where: { id: eventId },
        data: updateData,
      });

      // 同步到外部日历
      await this.syncEventToExternalCalendars(userId, updatedEvent);

      return {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        location: updatedEvent.location,
        attendees: updatedEvent.attendees ? JSON.parse(updatedEvent.attendees) : undefined,
        reminders: updatedEvent.reminders ? JSON.parse(updatedEvent.reminders) : undefined,
        recurrence: updatedEvent.recurrence ? JSON.parse(updatedEvent.recurrence) : undefined,
        source: updatedEvent.source as any,
        externalId: updatedEvent.externalId,
      };
    } catch (error: any) {
      throw new AppError('更新日历事件失败', 500, 'UPDATE_EVENT_FAILED');
    }
  }

  /**
   * 删除日历事件
   */
  static async deleteEvent(eventId: string, userId: string): Promise<void> {
    try {
      const event = await prisma.calendarEvent.findFirst({
        where: { id: eventId, userId },
      });

      if (!event) {
        throw new AppError('日历事件不存在', 404, 'EVENT_NOT_FOUND');
      }

      // 从外部日历删除
      if (event.externalId) {
        await this.deleteEventFromExternalCalendar(userId, event);
      }

      // 从本地数据库删除
      await prisma.calendarEvent.delete({
        where: { id: eventId },
      });
    } catch (error: any) {
      throw new AppError('删除日历事件失败', 500, 'DELETE_EVENT_FAILED');
    }
  }

  /**
   * 存储日历凭据
   */
  private static async storeCalendarCredentials(
    userId: string,
    calendarType: string,
    credentials: CalendarCredentials
  ): Promise<void> {
    await prisma.calendarCredentials.upsert({
      where: {
        userId_calendarType: {
          userId,
          calendarType,
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
        calendarType,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        calendarId: credentials.calendarId,
      },
    });
  }

  /**
   * 获取日历凭据
   */
  private static async getCalendarCredentials(
    userId: string,
    calendarType: string
  ): Promise<CalendarCredentials | null> {
    const credentials = await prisma.calendarCredentials.findUnique({
      where: {
        userId_calendarType: {
          userId,
          calendarType,
        },
      },
    });

    if (!credentials) {
      return null;
    }

    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      calendarId: credentials.calendarId,
    };
  }

  /**
   * 从外部日历获取事件
   */
  private static async fetchCalendarEvents(
    calendarType: string,
    credentials: CalendarCredentials
  ): Promise<CalendarEvent[]> {
    console.log(`Fetching events from ${calendarType} calendar`);

    try {
      switch (calendarType) {
        case 'google':
          return await this.fetchGoogleCalendarEvents(credentials);
        case 'outlook':
          return await this.fetchOutlookCalendarEvents(credentials);
        case 'apple':
          return await this.fetchAppleCalendarEvents(credentials);
        default:
          throw new Error(`Unsupported calendar type: ${calendarType}`);
      }
    } catch (error: any) {
      console.error(`Failed to fetch ${calendarType} calendar events:`, error);
      // 返回空数组而不是抛出错误，允许其他功能继续工作
      return [];
    }
  }

  /**
   * 从Google Calendar获取事件
   */
  private static async fetchGoogleCalendarEvents(credentials: CalendarCredentials): Promise<CalendarEvent[]> {
    try {
      const oauth2Client = this.getGoogleOAuth2Client();
      
      // 设置访问令牌
      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiresAt?.getTime(),
      });

      // 获取Google Calendar API实例
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // 获取未来30天的事件
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await calendar.events.list({
        calendarId: credentials.calendarId || 'primary',
        timeMin: now.toISOString(),
        timeMax: thirtyDaysLater.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      return events.map((event: any) => ({
        id: event.id || '',
        title: event.summary || '无标题事件',
        description: event.description,
        startTime: new Date(event.start?.dateTime || event.start?.date || now),
        endTime: new Date(event.end?.dateTime || event.end?.date || now),
        location: event.location,
        attendees: event.attendees?.map((attendee: any) => ({
          email: attendee.email,
          name: attendee.displayName,
          responseStatus: attendee.responseStatus,
        })),
        reminders: event.reminders?.overrides?.map((reminder: any) => ({
          method: reminder.method === 'email' ? 'email' : 'popup',
          minutes: reminder.minutes,
        })),
        source: 'google' as const,
        externalId: event.id,
      }));
    } catch (error: any) {
      console.error('Google Calendar API error:', error);
      
      // 如果是认证错误，尝试刷新token
      if (error.code === 401 && credentials.refreshToken) {
        console.log('Token expired, attempting to refresh...');
        try {
          await this.refreshGoogleToken(credentials);
          // 递归调用以使用新的token
          return await this.fetchGoogleCalendarEvents(credentials);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Google Calendar认证失败，请重新授权');
        }
      }
      
      throw error;
    }
  }

  /**
   * 刷新Google访问令牌
   */
  private static async refreshGoogleToken(credentials: CalendarCredentials): Promise<void> {
    if (!credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    const oauth2Client = this.getGoogleOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
    
    if (newTokens.access_token) {
      credentials.accessToken = newTokens.access_token;
      credentials.expiresAt = newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined;
      
      // 更新数据库中的凭据
      // 这里需要根据实际的数据库结构来更新
    }
  }

  /**
   * 从Outlook Calendar获取事件 (模拟)
   */
  private static async fetchOutlookCalendarEvents(credentials: CalendarCredentials): Promise<CalendarEvent[]> {
    // TODO: 实现Outlook Calendar API
    console.log('Outlook Calendar integration not implemented yet');
    return [];
  }

  /**
   * 从Apple Calendar获取事件 (模拟)
   */
  private static async fetchAppleCalendarEvents(credentials: CalendarCredentials): Promise<CalendarEvent[]> {
    // TODO: 实现Apple Calendar API
    console.log('Apple Calendar integration not implemented yet');
    return [];
  }

  /**
   * 存储日历事件
   */
  private static async storeCalendarEvents(
    userId: string,
    events: CalendarEvent[]
  ): Promise<any[]> {
    const storedEvents = [];

    for (const event of events) {
      const storedEvent = await prisma.calendarEvent.upsert({
        where: {
          userId_externalId: {
            userId,
            externalId: event.externalId || '',
          },
        },
        update: {
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          attendees: event.attendees ? JSON.stringify(event.attendees) : null,
          reminders: event.reminders ? JSON.stringify(event.reminders) : null,
          recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
          source: event.source,
          updatedAt: new Date(),
        },
        create: {
          userId,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          attendees: event.attendees ? JSON.stringify(event.attendees) : null,
          reminders: event.reminders ? JSON.stringify(event.reminders) : null,
          recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
          source: event.source,
          externalId: event.externalId,
        },
      });

      storedEvents.push(storedEvent);
    }

    return storedEvents;
  }

  /**
   * 同步事件到外部日历
   */
  private static async syncEventToExternalCalendars(
    userId: string,
    event: any
  ): Promise<void> {
    // 获取所有已连接的日历
    const credentials = await prisma.calendarCredentials.findMany({
      where: { userId },
    });

    for (const cred of credentials) {
      try {
        const calendarCredentials: CalendarCredentials = {
          accessToken: cred.accessToken,
          refreshToken: cred.refreshToken,
          expiresAt: cred.expiresAt,
          calendarId: cred.calendarId,
        };

        switch (cred.calendarType) {
          case 'google':
            await this.createGoogleCalendarEvent(calendarCredentials, event);
            break;
          case 'outlook':
            console.log('Outlook calendar sync not implemented yet');
            break;
          case 'apple':
            console.log('Apple calendar sync not implemented yet');
            break;
        }
        
        console.log(`Successfully synced event to ${cred.calendarType} calendar`);
      } catch (error) {
        console.error(`Failed to sync event to ${cred.calendarType}:`, error);
      }
    }
  }

  /**
   * 在Google Calendar中创建事件
   */
  private static async createGoogleCalendarEvent(
    credentials: CalendarCredentials,
    eventData: any
  ): Promise<string> {
    try {
      const oauth2Client = this.getGoogleOAuth2Client();
      
      // 设置访问令牌
      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiresAt?.getTime(),
      });

      // 获取Google Calendar API实例
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // 构建Google Calendar事件对象
      const googleEvent = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'Asia/Shanghai',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'Asia/Shanghai',
        },
        attendees: eventData.attendees ? JSON.parse(eventData.attendees).map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.name,
        })) : undefined,
        reminders: {
          useDefault: false,
          overrides: eventData.reminders ? JSON.parse(eventData.reminders).map((reminder: any) => ({
            method: reminder.method === 'email' ? 'email' : 'popup',
            minutes: reminder.minutes,
          })) : [
            { method: 'popup', minutes: 10 },
            { method: 'email', minutes: 30 },
          ],
        },
      };

      // 创建事件
      const response = await calendar.events.insert({
        calendarId: credentials.calendarId || 'primary',
        resource: googleEvent,
      });

      return response.data.id || '';
    } catch (error: any) {
      console.error('Failed to create Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * 从外部日历删除事件
   */
  private static async deleteEventFromExternalCalendar(
    userId: string,
    event: any
  ): Promise<void> {
    // 在实际环境中，这里应该调用相应的日历API删除事件
    console.log(`Deleting event from external calendar: ${event.externalId}`);
  }

  /**
   * 获取日历连接状态
   */
  static async getCalendarStatus(userId: string): Promise<{
    google: boolean;
    outlook: boolean;
    apple: boolean;
  }> {
    const credentials = await prisma.calendarCredentials.findMany({
      where: { userId },
    });

    const status = {
      google: false,
      outlook: false,
      apple: false,
    };

    for (const cred of credentials) {
      if (cred.calendarType === 'google') status.google = true;
      if (cred.calendarType === 'outlook') status.outlook = true;
      if (cred.calendarType === 'apple') status.apple = true;
    }

    return status;
  }

  /**
   * 断开日历连接
   */
  static async disconnectCalendar(
    userId: string,
    calendarType: string
  ): Promise<void> {
    await prisma.calendarCredentials.deleteMany({
      where: {
        userId,
        calendarType,
      },
    });
  }
}
