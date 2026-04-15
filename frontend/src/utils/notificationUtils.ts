/**
 * Browser Notification Utilities
 * Handles notification permissions and sending browser notifications
 */

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission has been denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }

  return false;
}

/**
 * Check if notification permission is granted
 */
export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Send browser notification
 */
export function sendBrowserNotification(
  reminder: {
    id: string;
    content: string;
    title?: string;
    time?: string;
  }
): void {
  if (!hasNotificationPermission()) {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    const notification = new Notification('Diabetes Management Reminder ⏰', {
      body: reminder.content || 'Time to take your medication!',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: reminder.id,
      requireInteraction: true, // Keep notification until user interacts
      actions: [
        { action: 'complete', title: '✅ Complete' },
        { action: 'snooze', title: '⏰ Snooze' },
      ],
      data: {
        reminderId: reminder.id,
        url: '/reminders/checkin',
      },
    });

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      // Navigate to check-in page
      if (window.location.pathname !== '/reminders/checkin') {
        window.location.href = '/reminders/checkin';
      }
      notification.close();
    };

    // Auto-close after 30 seconds
    setTimeout(() => {
      notification.close();
    }, 30000);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

/**
 * Play reminder sound
 * @deprecated Use reminderSound from soundManager instead
 */
export function playReminderSound(): void {
  // Import and use the new sound manager
  import('./soundManager').then(({ reminderSound }) => {
    reminderSound.playByPriority('medium');
  });
}

