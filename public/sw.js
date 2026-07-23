/* ================================================================
   MI MINISTERIO — sw.js  (versión actualizada)
   Service Worker: notificaciones aunque Chrome esté cerrado.
   Compatible con WebSWAdapter.js
   ================================================================ */

const SW_VERSION = 'v2';

/* ── INSTALL ── */
self.addEventListener('install', () => {
  self.skipWaiting();
});

/* ── ACTIVATE ── */
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    await self.clients.claim();
    // Reprogramar todas las notifs pendientes tras reinicio del SW
    const pending = await getAllNotifs();
    for (const n of pending) {
      const delay = n.fireAt - Date.now();
      if (delay > 0) {
        _timers[n.id] = setTimeout(() => _fire(n), delay);
      } else {
        await deleteNotif(n.id);
      }
    }
  })());
});

/* ── MENSAJES DESDE LA APP ── */
self.addEventListener('message', e => {
  const { type, payload, id, cardId } = e.data ?? {};

  switch (type) {
    case 'SCHEDULE_NOTIF': scheduleNotification(payload); break;
    case 'CANCEL_NOTIF':   cancelNotification(id);        break;
    case 'CANCEL_CARD':    cancelCard(cardId);             break;
    case 'CANCEL_ALL':     cancelAll();                    break;
  }
});

/* ──────────────────────────────────────────────
   TIMERS EN MEMORIA
   ────────────────────────────────────────────── */

let _timers = {};

async function _fire(payload) {
  const iconMap = {
    tesoros:   '/img/tesoros.png',
    maestros:  '/img/maestros.png',
    cristiana: '/img/cristiana.png',
  };

  const icon = iconMap[payload.seccion] || '/img/icon-192.png';

  const opts = {
    body:    payload.body,
    icon:    icon,
    badge:   '/img/icon-192.png',
    tag:     String(payload.id),
    renotify: true,
    requireInteraction: false,
    data:    { cardId: payload.cardId },
    silent:  !payload.sound,
  };

  if (payload.vibrate) opts.vibrate = [200, 100, 200];

  await self.registration.showNotification(payload.title, opts);
  await deleteNotif(payload.id);
  delete _timers[payload.id];
}

/* ──────────────────────────────────────────────
   OPERACIONES PRINCIPALES
   ────────────────────────────────────────────── */

async function scheduleNotification(payload) {
  const delay = payload.fireAt - Date.now();
  if (delay <= 0) return;

  await saveNotif({ ...payload });
  _timers[payload.id] = setTimeout(() => _fire(payload), delay);
}

async function cancelNotification(id) {
  if (_timers[id]) {
    clearTimeout(_timers[id]);
    delete _timers[id];
  }
  await deleteNotif(id);
}

async function cancelCard(cardId) {
  const all = await getAllNotifs();
  for (const n of all) {
    if (n.cardId === cardId) {
      clearTimeout(_timers[n.id]);
      delete _timers[n.id];
      await deleteNotif(n.id);
    }
  }
}

async function cancelAll() {
  Object.values(_timers).forEach(t => clearTimeout(t));
  _timers = {};
  await clearAllNotifs();
}

/* ──────────────────────────────────────────────
   INDEXEDDB
   ────────────────────────────────────────────── */

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('mm_sw_db', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('notifs')) {
        db.createObjectStore('notifs', { keyPath: 'id' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function saveNotif(notif) {
  const db = await openDB();
  const tx = db.transaction('notifs', 'readwrite');
  tx.objectStore('notifs').put(notif);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

async function deleteNotif(id) {
  const db = await openDB();
  const tx = db.transaction('notifs', 'readwrite');
  tx.objectStore('notifs').delete(id);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

async function getAllNotifs() {
  const db    = await openDB();
  const tx    = db.transaction('notifs', 'readonly');
  const store = tx.objectStore('notifs');
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function clearAllNotifs() {
  const db = await openDB();
  const tx = db.transaction('notifs', 'readwrite');
  tx.objectStore('notifs').clear();
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

/* ──────────────────────────────────────────────
   CLICK EN NOTIFICACIÓN
   ────────────────────────────────────────────── */

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const cardId = e.notification.data?.cardId;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (cardId) client.postMessage({ type: 'OPEN_CARD', cardId });
          return;
        }
      }
      self.clients.openWindow(cardId ? `/?openCard=${cardId}` : '/');
    })
  );
});

/* ──────────────────────────────────────────────
   KEEP ALIVE
   ────────────────────────────────────────────── */

self.addEventListener('periodicsync', e => {
  if (e.tag === 'mm-keepalive') {
    e.waitUntil(_checkPending());
  }
});

async function _checkPending() {
  const pending = await getAllNotifs();
  for (const n of pending) {
    if (!_timers[n.id]) {
      const delay = n.fireAt - Date.now();
      if (delay > 0) {
        _timers[n.id] = setTimeout(() => _fire(n), delay);
      } else {
        await deleteNotif(n.id);
      }
    }
  }
}


self.addEventListener('push', function(e) {
  const data = e.data ? e.data.json() : { title: 'ServTrack', body: 'Nueva notificación' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/img/logotipo.png',
      badge: '/img/logotipo.png',
      vibrate: [200, 100, 200],
    })
  );
});