/* ================================================================
   MI MINISTERIO — CapacitorAdapter.js
   Adapter para @capacitor/local-notifications (Vanilla JS puro)
   ================================================================ */

var CapacitorNotificationAdapter = (function () {

  function CapacitorNotificationAdapter() {
    this.name   = 'CapacitorAdapter';
    this._store = new NotifStore('cap_notifs');
  }

  CapacitorNotificationAdapter.prototype.init = async function () {
    await this._store.init();
    await this._requestPermissions();
    this._registerListeners();
  };

  CapacitorNotificationAdapter.prototype._requestPermissions = async function () {
    var LN      = Capacitor.Plugins.LocalNotifications;
    var current = await LN.checkPermissions();
    if (current.display === 'granted') return;
    var result = await LN.requestPermissions();
    if (result.display !== 'granted') {
      console.warn('[CapacitorAdapter] Permisos denegados.');
    }
  };

  CapacitorNotificationAdapter.prototype._registerListeners = function () {
    var LN = Capacitor.Plugins.LocalNotifications;

    LN.addListener('localNotificationActionPerformed', function (action) {
      var cardId = action.notification && action.notification.extra
        ? action.notification.extra.cardId
        : null;
      window.dispatchEvent(
        new CustomEvent('mm:notification-tapped', { detail: { cardId: cardId } })
      );
    });

    LN.addListener('localNotificationReceived', function (notif) {
      window.dispatchEvent(
        new CustomEvent('mm:notification-received', { detail: notif })
      );
    });
  };

  CapacitorNotificationAdapter.prototype.scheduleNotification = async function (payload) {
    var LN        = Capacitor.Plugins.LocalNotifications;
    var numericId = toNumericId(payload.id);

    await LN.schedule({
      notifications: [{
        id:    numericId,
        title: payload.title,
        body:  payload.body,
        schedule: {
          at:             new Date(payload.fireAt),
          allowWhileIdle: true,
        },
        sound:     payload.sound ? 'default' : null,
        smallIcon: 'ic_stat_notification',
        iconColor: '#3B82F6',
        extra: {
          cardId:     payload.cardId,
          originalId: String(payload.id),
        },
        channelId: 'mm_reminders',
      }],
    });

    await this._store.save(Object.assign({}, payload, { _numericId: numericId }));
    console.log('[CapacitorAdapter] Notificación programada:', numericId);
  };

  CapacitorNotificationAdapter.prototype.cancelNotification = async function (id) {
    var LN        = Capacitor.Plugins.LocalNotifications;
    var numericId = toNumericId(id);
    await LN.cancel({ notifications: [{ id: numericId }] });
    await this._store.delete(String(id));
  };

  CapacitorNotificationAdapter.prototype.cancelAll = async function () {
    var LN      = Capacitor.Plugins.LocalNotifications;
    var pending = await this._store.getAll();
    if (pending.length > 0) {
      await LN.cancel({
        notifications: pending.map(function (n) {
          return { id: toNumericId(n.id) };
        }),
      });
    }
    await this._store.clear();
  };

  CapacitorNotificationAdapter.prototype.cancelByCard = async function (cardId) {
    var LN      = Capacitor.Plugins.LocalNotifications;
    var all     = await this._store.getAll();
    var targets = all.filter(function (n) { return n.cardId === cardId; });

    if (targets.length > 0) {
      await LN.cancel({
        notifications: targets.map(function (n) {
          return { id: toNumericId(n.id) };
        }),
      });
      for (var i = 0; i < targets.length; i++) {
        await this._store.delete(String(targets[i].id));
      }
    }
  };

  CapacitorNotificationAdapter.prototype.getPending = function () {
    return this._store.getAll();
  };

  /* ── helper: string/número → Int32 positivo ── */
  function toNumericId(id) {
    if (typeof id === 'number' && Number.isInteger(id)) return Math.abs(id);
    var str  = String(id);
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 2147483647 || 1;
  }

  return CapacitorNotificationAdapter;
})();