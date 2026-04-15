/**
 * Reminder Notification Service
 * 前端提醒通知服务 - 处理浏览器通知、声音、弹窗等
 */

import { message } from 'antd';
import voiceService from './voiceService';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../api/client';

interface ReminderData {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  scheduleTime: string;
  timestamp: string;
}

class ReminderNotificationService {
  private audioAlert: HTMLAudioElement | null = null;
  private socket: any = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private notificationPermission: NotificationPermission = 'default';
  private snoozeCounters: Map<string, number> = new Map();
  private snoozeTimers: Map<string, number> = new Map();
  private snoozeNextAt: Map<string, number> = new Map();
  private snoozePayload: Map<string, any> = new Map();

  constructor() {
    this.initializeAudio();
  }

  // 初始化音频
  private initializeAudio() {
    try {
      // 创建一个简单的提示音（使用Web Audio API生成）
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      this.audioAlert = null; // Web Audio API handles it
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  // 初始化服务
  async init(userId: string, socket: any) {
    this.userId = userId;
    this.socket = socket;
    
    // 1. 请求浏览器通知权限
    await this.requestNotificationPermission();
    
    // 恢复持久化的snooze状态
    this.restoreSnoozeState();
    this.resumePendingSnoozes();

    // 2. 监听Socket.IO提醒事件
    this.setupSocketListeners();
    
    // 3. 启动本地定时检查（备用）
    this.startLocalChecking();
    
    // 4. 注册Service Worker（如果支持）
    this.registerServiceWorker();
  }

  // 请求通知权限
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      console.log('Notification permission:', permission);
      return permission === 'granted';
    }
    return false;
  }

  // 设置Socket.IO监听
  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('reminder-triggered', (reminder: ReminderData) => {
      console.log('🔔 Reminder triggered:', reminder);
      this.triggerReminder(reminder);
    });

