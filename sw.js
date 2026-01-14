// ========== CONFIGURAÇÃO DO SERVICE WORKER ==========
const CACHE_NAME = 'diario-bordo-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 📦 Cacheando arquivos do App Shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[SW] ✅ App Shell cacheado com sucesso');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] ❌ Erro ao cachear App Shell:', error);
      })
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', (event) => {
  console.log('[SW] 🚀 Service Worker ativado');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Claiming clients');
        return self.clients.claim();
      })
  );
});

// ========== INTERCEPTAÇÃO DE REQUISIÇÕES ==========
self.addEventListener('fetch', (event) => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições do Chrome extension
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Se encontrou no cache, retornar
        if (cachedResponse) {
          console.log('[SW] 📂 Servindo do cache:', event.request.url);
          return cachedResponse;
        }
        
        // Se não encontrou, buscar na rede
        console.log('[SW] 🌐 Buscando na rede:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar a resposta para cache
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('[SW] 💾 Adicionado ao cache:', event.request.url);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('[SW] ❌ Erro na requisição:', error);
            
            // Se for uma página, retornar a página offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Para outros recursos, retornar resposta vazia ou fallback
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// ========== MENSAGENS ==========
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ========== SINCRONIZAÇÃO EM BACKGROUND ==========
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] 🔄 Sincronizando dados em background');
  }
});