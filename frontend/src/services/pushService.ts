/**
 * 前端Web Push服务
 */

// VAPID公钥配置 - 从后端获取
let VAPID_PUBLIC_KEY = 'BFXZISsQazTr1RHaL4eg9mKewbmnqSWURU2A2YjJlVeg0m2EsBxYzGyHCD23vMl1OqGUFfpaC_Y4CeK0xl8-JuE';

// 将VAPID key转换为Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class WebPushService {
  private vapidPublicKey: Uint8Array | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private vapidKeyPromise: Promise<string> | null = null;

  constructor() {
    // VAPID key will be loaded from backend
  }

  /**
   * 从后端获取VAPID公钥
   */
  private async getVapidKey(): Promise<string> {
    if (!this.vapidKeyPromise) {
      this.vapidKeyPromise = fetch('/api/notifications/push/vapid-key', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(response => response.json())
        .then(data => data.data.publicKey)
        .catch(error => {
          console.warn('Failed to fetch VAPID key from backend, using fallback:', error);
          return VAPID_PUBLIC_KEY; // 使用fallback
        });
    }
    return this.vapidKeyPromise;
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('此浏览器不支持通知');
    }

    return await Notification.requestPermission();
  }

  /**
   * 检查是否支持推送通知
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * 获取权限状态
   */
  getPermissionState(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * 注册Service Worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('此浏览器不支持Service Worker');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * 订阅推送通知
   */
  async subscribeToPush(): Promise<PushSubscriptionInfo> {
    if (!this.isSupported()) {
      throw new Error('此浏览器不支持推送通知');
    }

    // 注册Service Worker
    if (!this.registration) {
      this.registration = await this.registerServiceWorker();
    }

    // 检查权限
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('通知权限被拒绝');
    }

    try {
      // 获取VAPID密钥
      const vapidKeyString = await this.getVapidKey();
      this.vapidPublicKey = urlBase64ToUint8Array(vapidKeyString);

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.vapidPublicKey,
      });

      // 转换为我们需要的格式
      const subscriptionInfo: PushSubscriptionInfo = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      console.log('Push subscription created:', subscriptionInfo);
      return subscriptionInfo;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      throw error;
    }
  }

  /**
   * 取消推送订阅
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push subscription removed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error);
      return false;
    }
  }

  /**
   * 获取当前订阅
   */
  async getCurrentSubscription(): Promise<PushSubscriptionInfo | null> {
    if (!this.registration) {
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        return {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get current subscription:', error);
      return null;
    }
  }

  /**
   * 将ArrayBuffer转换为Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * 显示本地通知（用于测试）
   */
  showLocalNotification(title: string, options?: NotificationOptions): void {
    if (this.getPermissionState() === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        requireInteraction: false,
        ...options,
      });
    }
  }
}

export const pushService = new WebPushService();
export default pushService;
