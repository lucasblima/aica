/**
 * Service Worker: Share Target Handler
 *
 * Intercepts POST requests to /share-target from the Web Share Target API.
 * Caches the shared file and redirects to the app for processing.
 *
 * This file is included via importScripts in the main service worker.
 */

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('shared_files');

    if (files.length > 0) {
      const file = files[0];
      try {
        const cache = await caches.open('share-target-cache');

        // Store the file in cache with metadata
        const response = new Response(file, {
          headers: {
            'Content-Type': file.type || 'text/plain',
            'X-Filename': file.name || 'whatsapp-export.txt',
          },
        });

        await cache.put('/share-target-file', response);
      } catch (cacheErr) {
        // CacheStorage may be unavailable (corrupted, quota exceeded, etc.)
        // Fall through to redirect — user can re-upload via the import UI
        console.warn('[SW] CacheStorage unavailable, skipping file cache:', cacheErr.message);
      }
    }

    // Redirect to the share target page
    return Response.redirect('/share-target', 303);
  } catch (err) {
    console.error('[SW] Share target error:', err);
    return Response.redirect('/contacts?tab=import', 303);
  }
}
