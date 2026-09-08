// =============================================
// SERVICE WORKER – RentSpace PWA
// =============================================

const CACHE_NAME = 'rentspace-v2';
const BASE_PATH = '/rentspace-markeplace';

// ─── Core assets to cache ──────────────────────────────────────
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
  `${BASE_PATH}/images/placeholder.jpg`,
  `${BASE_PATH}/images/favicon.webp`,
  // ─── Add other common assets as needed ──────────────────
  // e.g., fonts, icons, etc.
];

// ─── Install event – cache assets ────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching assets for RentSpace PWA');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('❌ Cache addAll failed:', err);
      })
  );
});

// ─── Activate event – clean old caches ──────────────────────
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ─── Fetch event – serve from cache, fallback to network ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ─── Skip API calls and cross-origin requests ──────────────
  if (
    url.pathname.startsWith('/api/') ||           // Backend API
    url.pathname.startsWith('/socket.io/') ||     // WebSockets
    url.origin !== location.origin                // External resources
  ) {
    // For APIs, just fetch directly – no caching
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // ─── Cache hit – return cached asset ────────────────
        if (cachedResponse) {
          return cachedResponse;
        }

        // ─── Cache miss – fetch from network ──────────────────
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if we got a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response and cache it for future use
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.warn('⚠️ Fetch failed:', error);
            // You could optionally serve a custom offline page here
          });
      })
  );
});