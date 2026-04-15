/**
 * Reminder Scheduler Service
 * 定时检查并触发提醒通知
 */

import * as cron from 'node-cron';
import prisma from '../utils/prisma';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;
let schedulerTask: cron.ScheduledTask | null = null;

/**
 * 初始化提醒调度器
 */
export function initializeReminderScheduler(socketServer: SocketIOServer) {
  io = socketServer;
  
  // 每分钟检查一次提醒（在每个分钟的0秒执行）
  schedulerTask = cron.schedule('0 * * * * *', async () => {
    await checkAndTriggerReminders();
  });
  
  console.log('✅ Reminder scheduler initialized - checking every minute');
}

/**
 * 停止提醒调度器
 */
export function stopReminderScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('⏹️ Reminder scheduler stopped');
  }
}

/**
 * 检查并触发到期的提醒
 */
async function checkAndTriggerReminders() {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 转换为1-7（周一到周日）
    const today = now.toISOString().split('T')[0];
    
    // 查找所有活跃的提醒
    const activeReminders = await prisma.reminder.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    
    // 过滤出当前时间需要触发的提醒
    const remindersToTrigger = activeReminders.filter(reminder => {
      // 检查时间是否匹配
      if (reminder.scheduleTime !== currentTime) {
        return false;
      }
      
      const daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
      
      // 检查调度类型
      if (reminder.scheduleType === 'daily') {
        // 每天：检查今天是否在daysOfWeek中
        return daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek);
      } else if (reminder.scheduleType === 'weekly') {
        // 每周：检查今天是否在daysOfWeek中
        return daysOfWeek.includes(dayOfWeek);
      } else if (reminder.scheduleType === 'once') {
        // 单次：检查startDate是否是今天
        const startDate = new Date(reminder.startDate);
        return startDate.toISOString().split('T')[0] === today;
      }
      
      return false;
    });
    
    // 检查是否在今天已经提醒过（避免重复提醒）
    for (const reminder of remindersToTrigger) {
      const lastReminded = reminder.lastRemindedAt;
      const shouldNotify = !lastReminded || 
        new Date(lastReminded).toISOString().split('T')[0] !== today;
      
      if (shouldNotify) {
        // 触发提醒
        await triggerReminder(reminder);
        
        // 更新最后提醒时间
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { lastRemindedAt: now }
        });
      }
    }
    
    if (remindersToTrigger.length > 0) {
      console.log(`🔔 Triggered ${remindersToTrigger.length} reminder(s) at ${currentTime}`);
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

/**
 * Trigger reminder notification
 */
async function triggerReminder(reminder: any) {
  if (!io) {
    console.error('Socket.IO server not initialized');
    return;
  }
  
  // Prepare reminder data
  const reminderData = {
    reminder: {
      id: reminder.id,
      userId: reminder.userId,
      type: reminder.type,
      title: reminder.title,
      content: reminder.message || reminder.title,
      message: reminder.message || reminder.title,
      priority: reminder.priority,
      time: reminder.scheduleTime,
      scheduleTime: reminder.scheduleTime,
      timestamp: new Date().toISOString(),
    },
    userId: reminder.userId,
  };
  
  // Send reminder notification via Socket.IO to the specific user's room
  io.to(`user-${reminder.userId}`).emit('reminder-notification', reminderData);
  
  // Also emit to the reminder-triggered event for backward compatibility
  io.to(`user-${reminder.userId}`).emit('reminder-triggered', reminderData);
  
  console.log(`📤 Sent reminder ${reminder.id} to user ${reminder.userId}`);
}

/**
 * 手动触发提醒（用于测试）
 */
export async function triggerTestReminder(userId: string, reminderId?: string) {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  
  let reminder;
  
  if (reminderId) {
    reminder = await prisma.reminder.findUnique({
      where: { id: reminderId, userId },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  } else {
    // 获取用户第一个活跃提醒作为测试
    reminder = await prisma.reminder.findFirst({
      where: { userId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  }
  
  if (!reminder) {
    throw new Error('No reminder found');
  }
  
  await triggerReminder(reminder);
  return reminder;
}

