const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Resources to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/logo.png',
  '/manifest.webmanifest'
];

// API routes to cache with network-first strategy
const API_ROUTES_TO_CACHE = [
  '/api/reports',
  '/api/dashboards',
  '/api/master-data',
  '/api/admin/sync-reports'
];

// Static assets to cache with cache-first strategy
const STATIC_ASSETS = [
  '/_next/static/',
  '/fonts/',
  '/icons/'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE];
        const invalidCaches = keys.filter((key) => !validCaches.includes(key));
        
        console.log('[SW] Deleting old caches:', invalidCaches);
        return Promise.all(invalidCaches.map((key) => caches.delete(key)));
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activate failed:', error);
      })
  );
});

// Fetch event - handle different request types
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Skip non-GET requests (handled by background sync)
  if (req.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine caching strategy based on request type
  const strategy = getCacheStrategy(req, url);
  
  event.respondWith(handleRequest(req, strategy));
});

// Determine caching strategy
function getCacheStrategy(request, url) {
  const reqType = request.destination;
  const pathname = url.pathname;
  
  // Navigation requests - network first
  if (request.mode === 'navigate') {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // API requests - network first with cache fallback
  if (pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Static assets - cache first
  if (STATIC_ASSETS.some(asset => pathname.startsWith(asset))) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Images - stale while revalidate
  if (reqType === 'image' || pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Fonts - cache first
  if (reqType === 'font' || pathname.match(/\.(woff|woff2|ttf|otf)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Scripts and styles - stale while revalidate
  if (reqType === 'script' || reqType === 'style') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Default - network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

// Handle request based on strategy
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request);
    
    default:
      return networkFirst(request);
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return caches.match('/offline');
  }
}

// Network-first strategy
async function networkFirst(request) {
  const cacheName = request.url.startsWith('/api/') ? API_CACHE : DYNAMIC_CACHE;
  
  try {
    console.log('[SW] Network first, trying fetch:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      console.log('[SW] Cached response for:', request.url);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cached = await caches.match(request);
    
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    // Return error for other requests
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  
  // Fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch((error) => {
    console.error('[SW] Background fetch failed:', error);
  });
  
  // Return cached version immediately if available
  if (cached) {
    console.log('[SW] Serving stale:', request.url);
    return cached;
  }
  
  // Otherwise wait for network
  console.log('[SW] No cache, waiting for network:', request.url);
  return fetchPromise;
}

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
  
  if (event.tag === 'sync-uploads') {
    event.waitUntil(syncUploads());
  }
});

// Sync reports when back online
async function syncReports() {
  try {
    console.log('[SW] Syncing offline reports...');
    
    // Get pending reports from IndexedDB
    const pendingReports = await getPendingData('pending-reports');
    
    for (const report of pendingReports) {
      try {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report.data)
        });
        
        if (response.ok) {
          await removePendingData('pending-reports', report.id);
          console.log('[SW] Synced report:', report.id);
          
          // Notify user
          await notifySync('Laporan berhasil disinkronkan', report.data.title);
        }
      } catch (error) {
        console.error('[SW] Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync reports failed:', error);
  }
}

// Sync uploads when back online
async function syncUploads() {
  try {
    console.log('[SW] Syncing offline uploads...');
    
    const pendingUploads = await getPendingData('pending-uploads');
    
    for (const upload of pendingUploads) {
      try {
        const formData = new FormData();
        formData.append('file', upload.file);
        
        const response = await fetch('/api/uploads/batch', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          await removePendingData('pending-uploads', upload.id);
          console.log('[SW] Synced upload:', upload.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync upload:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync uploads failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Lihat Detail' },
      { action: 'close', title: 'Tutup' }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body;
    options.tag = data.tag || 'general';
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Message handling
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
    );
  }
});

// IndexedDB helpers for offline data
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gapura-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-reports')) {
        db.createObjectStore('pending-reports', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pending-uploads')) {
        db.createObjectStore('pending-uploads', { keyPath: 'id' });
      }
    };
  });
}

async function getPendingData(storeName) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removePendingData(storeName, id) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function notifySync(title, body) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      title,
      body
    });
  });
}

console.log('[SW] Service worker loaded');
