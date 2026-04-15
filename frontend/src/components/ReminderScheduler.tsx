/**
 * Reminder Scheduler Component
 * Continuously checks for reminder times and triggers notifications
 */

import { useEffect, useState, useRef } from 'react';
import { message, Modal } from 'antd';
import { requestNotificationPermission } from '../utils/notificationUtils';
import { reminderSound } from '../utils/soundManager';
import { enhanceVisualAlert, stopVisualAlert } from '../utils/visualAlertManager';
import { notificationManager } from '../utils/NotificationManager';
import apiClient from '../api/client';
import InAppNotification from './InAppNotification';
import { initSocket, emitReminderTriggered, emitCheckInUpdate } from '../utils/socket';
import { useAuthStore } from '../stores/authStore';

interface Reminder {
  id: string;
  content?: string;
  message?: string;
  title?: string;
  time?: string;
  scheduleTime?: string;
  type?: string;
  priority?: string;
  triggered?: boolean;
}

interface ReminderSchedulerProps {
  onReminderTriggered?: (reminder: Reminder) => void;
}

// Global singleton instance to ensure only one ReminderScheduler is active
let globalNotificationInstance: {
  show: (reminder: Reminder) => void;
  hide: () => void;
  isActive: () => boolean;
} | null = null;

export default function ReminderScheduler({ onReminderTriggered }: ReminderSchedulerProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeNotification, setActiveNotification] = useState<Reminder | null>(null);
  const [isNotificationShowing, setIsNotificationShowing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggeredRemindersRef = useRef<Set<string>>(new Set());
  const completedTodayRef = useRef<Set<string>>(new Set()); // Track reminders completed today to prevent re-triggering daily reminders
  const activeNotificationRef = useRef<Reminder | null>(null); // Ref to track active notification for setTimeout callbacks
  const notificationLock = useRef(false); // Global lock to prevent duplicate notifications
  const snoozeTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Store snooze timers by reminder ID
  const userId = useAuthStore((state) => state.user?.id || state.user?.userId);

  // Register as global singleton instance
  useEffect(() => {
    // Reset completed today set at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      console.log('[ReminderScheduler] Midnight - clearing completed today set');
      completedTodayRef.current.clear();
      
      // Set up daily reset
      setInterval(() => {
        console.log('[ReminderScheduler] Daily reset - clearing completed today set');
        completedTodayRef.current.clear();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
    
    // Only register if no instance exists
    if (!globalNotificationInstance) {
      globalNotificationInstance = {
        show: (reminder: Reminder) => {
          setActiveNotification(reminder);
          setIsNotificationShowing(true);
          activeNotificationRef.current = reminder;
        },
        hide: () => {
          setActiveNotification(null);
          setIsNotificationShowing(false);
          activeNotificationRef.current = null;
          notificationLock.current = false;
        },
        isActive: () => isNotificationShowing,
      };
      console.log('[ReminderScheduler] Registered as global singleton instance');
    } else {
      console.warn('[ReminderScheduler] Another instance already exists, this instance will not be active');
      // This instance should not handle notifications if another exists
      return () => clearTimeout(midnightTimer);
    }

    // Subscribe to notification manager
    const unsubscribe = notificationManager.subscribe((reminder) => {
      if (globalNotificationInstance) {
        if (reminder) {
          globalNotificationInstance.show(reminder);
        } else {
          globalNotificationInstance.hide();
        }
      }
    });

    // Cleanup on unmount
    return () => {
      clearTimeout(midnightTimer);
      unsubscribe();
      if (globalNotificationInstance) {
        globalNotificationInstance = null;
        console.log('[ReminderScheduler] Unregistered global singleton instance');
      }
    };
  }, []);

  useEffect(() => {
    // Only initialize if this is the active singleton instance
    if (!globalNotificationInstance) {
      console.warn('[ReminderScheduler] Not the active singleton instance, skipping initialization');
      return;
    }

    console.log('[ReminderScheduler] Component mounted, initializing...');
    
    // Initialize: request notification permission
    requestNotificationPermission().then((granted) => {
      console.log(`[ReminderScheduler] Notification permission: ${granted ? 'granted' : 'denied'}`);
    });

    // Initialize Socket.IO connection
    initSocket();

    // Listen for Socket.IO reminder events
    const handleSocketReminder = (event: CustomEvent) => {
      const data = event.detail;
      const reminder = data.reminder || data;
      if (reminder && reminder.id && !triggeredRemindersRef.current.has(reminder.id)) {
        // Format reminder for triggerReminder function
        const formattedReminder: Reminder = {
          id: reminder.id,
          content: reminder.content || reminder.message || reminder.title || 'Reminder',
          message: reminder.message || reminder.title || reminder.content,
          title: reminder.title || reminder.message || reminder.content,
          time: reminder.time || reminder.scheduleTime || new Date().toTimeString().slice(0, 5),
          scheduleTime: reminder.scheduleTime || reminder.time,
          type: reminder.type || 'medication',
          priority: reminder.priority || 'medium',
        };
        triggerReminder(formattedReminder);
      }
    };

    // Listen for Socket.IO check-in updates
    const handleSocketCheckIn = () => {
      // Refresh check-ins list
      loadTodayReminders();
    };

    window.addEventListener('socket-reminder-triggered', handleSocketReminder as EventListener);
    window.addEventListener('socket-checkin-update', handleSocketCheckIn);

    // Load all reminders
    loadTodayReminders();

    // Check every 10 seconds for reminders (more frequent for better accuracy)
    intervalRef.current = setInterval(() => {
      checkAndTriggerReminders();
    }, 10000); // 10 seconds

    // Also check immediately on mount
    checkAndTriggerReminders();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('socket-reminder-triggered', handleSocketReminder as EventListener);
      window.removeEventListener('socket-checkin-update', handleSocketCheckIn);
    };
  }, [userId]);

  const loadTodayReminders = async () => {
    try {
      const response = await apiClient.get('/reminders/today');
      // Handle response format: could be { data: [...] } or just [...]
      const remindersList = response?.data || response;
      if (Array.isArray(remindersList)) {
        setReminders(remindersList);
      }
    } catch (error: any) {
      console.error('Failed to load reminders:', error);
    }
  };

  const checkAndTriggerReminders = async () => {
    try {
      // Reload reminders to get latest data
      const response = await apiClient.get('/reminders/today');
      // Handle response format: { data: [...] } or just [...]
      const latestReminders = response?.data || response || [];
      
      if (!Array.isArray(latestReminders)) {
        console.warn('Reminders response is not an array:', latestReminders);
        return;
      }

      setReminders(latestReminders);

      // Check immediately after loading
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      if (latestReminders.length > 0) {
        console.log(`[ReminderScheduler] Checking ${latestReminders.length} reminder(s) at ${currentTimeStr}`);
      }

      latestReminders.forEach((reminder: Reminder) => {
        // Skip completed or dismissed reminders
        if ((reminder as any).status === 'completed' || (reminder as any).status === 'dismissed') {
          return;
        }
        
        // Skip if already completed today (prevents re-triggering daily reminders within the same day)
        if (completedTodayRef.current.has(reminder.id)) {
          console.log(`[ReminderScheduler] Skipping reminder ${reminder.id} - already completed today`);
          return;
        }

        // Check normal time reminders
        const reminderTimeStr = reminder.time || reminder.scheduleTime;
        if (!reminderTimeStr) {
          console.warn(`[ReminderScheduler] Reminder ${reminder.id} has no time set`);
          return;
        }

        const [hours, minutes] = reminderTimeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          console.warn(`[ReminderScheduler] Invalid time format for reminder ${reminder.id}: ${reminderTimeStr}`);
          return;
        }

        const reminderTime = hours * 60 + minutes;

        // Check if it's time (allow 2 minute tolerance for better detection)
        const timeDifference = Math.abs(currentTime - reminderTime);
        
        // Create unique key: reminderId + currentTime to prevent duplicate triggers in same minute
        const reminderKey = `${reminder.id}-${currentTimeStr}`;
        
        // Skip if already triggered for this time slot OR if reminder.id is in triggered set
        if (triggeredRemindersRef.current.has(reminderKey) || triggeredRemindersRef.current.has(reminder.id)) {
          return;
        }

        // Check snoozed reminders - backup check in case setTimeout didn't fire
        // The primary mechanism is the setTimeout in handleSnooze, but this is a backup
        if ((reminder as any).status === 'snoozed' && (reminder as any).snoozedUntil) {
          const snoozeTime = new Date((reminder as any).snoozedUntil);
          if (now >= snoozeTime) {
            console.log(`[ReminderScheduler] Snooze time ended (backup check) for reminder: ${reminder.title || reminder.content}`);
            // Remove from triggered set and release lock
            triggeredRemindersRef.current.delete(reminder.id);
            const currentTimeStr = new Date().toTimeString().slice(0, 5);
            triggeredRemindersRef.current.delete(`${reminder.id}-${currentTimeStr}`);
            notificationLock.current = false;
            
            // Clear snooze status
            setReminders(prev => prev.map(r => {
              if (r.id === reminder.id) {
                return {
                  ...r,
                  status: 'Enabled' as any,
                  isSnoozed: false,
                  snoozeUntil: null
                };
              }
              return r;
            }));
            
            // Trigger the reminder
            triggerReminder({
              ...reminder,
              status: 'enabled' as any,
              triggered: false,
            });
          }
          return;
        }
        
        // Debug logging
        if (timeDifference <= 2) {
          console.log(`[ReminderScheduler] Found reminder "${reminder.title || reminder.content}" at ${reminderTimeStr}, current: ${currentTimeStr}, diff: ${timeDifference} min`);
        }

        // Only trigger if status is 'enabled' or undefined (default enabled)
        const reminderStatus = (reminder as any).status || 'enabled';
        if (timeDifference <= 2 && reminderStatus === 'enabled') {
          console.log(`[ReminderScheduler] TRIGGERING REMINDER: ${reminder.title || reminder.content} (${reminderTimeStr})`);
          // Mark as triggered for this time slot
          triggeredRemindersRef.current.add(reminderKey);
          triggerReminder(reminder);
        }
      });
      
      // Clean up old triggered reminders (older than 5 minutes) to allow re-triggering next cycle
      // Extended cleanup time prevents re-triggering within the 2-minute tolerance window
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const fiveMinutesAgoStr = `${String(fiveMinutesAgo.getHours()).padStart(2, '0')}:${String(fiveMinutesAgo.getMinutes()).padStart(2, '0')}`;
      
      // Clean up old keys (simple cleanup - remove entries for previous minutes)
      const keysToDelete: string[] = [];
      triggeredRemindersRef.current.forEach(key => {
        // Only clean up time-based keys (format: id-HH:MM), not pure ID keys
        if (key.includes('-')) {
          const keyTime = key.split('-').pop();
          if (keyTime && keyTime < fiveMinutesAgoStr) {
            keysToDelete.push(key);
          }
        } else {
          // Pure ID keys (from user actions like complete/dismiss) are also cleaned after 5 minutes
          // This ensures user-dismissed reminders won't re-trigger within 5 minutes
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => triggeredRemindersRef.current.delete(key));
    } catch (error: any) {
      console.error('[ReminderScheduler] Error checking reminders:', error);
    }
  };

  const triggerReminder = async (reminder: Reminder) => {
    console.log(`[ReminderScheduler] triggerReminder called for: ${reminder.title || reminder.content}`);
    
    // Check if this is the active singleton instance
    if (!globalNotificationInstance) {
      console.log('[ReminderScheduler] Not the active singleton instance, skipping');
      return;
    }
    
    // Check lock - if notification is already showing, skip
    if (notificationLock.current || isNotificationShowing) {
      console.log('[ReminderScheduler] Notification lock is active, skipping duplicate');
      return;
    }
    
    // Check if the same reminder is already active
    if (activeNotification && activeNotification.id === reminder.id) {
      console.log('[ReminderScheduler] This reminder is already being displayed');
      return;
    }

    // Don't manually remove DOM nodes - React manages these
    // Instead, rely on CSS and React state to control visibility
    // Just ensure notification manager only shows one at a time
    try {
      // Only close other reminder notifications through state management
      // Don't manually manipulate DOM - React will handle cleanup
      console.log('[ReminderScheduler] Preparing to show notification for reminder:', reminder.id);
    } catch (e) {
      console.warn('[ReminderScheduler] Error preparing notification:', e);
    }
    
    // Set lock to prevent duplicates
    notificationLock.current = true;
    
    // Use notification manager to show notification
    const shown = notificationManager.show(reminder);
    
    if (!shown) {
      // If manager rejected (already showing), release lock
      notificationLock.current = false;
      console.log('[ReminderScheduler] Notification manager rejected, already showing');
      return;
    }

    try {
      // Only use in-app notification (no browser notification to avoid duplicates)
      console.log('[ReminderScheduler] Showing in-app notification...');
      console.log('[ReminderScheduler] Reminder data:', reminder);
      // Ensure we have all required fields for the notification
      const notificationReminder: Reminder = {
        id: reminder.id,
        content: reminder.content || reminder.message || reminder.title || 'Reminder',
        message: reminder.message || reminder.title || reminder.content,
        title: reminder.title || reminder.message || reminder.content || 'Reminder',
        time: reminder.time || reminder.scheduleTime || new Date().toTimeString().slice(0, 5),
        scheduleTime: reminder.scheduleTime || reminder.time,
        type: reminder.type || 'medication',
        priority: reminder.priority || 'medium',
      };
      console.log('[ReminderScheduler] Showing notification:', notificationReminder);

      // Play reminder sound based on priority
      console.log('[ReminderScheduler] Playing reminder sound...');
      const priority = reminder.priority || 'medium';
      reminderSound.playByPriority(priority);

      // Enhance visual alert
      enhanceVisualAlert(reminder.title || reminder.content);

      // If user doesn't respond, play sound again after 30 seconds
      const reminderIdForReplay = reminder.id;
      setTimeout(() => {
        // Check if the same reminder is still active using ref
        if (activeNotificationRef.current && activeNotificationRef.current.id === reminderIdForReplay) {
          console.log('[ReminderScheduler] Reminder still active after 30s, playing sound again...');
          reminderSound.playByPriority(priority);
        }
      }, 30000);

      // 2. Create check-in record automatically
      console.log('[ReminderScheduler] Creating check-in record...');
      const checkInResult = await createCheckIn(reminder);

      // 3. Emit Socket.IO event for real-time updates
      if (userId && checkInResult) {
        console.log('[ReminderScheduler] Emitting Socket.IO events...');
        emitReminderTriggered(userId, reminder);
        emitCheckInUpdate(userId, checkInResult);
      }

      // 4. Notify parent component
      if (onReminderTriggered) {
        onReminderTriggered(reminder);
      }

      // 5. Mark as triggered on backend
      console.log('[ReminderScheduler] Marking reminder as triggered on backend...');
      await markAsTriggered(reminder.id);
      
      console.log(`[ReminderScheduler] ✅ Successfully triggered reminder: ${reminder.title || reminder.content}`);
    } catch (error: any) {
      console.error('[ReminderScheduler] Error triggering reminder:', error);
      // Release lock on error
      notificationLock.current = false;
      notificationManager.hide();
    }
  };

  const createCheckIn = async (reminder: Reminder) => {
    try {
      const checkInData = {
        reminderId: reminder.id,
        triggeredAt: new Date().toISOString(),
        status: 'pending',
        // Include reminder content for check-in record
        content: reminder.content || reminder.message || reminder.title || 'Reminder',
        category: reminder.type || 'medication',
        action: 'triggered',
        scheduledTime: reminder.time || reminder.scheduleTime || new Date().toTimeString().slice(0, 5),
        priority: reminder.priority || 'medium',
      };
      
      const response = await apiClient.post('/check-ins/auto-create', checkInData);
      return response.data?.data || null;
    } catch (error: any) {
      console.error('Failed to create check-in:', error);
      return null;
    }
  };

  const markAsTriggered = async (reminderId: string) => {
    try {
      await apiClient.post('/reminders/trigger', {
        reminderId,
        action: 'triggered',
        triggeredAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to mark reminder as triggered:', error);
    }
  };

  const handleComplete = async (reminder: Reminder) => {
    try {
      console.log('[ReminderScheduler] handleComplete called for:', reminder.id);
      
      reminderSound.stop(); // Stop any playing sounds
      stopVisualAlert(); // Stop visual alerts
      
      // Mark as triggered immediately to prevent duplicate popups
      const currentTimeStr = new Date().toTimeString().slice(0, 5);
      triggeredRemindersRef.current.add(`${reminder.id}-${currentTimeStr}`);
      // Also add the reminder ID to the triggered set
      triggeredRemindersRef.current.add(reminder.id);
      // Mark as completed today (for daily reminders)
      completedTodayRef.current.add(reminder.id);
      console.log('[ReminderScheduler] Marked reminder as completed today:', reminder.id);
      
      await apiClient.post('/reminders/trigger', {
        reminderId: reminder.id,
        action: 'complete',
      });
      message.success('Reminder marked as completed');
      
      // Close notification through manager
      handleCloseNotification();
      await loadTodayReminders();
    } catch (error: any) {
      console.error('Failed to complete reminder:', error);
      message.error('Failed to complete reminder');
    }
  };

  const handleSnooze = async (reminder: Reminder, snoozeMinutes: number = 10) => {
    try {
      reminderSound.stop(); // Stop any playing sounds
      stopVisualAlert(); // Stop visual alerts
      
      const now = new Date();
      const snoozedUntil = new Date(now.getTime() + snoozeMinutes * 60 * 1000);

      // Update backend
      await apiClient.post('/reminders/trigger', {
        reminderId: reminder.id,
        action: 'snooze',
        snoozeMinutes: snoozeMinutes,
      });

      message.info(`Reminder snoozed for ${snoozeMinutes} minutes`);
      
      // Close notification through manager
      handleCloseNotification();

      // Remove from triggered set so it can trigger again after snooze
      // Remove all keys that start with reminder.id
      const keysToDelete: string[] = [];
      triggeredRemindersRef.current.forEach(key => {
        if (key.startsWith(`${reminder.id}-`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => triggeredRemindersRef.current.delete(key));

      // Update local reminders state
      setReminders(prev => prev.map(r => {
        if (r.id === reminder.id) {
          return {
            ...r,
            status: 'Snoozed' as any,
            isSnoozed: true,
            snoozeUntil: snoozedUntil.toISOString(),
            snoozeCount: ((r as any).snoozeCount || 0) + 1,
            nextTriggerTime: snoozedUntil.toLocaleTimeString()
          };
        }
        return r;
      }));

      // Create check-in record
      try {
        await apiClient.post('/check-ins/auto-create', {
          reminderId: reminder.id,
          triggeredAt: now.toISOString(),
          action: 'snooze',
          snoozeMinutes: snoozeMinutes
        });
      } catch (checkInError) {
        console.error('Failed to create snooze check-in:', checkInError);
      }

      // Clear any existing snooze timer for this reminder
      const existingTimer = snoozeTimersRef.current.get(reminder.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        console.log(`[ReminderScheduler] Cleared existing snooze timer for reminder: ${reminder.id}`);
      }

      // Schedule next trigger after snooze period
      const snoozeTimer = setTimeout(() => {
        console.log(`[ReminderScheduler] Snooze period ended for reminder: ${reminder.title || reminder.content} (${reminder.id})`);
        
        // Clear the timer from the map
        snoozeTimersRef.current.delete(reminder.id);
        
        // Clear snooze status in local state
        setReminders(prev => prev.map(r => {
          if (r.id === reminder.id) {
            return {
              ...r,
              status: 'Enabled' as any,
              isSnoozed: false,
              snoozeUntil: null
            };
          }
          return r;
        }));

        // Remove from triggered set to allow re-triggering
        triggeredRemindersRef.current.delete(reminder.id);
        const currentTimeStr = new Date().toTimeString().slice(0, 5);
        triggeredRemindersRef.current.delete(`${reminder.id}-${currentTimeStr}`);

        // Release notification lock
        notificationLock.current = false;

        // Re-trigger the reminder after snooze period
        console.log(`[ReminderScheduler] Re-triggering reminder after snooze: ${reminder.title || reminder.content}`);
        triggerReminder({
          ...reminder,
          time: snoozedUntil.toTimeString().slice(0, 5),
          scheduleTime: snoozedUntil.toTimeString().slice(0, 5),
          status: 'enabled' as any,
          triggered: false,
        });
      }, snoozeMinutes * 60 * 1000);

      // Store the timer so we can clear it if needed
      snoozeTimersRef.current.set(reminder.id, snoozeTimer);
      console.log(`[ReminderScheduler] Scheduled snooze timer for ${snoozeMinutes} minutes (${snoozeMinutes * 60 * 1000}ms) for reminder: ${reminder.id}`);

    } catch (error: any) {
      console.error('[ReminderScheduler] Failed to snooze reminder:', error);
      message.error('Failed to snooze reminder');
    }
  };

  const handleDismiss = (reminder?: Reminder) => {
    console.log('[ReminderScheduler] handleDismiss called');
    
    reminderSound.stop(); // Stop any playing sounds
    stopVisualAlert(); // Stop visual alerts
    
    // If reminder info is available, mark as triggered to prevent duplicates
    if (reminder || activeNotification) {
      const r = reminder || activeNotification;
      if (r) {
        const currentTimeStr = new Date().toTimeString().slice(0, 5);
        triggeredRemindersRef.current.add(`${r.id}-${currentTimeStr}`);
        triggeredRemindersRef.current.add(r.id);
        // Dismiss should not mark as completed - only temporarily closes the notification
        // completedTodayRef.current.add(r.id);
        console.log('[ReminderScheduler] Marked dismissed reminder as triggered:', r.id);
      }
    }
    
    handleCloseNotification();
  };

  // Close notification and release lock
  const handleCloseNotification = () => {
    notificationManager.hide();
    notificationLock.current = false;
  };

  // Debug logging
  useEffect(() => {
    if (activeNotification) {
      console.log('[ReminderScheduler] Active notification state:', activeNotification);
    }
  }, [activeNotification]);

  // Only render one notification component
  return (
    <>
      {isNotificationShowing && activeNotification && (
        <InAppNotification
          reminder={activeNotification}
          onClose={handleCloseNotification}
          onComplete={(reminder) => {
            handleComplete(reminder);
            handleCloseNotification();
          }}
          onSnooze={(reminder, minutes) => {
            handleSnooze(reminder, minutes);
            handleCloseNotification();
          }}
          onDismiss={() => {
            handleDismiss();
            handleCloseNotification();
          }}
        />
      )}
    </>
  );
}

/**
 * Test reminder function - can be called from browser console or button
 */
export function testReminderNow() {
  const testReminder: Reminder = {
    id: 'test-' + Date.now(),
    content: 'This is a test reminder notification',
    time: new Date().toTimeString().slice(0, 5),
    type: 'medication',
    priority: 'high',
  };

  // Use notification manager to trigger test notification
  const shown = notificationManager.show(testReminder);
  if (shown) {
    reminderSound.playByPriority('high');
    enhanceVisualAlert(testReminder.content);
    message.info('Test notification sent!');
  } else {
    message.warning('Notification already showing, cannot show test notification');
  }
}

