/**
 * ChatService - Real-time Chat and Consultation
 * From Report: UC-C1 Health Reminder - Real-time communication
 */

import { Server as SocketIOServer } from 'socket.io';
import prisma from '../utils/prisma';

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  metadata?: any;
  isRead: boolean;
  readAt?: Date;
  replyToId?: string;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  sessionType: 'consultation' | 'support' | 'general';
  title?: string;
  status: 'active' | 'closed' | 'archived';
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
  messages?: ChatMessage[];
}

export class ChatService {
  private static io: SocketIOServer;

  /**
   * Initialize Socket.IO server
   */
  static initialize(server: any, existingIO?: SocketIOServer) {
    // 如果已经存在Socket.IO实例，使用它；否则创建新的
    if (existingIO) {
      this.io = existingIO;
    } else {
      this.io = new SocketIOServer(server, {
        cors: {
          origin: process.env.CORS_ORIGIN || "http://localhost:5173",
          methods: ["GET", "POST"],
          credentials: true
        }
      });
    }

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join user to their personal room
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
      });

      // Join session room
      socket.on('join-session', (sessionId: string) => {
        socket.join(`session-${sessionId}`);
        console.log(`User joined session ${sessionId}`);
      });

      // Handle new message
      socket.on('send-message', async (data: {
        sessionId: string;
        content: string;
        messageType?: string;
        replyToId?: string;
      }) => {
        try {
          const message = await this.sendMessage({
            sessionId: data.sessionId,
            senderId: socket.data.userId,
            content: data.content,
            messageType: data.messageType || 'text',
            replyToId: data.replyToId,
          });

          // Broadcast to session room
          this.io.to(`session-${data.sessionId}`).emit('new-message', message);
          
          // Notify participants
          this.io.to(`session-${data.sessionId}`).emit('message-received', {
            sessionId: data.sessionId,
            messageCount: 1,
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicator
      socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
        socket.to(`session-${data.sessionId}`).emit('user-typing', {
          userId: socket.data.userId,
          isTyping: data.isTyping,
        });
      });

      // Handle read receipt
      socket.on('mark-read', async (data: { messageId: string }) => {
        try {
          await this.markMessageAsRead(data.messageId);
          socket.to(`session-${socket.data.sessionId}`).emit('message-read', {
            messageId: data.messageId,
            readAt: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to mark message as read' });
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    return this.io;
  }

  /**
   * Create new chat session
   */
  static async createSession(data: {
    userId: string;
    sessionType: 'consultation' | 'support' | 'general';
    title?: string;
    participants?: string[];
  }): Promise<ChatSession> {
    const session = await prisma.chatSession.create({
      data: {
        userId: data.userId,
        sessionType: data.sessionType,
        title: data.title,
        participants: JSON.stringify(data.participants || [data.userId]),
        status: 'active',
      },
    });

    return this.mapToSessionModel(session);
  }

  /**
   * Get user's chat sessions
   */
  static async getUserSessions(userId: string): Promise<ChatSession[]> {
    const sessions = await prisma.chatSession.findMany({
      where: {
        participants: {
          contains: userId,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return sessions.map(session => this.mapToSessionModel(session));
  }

  /**
   * Get session with messages
   */
  static async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        participants: {
          contains: userId,
        },
      },
      include: {
        messages: {
          include: {
            sender: {
              include: { profile: true },
            },
            replyTo: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) return null;

    return this.mapToSessionModel(session);
  }

  /**
   * Send message
   */
  static async sendMessage(data: {
    sessionId: string;
    senderId: string;
    content: string;
    messageType?: string;
    replyToId?: string;
  }): Promise<ChatMessage> {
    // Verify session exists and user is participant
    const session = await prisma.chatSession.findFirst({
      where: {
        id: data.sessionId,
        participants: {
          contains: data.senderId,
        },
      },
    });

    if (!session) {
      throw new Error('Session not found or access denied');
    }

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: data.senderId },
      include: { profile: true },
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    const senderName = `${sender.profile?.firstName || 'User'} ${sender.profile?.lastName || ''}`.trim();

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        senderId: data.senderId,
        senderName,
        content: data.content,
        messageType: data.messageType || 'text',
        replyToId: data.replyToId,
      },
      include: {
        sender: {
          include: { profile: true },
        },
        replyTo: true,
      },
    });

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: data.sessionId },
      data: { updatedAt: new Date() },
    });

    return this.mapToMessageModel(message);
  }

  /**
   * Mark message as read
   */
  static async markMessageAsRead(messageId: string): Promise<void> {
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Close session
   */
  static async closeSession(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId, // Only creator can close
      },
    });

    if (!session) {
      throw new Error('Session not found or access denied');
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });

    // Notify participants
    this.io.to(`session-${sessionId}`).emit('session-closed', {
      sessionId,
      closedAt: new Date(),
    });
  }

  /**
   * Add participant to session
   */
  static async addParticipant(sessionId: string, userId: string, newParticipantId: string): Promise<void> {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        participants: {
          contains: userId,
        },
      },
    });

    if (!session) {
      throw new Error('Session not found or access denied');
    }

    const participants = JSON.parse(session.participants);
    if (!participants.includes(newParticipantId)) {
      participants.push(newParticipantId);
      
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          participants: JSON.stringify(participants),
        },
      });

      // Notify new participant
      this.io.to(`user-${newParticipantId}`).emit('session-invite', {
        sessionId,
        title: session.title,
        sessionType: session.sessionType,
      });
    }
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const count = await prisma.chatMessage.count({
      where: {
        session: {
          participants: {
            contains: userId,
          },
        },
        senderId: {
          not: userId,
        },
        isRead: false,
      },
    });

    return count;
  }

  /**
   * Map database session to model
   */
  private static mapToSessionModel(session: any): ChatSession {
    return {
      id: session.id,
      userId: session.userId,
      sessionType: session.sessionType,
      title: session.title,
      status: session.status,
      participants: JSON.parse(session.participants),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages?.map((msg: any) => this.mapToMessageModel(msg)),
    };
  }

  /**
   * Map database message to model
   */
  private static mapToMessageModel(message: any): ChatMessage {
    return {
      id: message.id,
      sessionId: message.sessionId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      messageType: message.messageType,
      metadata: message.metadata ? JSON.parse(message.metadata) : undefined,
      isRead: message.isRead,
      readAt: message.readAt,
      replyToId: message.replyToId,
      createdAt: message.createdAt,
    };
  }
}
