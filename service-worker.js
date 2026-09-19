// =============================================
// SERVICE WORKER – Kill switch
// =============================================
// This version exists only to unregister itself and clean caches.
// After it runs once, the browser will have no service worker.
// Once you're ready to reintroduce a real SW (post-launch), replace
// this file with the caching version again.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Delete every cache
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🗑️ Cleared caches:', cacheNames);

    // 2. Unregister this service worker
    await self.registration.unregister();
    console.log('✅ Service worker unregistered');

    // 3. Reload all open tabs
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => client.navigate(client.url));
  })());
});