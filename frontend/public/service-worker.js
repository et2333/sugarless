/**
 * Service Worker for Background Reminder Notifications
 * Handles reminders even when the app is closed
 */

const CACHE_NAME = 'diabetes-app-v1';
const REMINDERS_API = '/api/reminders/today';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Periodic background sync for checking reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    console.log('Service Worker: Periodic sync - checking reminders');
    event.waitUntil(checkAndNotifyReminders());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/reminders/checkin';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification actions
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
});

// Background sync for reminders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reminders') {
    console.log('Service Worker: Background sync - checking reminders');
    event.waitUntil(checkAndNotifyReminders());
  }
});

/**
 * Check reminders and show notifications
 */
async function checkAndNotifyReminders() {
  try {
    // Get auth token from IndexedDB or send message to client
    const reminders = await fetchTodayReminders();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    reminders.forEach((reminder) => {
      if (shouldTrigger(reminder, currentTime)) {
        showNotification(reminder);
      }
    });
  } catch (error) {
    console.error('Service Worker: Error checking reminders:', error);
  }
}

/**
 * Fetch today's reminders
 */
async function fetchTodayReminders() {
  try {
    // Try to get reminders from cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(REMINDERS_API);

    if (cachedResponse) {
      const data = await cachedResponse.json();
      return data || [];
    }

    // If not in cache, fetch from API
    // Note: Service Worker can't access authentication headers directly
    // We'll need to fetch from the client and pass to service worker
    return [];
  } catch (error) {
    console.error('Service Worker: Error fetching reminders:', error);
    return [];
  }
}

/**
 * Check if reminder should trigger
 */
function shouldTrigger(reminder, currentTime) {
  const [hours, minutes] = reminder.time.split(':');
  const reminderTime = parseInt(hours) * 60 + parseInt(minutes);
  const timeDifference = Math.abs(currentTime - reminderTime);

  return timeDifference <= 1 && !reminder.triggered;
}

/**
 * Show notification
 */
function showNotification(reminder) {
  self.registration.showNotification('Diabetes Management Reminder ⏰', {
    body: reminder.content || 'Time to take your medication!',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: reminder.id,
    requireInteraction: true,
    actions: [
      { action: 'complete', title: '✅ Complete' },
      { action: 'snooze', title: '⏰ Snooze 10min' },
    ],
    data: {
      reminderId: reminder.id,
      url: '/reminders/checkin',
    },
    vibrate: [200, 100, 200], // Vibration pattern
  });
}

// Message handler for communication with client
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);

  if (event.data && event.data.type === 'CHECK_REMINDERS') {
    checkAndNotifyReminders();
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

