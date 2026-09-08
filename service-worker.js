// =============================================
// SERVICE WORKER – RentSpace PWA (root domain)
// =============================================

const CACHE_NAME = 'rentspace-v3';           // Increment version on updates
const BASE_PATH = '';                        // Root domain

// ─── Core assets to pre-cache ──────────────────────────────────
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/sale.html`,
  `${BASE_PATH}/rentals.html`,
  `${BASE_PATH}/land.html`,
  `${BASE_PATH}/airbnb.html`,
  `${BASE_PATH}/dashboard.html`,
  `${BASE_PATH}/login.html`,
  `${BASE_PATH}/signup.html`,
  `${BASE_PATH}/about.html`,
  `${BASE_PATH}/contact.html`,
  `${BASE_PATH}/blog.html`,
  `${BASE_PATH}/privacy.html`,
  `${BASE_PATH}/terms.html`,
  `${BASE_PATH}/admin.html`,
  `${BASE_PATH}/css/index.css`,
  `${BASE_PATH}/css/styles.css`,
  `${BASE_PATH}/js/index.js`,
  `${BASE_PATH}/js/sale.js`,
  `${BASE_PATH}/js/rentals.js`,
  `${BASE_PATH}/js/land.js`,
  `${BASE_PATH}/js/airbnb.js`,
  `${BASE_PATH}/js/dashboard.js`,
  `${BASE_PATH}/js/properties.js`,
  `${BASE_PATH}/js/airbnb-property.js`,
  `${BASE_PATH}/js/admin.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/images/favicon.webp`,
  `${BASE_PATH}/images/placeholder.jpg`,
  // Add more common assets as needed
];

// ─── Install – cache core assets ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching RentSpace PWA assets');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('❌ Cache addAll failed:', err);
      })
  );
  // Force the waiting service worker to become active
  self.skipWaiting();
});

// ─── Activate – clean old caches ──────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// ─── Fetch – cache-first, then network, with offline fallback ─
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ─── Skip non-GET requests ──────────────────────────────────
  if (event.request.method !== 'GET') return;

  // ─── Skip API calls, socket.io, and external resources ─────
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version, but also update cache in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // ─── Not in cache – fetch from network ──────────────────
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache valid responses for future use
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === 'basic'
            ) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // ─── Offline fallback: serve index.html for navigation ─
            if (event.request.mode === 'navigate') {
              return caches.match(`${BASE_PATH}/index.html`);
            }
            // You could return a custom offline page here
            return new Response('Offline – please check your internet connection.', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});