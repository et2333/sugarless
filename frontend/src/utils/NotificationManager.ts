/**
 * Global Notification Manager
 * Singleton pattern to ensure only one notification is shown at a time
 */

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

type NotificationListener = (reminder: Reminder | null) => void;

class NotificationManager {
  private currentNotification: Reminder | null = null;
  private isShowing: boolean = false;
  private listeners: NotificationListener[] = [];

  /**
   * Show a notification
   * Returns true if notification was shown, false if one is already showing
   */
  show(reminder: Reminder): boolean {
    // If already showing, ignore new notification
    if (this.isShowing) {
      console.log('[NotificationManager] Notification already showing, ignoring new notification');
      return false;
    }

    // Destroy any existing modals (if Modal is available)
    if (typeof window !== 'undefined' && (window as any).Modal) {
      try {
        (window as any).Modal.destroyAll();
      } catch (e) {
        // Modal might not be available
      }
    }

    this.currentNotification = reminder;
    this.isShowing = true;

    // Notify all listeners
    this.listeners.forEach(listener => listener(reminder));

    return true;
  }

  /**
   * Hide current notification
   */
  hide(): void {
    this.currentNotification = null;
    this.isShowing = false;
    this.listeners.forEach(listener => listener(null));
  }

  /**
   * Subscribe to notification changes
   * Returns unsubscribe function
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    
    // Immediately notify listener of current state if any
    if (this.currentNotification) {
      listener(this.currentNotification);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current notification
   */
  getCurrent(): Reminder | null {
    return this.currentNotification;
  }

  /**
   * Check if notification is currently showing
   */
  isCurrentlyShowing(): boolean {
    return this.isShowing;
  }
}

export const notificationManager = new NotificationManager();

