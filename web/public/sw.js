/* eslint-disable no-restricted-globals */
/**
 * BazaarX Web Push Service Worker
 *
 * Handles incoming push events from the Web Push protocol (VAPID),
 * displays a notification, and routes the user to the right page on tap.
 *
 * Push payload format (sent by the send-push-notification Edge Function):
 *   {
 *     title: string,
 *     body:  string,
 *     icon?: string,
 *     badge?: string,
 *     data: { type?: 'order' | 'seller_order' | 'chat' | 'return' | 'admin' | string,
 *             orderId?: string, url?: string, ... }
 *   }
 */

// ---- Install / Activate ----------------------------------------------------

self.addEventListener('install', (event) => {
  // Activate this SW as soon as it's installed (skip 'waiting' state)
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // Take control of all open clients without requiring a reload
  event.waitUntil(self.clients.claim());
});

// ---- Push events -----------------------------------------------------------

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    // If sender did not post JSON, fall back to plain text
    payload = { title: 'BazaarX', body: event.data ? event.data.text() : 'New notification' };
  }

  const title = payload.title || 'BazaarX';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/Logo.png',
    badge: payload.badge || '/Logo.png',
    tag: payload.tag || (payload.data && payload.data.type) || 'bazaarx-notif',
    data: payload.data || {},
    requireInteraction: false,
    vibrate: [120, 60, 120],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---- Notification click ----------------------------------------------------

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = resolveTargetUrl(data);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab on the same origin if one is already open
      for (const client of clientList) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        } catch (e) {
          // ignore parse errors
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});

/**
 * Translate a notification's payload `data` into a relative URL.
 */
function resolveTargetUrl(data) {
  if (data && typeof data.url === 'string' && data.url.length > 0) {
    return data.url;
  }
  switch (data && data.type) {
    case 'order':
    case 'order_update':
      return data.orderId ? `/order/${data.orderId}` : '/orders';
    case 'seller_order':
      return data.orderId ? `/seller/order/${data.orderId}` : '/seller/orders';
    case 'chat':
    case 'message':
      return '/messages';
    case 'return':
      return data.returnId ? `/returns/${data.returnId}` : '/returns';
    case 'admin':
      return data.adminUrl || '/admin';
    default:
      return '/notifications';
  }
}
