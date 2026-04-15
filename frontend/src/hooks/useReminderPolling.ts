/**
 * Hook for polling reminders (fallback if WebSocket is not available)
 * Checks reminders periodically without WebSocket
 */

import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { sendBrowserNotification, playReminderSound } from '../utils/notificationUtils';

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

interface CheckIn {
  id: string;
  reminderId: string;
  status: string;
  completedAt?: string;
  triggeredAt: string;
}

/**
 * Use polling to check reminders every minute
 * This is a fallback option if WebSocket is not available
 */
export function useReminderPolling() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const lastCheckRef = useRef(new Date());
  const triggeredRemindersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = async () => {
      try {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Get today's reminders
        const remindersResponse = await apiClient.get('/reminders/today');
        const todayReminders = remindersResponse.data?.data || remindersResponse.data || [];
        setReminders(todayReminders);

        // Check if any reminder needs to be triggered
        todayReminders.forEach((reminder: Reminder) => {
          // Skip if already triggered
          if (triggeredRemindersRef.current.has(reminder.id)) {
            return;
          }

          const reminderTime = reminder.time || reminder.scheduleTime;
          if (reminderTime === currentTime && !reminder.triggered) {
            // Trigger reminder
            triggerReminder(reminder);
            triggeredRemindersRef.current.add(reminder.id);
          }
        });

        // Update check-ins list
        try {
          const checkInsResponse = await apiClient.get('/check-ins/today');
          const newCheckIns = checkInsResponse.data?.data || checkInsResponse.data || [];
          setCheckIns(newCheckIns);
        } catch (error) {
          console.error('Failed to load check-ins:', error);
        }

        lastCheckRef.current = now;
      } catch (error) {
        console.error('Error checking reminders:', error);
      }
    };

    // Check immediately
    checkReminders();

    // Check every 30 seconds
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, []);

  const triggerReminder = async (reminder: Reminder) => {
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      sendBrowserNotification({
        id: reminder.id,
        content: reminder.content || reminder.message || reminder.title || 'Reminder',
        title: reminder.title,
        time: reminder.time || reminder.scheduleTime,
      });
    }

    // Play sound
    playReminderSound();

    // Create check-in record automatically
    try {
      await apiClient.post('/check-ins/auto-create', {
        reminderId: reminder.id,
        triggeredAt: new Date().toISOString(),
        status: 'pending',
      });
    } catch (error) {
      console.error('Failed to create check-in:', error);
    }

    // Mark as triggered
    try {
      await apiClient.post('/reminders/trigger', {
        reminderId: reminder.id,
        action: 'triggered',
        triggeredAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to mark reminder as triggered:', error);
    }
  };

  return { reminders, checkIns, lastCheck: lastCheckRef.current };
}

