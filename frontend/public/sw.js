// Service Worker for Background Notifications

self.addEventListener('install', event => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// 监听推送通知
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Reminder';
  const options = {
    body: data.body || data.message || 'You have a reminder',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: data,
    requireInteraction: true,
    actions: [
      {
        action: 'complete',
        title: '✓ Complete'
      },
      {
        action: 'snooze',
        title: '⏰ Snooze 10 min'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'complete') {
    // 标记完成
    if (event.notification.data && event.notification.data.id) {
      fetch(`/api/reminders/${event.notification.data.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skipped: false })
      }).catch(err => console.error('Failed to complete reminder:', err));
    }
  } else if (event.action === 'snooze') {
    // 延迟10分钟 - 可以发送到后端处理
    console.log('Snooze reminder');
  }

  // 打开应用
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// 定期同步检查提醒（Marcus如果支持）
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkAndNotifyReminders());
  }
});

async function checkAndNotifyReminders() {
  try {
    // 这里可以定期检查提醒
    // 实际实现需要与后端API配合
    console.log('Checking reminders in background...');
  } catch (error) {
    console.error('Background reminder check failed:', error);
  }
}
