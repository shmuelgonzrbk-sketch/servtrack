/* ================================================================
   MI MINISTERIO — WebSWAdapter.js
   Adapter para Web usando Service Worker (Vanilla JS puro)
   ================================================================ */

var WebSWNotificationAdapter = (function () {

  function WebSWNotificationAdapter() {
    this.name      = 'WebSWAdapter';
    this._store    = new NotifStore('sw_notifs');
    this._swReady  = false;
  }

  WebSWNotificationAdapter.prototype.init = async function () {
    await this._store.init();
    await this._requestPermissions();
    await this._registerSW();
    this._listenMessages();
  };

  WebSWNotificationAdapter.prototype._requestPermissions = async function () {
    if (!('Notification' in window)) {
      console.warn('[WebSWAdapter] Notificaciones no soportadas.');
      return;
    }
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') {
      console.warn('[WebSWAdapter] Notificaciones bloqueadas.');
      return;
    }
    var result = await Notification.requestPermission();
    if (result !== 'granted') {
      console.warn('[WebSWAdapter] Permiso denegado:', result);
    }
  };

  WebSWNotificationAdapter.prototype._registerSW = async function () {
    if (!('serviceWorker' in navigator)) {
      console.warn('[WebSWAdapter] Service Worker no soportado.');
      return;
    }
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      this._swReady = true;
      console.log('[WebSWAdapter] Service Worker listo.');
    } catch (err) {
      console.error('[WebSWAdapter] Error registrando SW:', err);
    }
  };

  WebSWNotificationAdapter.prototype._listenMessages = function () {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'OPEN_CARD') {
        window.dispatchEvent(
          new CustomEvent('mm:notification-tapped', { detail: { cardId: e.data.cardId } })
        );
      }
    });
  };

  WebSWNotificationAdapter.prototype._postToSW = async function (message) {
    if (!this._swReady) return;
    var reg = await navigator.serviceWorker.ready;
    if (reg.active) reg.active.postMessage(message);
  };

  WebSWNotificationAdapter.prototype.scheduleNotification = async function (payload) {
    if (Notification.permission !== 'granted') {
      console.warn('[WebSWAdapter] Sin permisos.');
      return;
    }
    await this._postToSW({
      type:    'SCHEDULE_NOTIF',
      payload: {
        id:      payload.id,
        title:   payload.title,
        body:    payload.body,
        fireAt:  payload.fireAt,
        cardId:  payload.cardId,
        vibrate: payload.vibrate !== false,
        sound:   payload.sound   !== false,
      },
    });
    await this._store.save(Object.assign({}, payload));
  };

  WebSWNotificationAdapter.prototype.cancelNotification = async function (id) {
    await this._postToSW({ type: 'CANCEL_NOTIF', id: id });
    await this._store.delete(String(id));
  };

  WebSWNotificationAdapter.prototype.cancelAll = async function () {
    await this._postToSW({ type: 'CANCEL_ALL' });
    await this._store.clear();
  };

  WebSWNotificationAdapter.prototype.cancelByCard = async function (cardId) {
    var all     = await this._store.getAll();
    var targets = all.filter(function (n) { return n.cardId === cardId; });
    for (var i = 0; i < targets.length; i++) {
      await this._postToSW({ type: 'CANCEL_NOTIF', id: targets[i].id });
      await this._store.delete(String(targets[i].id));
    }
    await this._postToSW({ type: 'CANCEL_CARD', cardId: cardId });
  };

  WebSWNotificationAdapter.prototype.getPending = function () {
    return this._store.getAll();
  };

  return WebSWNotificationAdapter;
})();