    // 加入用户房间以接收提醒
    if (this.userId) {
      this.socket.emit('join-user', this.userId);
    }
  }

  // Local periodic check (every 30 seconds, backup solution) - DISABLED
  // ReminderScheduler handles all reminder checking now
  private startLocalChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Only check pending snoozes, not regular reminders
    this.checkInterval = setInterval(() => {
      // this.checkLocalReminders(); // DISABLED - handled by ReminderScheduler
      this.checkPendingSnoozes();
    }, 30000);
  }

  // Check local reminders - DEPRECATED, handled by ReminderScheduler
  private async checkLocalReminders() {
    if (!this.userId) return;

    try {
      // Carry login token to avoid 401
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/reminders/today', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include'
      });
      if (!response.ok) return;
      
      const result = await response.json();
      const reminders = result.data || [];
      
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      reminders.forEach((reminder: any) => {
        if (reminder.scheduleTime === currentTime && reminder.isActive) {
          // Check if already reminded today
          const lastReminded = reminder.lastRemindedAt;
          const shouldNotify = !lastReminded || 
            new Date(lastReminded).toISOString().split('T')[0] !== now.toISOString().split('T')[0];
          
          if (shouldNotify) {
            this.triggerReminder(reminder);
          }
        }
      });
    } catch (error) {
      console.error('Failed to check reminders:', error);
    }
  }

  // Trigger reminder
  triggerReminder(reminder: ReminderData | any) {
    console.log('🔔 Triggering reminder:', reminder);
    
    // Note: Browser notification is disabled here to avoid duplicates
    // ReminderScheduler handles all notifications uniformly
    // 1. Browser system notification - DISABLED to avoid duplicate notifications
    // this.showSystemNotification(reminder);
    
    // 2. Play sound - DISABLED, handled by ReminderScheduler
    // this.playSound();
    
    // 3. Voice announcement - DISABLED, handled by ReminderScheduler
    // this.speakReminder(reminder);
    
    // 4. Vibration (mobile devices) - DISABLED, handled by ReminderScheduler  
    // this.vibrate();
    
    // 5. Show in-app popup - DISABLED, handled by ReminderScheduler
    // this.emitInAppNotification(reminder);
    
    // This service is now only used for snooze functionality
    console.log('[reminderNotificationService] Reminder triggering is now handled by ReminderScheduler');
  }

  // Schedule snooze reminder (local reminder after 10 minutes)
  async scheduleSnooze(reminder: ReminderData | any, minutes: number = 10) {
    try {
      // Clear existing snooze for the same ID
      const existing = this.snoozeTimers.get(reminder.id);
      if (existing) {
        window.clearTimeout(existing);
      }

      // Report user behavior
      try {
        await apiClient.post('/reminders/record-response', {
          reminderId: reminder.id,
          action: 'snooze',
          snoozeDuration: minutes,
          scheduledTime: new Date().toISOString(),
          actualResponseTime: new Date().toISOString(),
        });
        // Notify frontend to refresh check-ins
        window.dispatchEvent(new Event('checkins-update'));
      } catch {}

      const fireAt = Date.now() + minutes * 60 * 1000;
      const timeoutId = window.setTimeout(() => {
        this.triggerReminder(reminder);
        this.snoozeTimers.delete(reminder.id);
        this.snoozeNextAt.delete(reminder.id);
      }, minutes * 60 * 1000);

      this.snoozeTimers.set(reminder.id, timeoutId);
      this.snoozeNextAt.set(reminder.id, fireAt);
      this.snoozePayload.set(reminder.id, reminder);
      this.persistSnoozeState();
      message.info(`Snoozed for ${minutes} minutes`);

      // Count and trigger AI suggestion when threshold is reached
      const newCount = (this.snoozeCounters.get(reminder.id) || 0) + 1;
      this.snoozeCounters.set(reminder.id, newCount);
      this.persistSnoozeState();

      if (newCount >= 5) {
        try {
          const token = useAuthStore.getState().token;
          const resp = await fetch(`/api/reminders/${reminder.id}/analyze`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include'
          });
          const data = await resp.json();
          console.log('AI analyze response:', data);
          if (data && data.suggestion) {
            const evt = new CustomEvent('ai-suggestion', { detail: data.suggestion });
            window.dispatchEvent(evt);
          }
          // Reset counter to avoid repeated popups
          this.snoozeCounters.set(reminder.id, 0);
          this.persistSnoozeState();
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to schedule snooze:', e);
    }
  }

  // Fallback: in case browsers throttle setTimeout, check pending snoozes every 30s
  private checkPendingSnoozes() {
    const now = Date.now();
    this.snoozeNextAt.forEach((ts, id) => {
      if (now >= ts) {
        // clear any stale timeout and fire
        const t = this.snoozeTimers.get(id);
        if (t) window.clearTimeout(t);
        this.snoozeTimers.delete(id);
        this.snoozeNextAt.delete(id);
        const payload = this.snoozePayload.get(id);
        if (payload) {
          this.triggerReminder(payload);
          this.snoozePayload.delete(id);
        }
        this.persistSnoozeState();
      }
    });
  }

  // 将snooze状态持久化，避免刷新丢失
  private persistSnoozeState() {
    try {
      const counters: Record<string, number> = {};
      this.snoozeCounters.forEach((v, k) => (counters[k] = v));
      const nextAt: Record<string, number> = {};
      this.snoozeNextAt.forEach((v, k) => (nextAt[k] = v));
      const payloads: Record<string, any> = {};
      this.snoozePayload.forEach((v, k) => (payloads[k] = v));
      localStorage.setItem('snoozeCounters.v1', JSON.stringify(counters));
      localStorage.setItem('snoozeNextAt.v1', JSON.stringify(nextAt));
      localStorage.setItem('snoozePayload.v1', JSON.stringify(payloads));
    } catch {}
  }

  private restoreSnoozeState() {
    try {
      const counters = JSON.parse(localStorage.getItem('snoozeCounters.v1') || '{}');
      const nextAt = JSON.parse(localStorage.getItem('snoozeNextAt.v1') || '{}');
      const payloads = JSON.parse(localStorage.getItem('snoozePayload.v1') || '{}');
      this.snoozeCounters = new Map(Object.entries(counters).map(([k, v]) => [k, Number(v)]));
      this.snoozeNextAt = new Map(Object.entries(nextAt).map(([k, v]) => [k, Number(v)]));
      this.snoozePayload = new Map(Object.entries(payloads));
    } catch {}
  }

  private resumePendingSnoozes() {
    const now = Date.now();
    this.snoozeNextAt.forEach((ts, id) => {
      const payload = this.snoozePayload.get(id);
      if (!payload) return;
      if (ts <= now) {
        this.triggerReminder(payload);
        this.snoozeNextAt.delete(id);
        this.snoozePayload.delete(id);
      } else {
        const delay = ts - now;
        const t = window.setTimeout(() => {
          this.triggerReminder(payload);
          this.snoozeTimers.delete(id);
          this.snoozeNextAt.delete(id);
          this.snoozePayload.delete(id);
          this.persistSnoozeState();
        }, delay);
        this.snoozeTimers.set(id, t);
      }
    });
    this.persistSnoozeState();
  }

  // 系统通知
  private showSystemNotification(reminder: ReminderData | any) {
    if (this.notificationPermission !== 'granted') {
      return;
    }

    const title = `💊 ${reminder.title || 'Reminder'}`;
    const body = reminder.message || reminder.content || 'Time for your reminder';

    const notification = new Notification(title, {
      body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: reminder.id,
      requireInteraction: true,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      // 可以导航到提醒页面
      if (window.location.pathname !== '/reminders') {
        window.location.href = '/reminders';
      }
    };

    // 自动关闭（30秒后）
    setTimeout(() => {
      notification.close();
    }, 30000);
  }

  // 播放声音
  private playSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  }

  // 语音播报（覆盖四类提醒）
  private speakReminder(reminder: ReminderData | any) {
    const content = reminder.message || reminder.content || reminder.title || '';
    const details = reminder.details || {};

    let speechText = `Just a gentle reminder: ${content}`;

    switch (reminder.type) {
      case 'medication': {
        const name = details.medicationName || details.name || '';
        const dosage = details.dosage || '';
        speechText = `When you have a moment, please take ${name}. ${dosage ? `Dosage: ${dosage}.` : ''}`.trim();
        break;
      }
      case 'exercise': {
        const type = details.exerciseType || 'exercise';
        const duration = details.duration ? `${details.duration} minute` : '';
        speechText = `If it's a good time, let's do ${duration} ${type}. Take it easy and enjoy.`;
        break;
      }
      case 'blood_sugar':
      case 'glucose_check': {
        const mType = (details.measurementType || details.type || 'regular') as string;
        if (mType === 'fasting') {
          speechText = 'When convenient, please check your fasting blood sugar.';
        } else if (mType === 'post_meal' || mType === 'post-meal' || mType === 'after_meal') {
          speechText = 'When convenient, please check your post‑meal blood sugar.';
        } else {
          speechText = 'When you have a moment, please check your blood sugar.';
        }
        break;
      }
      case 'followup': {
        const doctor = details.doctorName ? `Dr. ${details.doctorName}` : 'your doctor';
        const department = details.department || 'review';
        speechText = `It has been a while since your last review. When you can, please contact ${doctor} to arrange a gentle ${department} check‑in.`;
        break;
      }
      default: {
        speechText = `Reminder: ${content}`;
      }
    }

    voiceService.speak(speechText, {
      rate: 0.9,
      pitch: 1.0,
      volume: 1.0
    });
  }

  // 振动
  private vibrate() {
    if ('vibrate' in navigator) {
      // 振动模式：振200ms，停100ms，振200ms
      navigator.vibrate([200, 100, 200]);
    }
  }

  // 触发页面内通知事件
  private emitInAppNotification(reminder: ReminderData | any) {
    // 派发自定义事件，让组件监听并显示弹窗
    const event = new CustomEvent('reminder-notification', {
      detail: reminder
    });
    window.dispatchEvent(event);
  }

  // 注册Service Worker
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  // 停止服务
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.socket) {
      this.socket.off('reminder-triggered');
    }

    // 清理所有延后定时器
    this.snoozeTimers.forEach((id) => window.clearTimeout(id));
    this.snoozeTimers.clear();
  }
}

// 导出单例
export const reminderNotificationService = new ReminderNotificationService();
export default reminderNotificationService;

