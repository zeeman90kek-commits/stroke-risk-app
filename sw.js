// Версия кэша - при изменении этой версии браузер обновит кэш
const CACHE_NAME = 'stroke-risk-app-v3.0';

// Файлы для кэширования при установке
const STATIC_CACHE_URLS = [
  '/stroke-risk-app/',
  '/stroke-risk-app/index.html',
  '/stroke-risk-app/manifest.json',
  '/stroke-risk-app/icon-192.png',
  '/stroke-risk-app/icon-512.png',
  '/stroke-risk-app/sw.js'
];

// Установка Service Worker и кэширование файлов
self.addEventListener('install', event => {
  console.log('🛠️ Service Worker: Установка и кэширование файлов');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Кэшируем файлы для оффлайн-работы');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Активируем Service Worker сразу после установки
        return self.skipWaiting();
      })
  );
});

// Активация - очистка старых кэшей
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Активация');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Берём под контроль все открытые страницы
      return self.clients.claim();
    })
  );
});

// Перехват сетевых запросов
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы и запросы к другим источникам
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Если файл есть в кэше - возвращаем его
        if (response) {
          console.log('📂 Из кэша:', event.request.url);
          return response;
        }

        // Если нет в кэше - загружаем из сети
        console.log('🌐 Загружаем из сети:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Кэшируем только успешные ответы и только наши ресурсы
            if (networkResponse.ok && 
                event.request.url.startsWith(self.location.origin)) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            // Если сеть недоступна и это HTML-запрос - возвращаем главную страницу
            if (event.request.destination === 'document') {
              return caches.match('/stroke-risk-app/index.html');
            }
            throw error;
          });
      })
  );
});
