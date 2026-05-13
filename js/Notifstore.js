/* ================================================================
   MI MINISTERIO — NotificationManager.js
   Capa híbrida: detecta entorno y usa el adapter correcto
   (Vanilla JS puro — sin import/export)
   ================================================================ */

var notificationManager = (function () {

  /* ── Detectar si estamos en Capacitor nativo (Android/iOS) ── */
  function isCapacitorNative() {
    return (
      typeof window !== 'undefined' &&
      window.Capacitor != null &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform() === true
    );
  }

  /* ── Validar payload antes de programar ── */
  function validatePayload(p) {
    if (!p || typeof p !== 'object') throw new Error('payload debe ser un objeto.');
    if (p.id    == null)             throw new Error('payload.id es requerido.');
    if (!p.title)                    throw new Error('payload.title es requerido.');
    if (!p.body)                     throw new Error('payload.body es requerido.');
    if (!p.fireAt || typeof p.fireAt !== 'number') throw new Error('payload.fireAt debe ser un timestamp en ms.');
    if (p.fireAt <= Date.now())      throw new Error('payload.fireAt debe ser una fecha futura.');
    if (!p.cardId)                   throw new Error('payload.cardId es requerido.');
  }

  /* ── Manager interno ── */
  var _adapter      = null;
  var _ready        = false;
  var _initPromise  = null;

  var manager = {

    /**
     * Inicializa el manager. Llamar UNA VEZ al arrancar la app.
     * Detecta automáticamente si estamos en Android (Capacitor) o Web (SW).
     */
    init: function () {
      if (_initPromise) return _initPromise;

      _initPromise = (async function () {
        if (isCapacitorNative()) {
          console.log('[NotifMgr] → Capacitor Android detectado');
          _adapter = new CapacitorNotificationAdapter();
        } else {
          console.log('[NotifMgr] → Entorno Web detectado');
          _adapter = new WebSWNotificationAdapter();
        }
        await _adapter.init();
        _ready = true;
        console.log('[NotifMgr] Listo. Adapter:', _adapter.name);
      })();

      return _initPromise;
    },

    /**
     * Programa una notificación local.
     *
     * @param {Object} payload
     * @param {number|string} payload.id      – ID único
     * @param {string}        payload.title   – Título
     * @param {string}        payload.body    – Mensaje
     * @param {number}        payload.fireAt  – Timestamp futuro en ms
     * @param {string}        payload.cardId  – ID de tarjeta asociada
     * @param {boolean}       payload.vibrate – (opcional, default true)
     * @param {boolean}       payload.sound   – (opcional, default true)
     */
    scheduleNotification: function (payload) {
      if (!_ready) throw new Error('[NotifMgr] Llama a notificationManager.init() primero.');
      validatePayload(payload);
      return _adapter.scheduleNotification(payload);
    },

    /**
     * Cancela una notificación por su ID.
     * @param {number|string} id
     */
    cancelNotification: function (id) {
      if (!_ready) throw new Error('[NotifMgr] Llama a notificationManager.init() primero.');
      return _adapter.cancelNotification(id);
    },

    /**
     * Cancela TODAS las notificaciones programadas.
     */
    cancelAll: function () {
      if (!_ready) throw new Error('[NotifMgr] Llama a notificationManager.init() primero.');
      return _adapter.cancelAll();
    },

    /**
     * Cancela todas las notificaciones de una tarjeta.
     * @param {string} cardId
     */
    cancelByCard: function (cardId) {
      if (!_ready) throw new Error('[NotifMgr] Llama a notificationManager.init() primero.');
      return _adapter.cancelByCard(cardId);
    },

    /**
     * Devuelve todas las notificaciones pendientes guardadas.
     */
    getPending: function () {
      if (!_ready) throw new Error('[NotifMgr] Llama a notificationManager.init() primero.');
      return _adapter.getPending();
    },

    /** Nombre del adapter activo (para debugging) */
    get adapterName() {
      return _adapter ? _adapter.name : 'none';
    },
  };

  return manager;
})();