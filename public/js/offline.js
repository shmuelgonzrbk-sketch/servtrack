/* ================================================================
   OFFLINE-FIRST — Cola de sync + Cache
================================================================ */
const SYNC_QUEUE_KEY = 'st_sync_queue';
const CACHE_KEY_PREFIX = 'st_cache_';
let _isOnline = navigator.onLine;

// Detectar cambios de conexión
window.addEventListener('online', () => { _isOnline = true; processSyncQueue(); });
window.addEventListener('offline', () => { _isOnline = false; });

// Polling de conexión cada 5s (más confiable que los eventos)
setInterval(async () => {
  try {
    const r = await fetch(API_URL.replace('/api', '/'), { method: 'HEAD', cache: 'no-store' });
    if (!_isOnline && r.ok) { _isOnline = true; processSyncQueue(); }
    else _isOnline = r.ok;
  } catch(e) { _isOnline = false; }
}, 10000);

// ── CACHE ──
function cacheSet(key, data) {
  try { localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ ts: Date.now(), data })); } catch(e) {}
}
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch(e) { return null; }
}

// ── COLA DE SYNC ──
function getQueue() {
  try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); } catch(e) { return []; }
}
function saveQueue(q) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q));
}
function enqueue(op) {
  const q = getQueue();
  q.push({ ...op, id: Date.now(), createdAt: new Date().toISOString() });
  saveQueue(q);
  showOfflineBadge();
}

async function processSyncQueue() {
  const q = getQueue();
  if (!q.length) return;
  console.log('[Offline] Sincronizando ' + q.length + ' operaciones pendientes...');
  const failed = [];
  for (const op of q) {
    try {
      const opts = { method: op.method, headers: headers() };
      if (op.body) opts.body = JSON.stringify(op.body);
      const res = await fetch(op.url, opts);
      if (!res.ok && res.status !== 404) failed.push(op);
    } catch(e) {
      failed.push(op);
      break; // Si falla, parar — seguimos offline
    }
  }
  saveQueue(failed);
  if (!failed.length) {
    hideOfflineBadge();
    toast('Datos sincronizados ✔');
    // Recargar datos frescos
    try { await loadCards(); renderList(); updateStats(); } catch(e) {}
  }
}

function showOfflineBadge() {
  let badge = document.getElementById('offlineBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'offlineBadge';
    badge.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff9800;color:#fff;text-align:center;padding:4px;font-size:11px;font-weight:600;z-index:99999;transition:transform .3s';
    document.body.appendChild(badge);
  }
  const q = getQueue();
  badge.textContent = 'Sin conexion · ' + q.length + ' cambio' + (q.length !== 1 ? 's' : '') + ' pendiente' + (q.length !== 1 ? 's' : '');
  badge.style.transform = 'translateY(0)';
}

function hideOfflineBadge() {
  const badge = document.getElementById('offlineBadge');
  if (badge) { badge.style.transform = 'translateY(-100%)'; setTimeout(() => badge.remove(), 300); }
}

// ── WRAPPER FETCH CON OFFLINE ──
async function offlineFetch(url, opts, cacheKey) {
  const method = (opts.method || 'GET').toUpperCase();

  // GET — intentar fetch, si falla devolver cache
  if (method === 'GET') {
    try {
      const res = await fetch(url, opts);
      if (res.ok) {
        const data = await res.json();
        if (cacheKey) cacheSet(cacheKey, data);
        return data;
      }
      throw new Error('HTTP ' + res.status);
    } catch(e) {
      const cached = cacheKey ? cacheGet(cacheKey) : null;
      if (cached) { console.log('[Offline] Usando cache para ' + cacheKey); return cached; }
      throw e;
    }
  }

  // POST/PUT/DELETE — intentar fetch, si falla encolar
  try {
    const res = await fetch(url, opts);
    if (res.ok) return await res.json();
    throw new Error('HTTP ' + res.status);
  } catch(e) {
    if (!navigator.onLine || e.message === 'Failed to fetch') {
      const body = opts.body ? JSON.parse(opts.body) : null;
      enqueue({ url, method, body });
      return body || { offline: true };
    }
    throw e;
  }
}
