/* ================================================================
   MI MINISTERIO — NotifStore.js
   Mini store IndexedDB para persistir notificaciones pendientes
   (Vanilla JS puro — sin import/export)
================================================================ */

var NotifStore = (function () {

  function NotifStore(storeName) {
    this.storeName = storeName || 'notifs';
    this._db = null;
  }

  NotifStore.prototype.init = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('mm_notifstore_' + self.storeName, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(self.storeName)) {
          db.createObjectStore(self.storeName, { keyPath: 'id' });
        }
      };
      req.onsuccess = function (e) { self._db = e.target.result; resolve(); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  };

  NotifStore.prototype.save = function (item) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx    = self._db.transaction(self.storeName, 'readwrite');
      var store = tx.objectStore(self.storeName);
      store.put(item);
      tx.oncomplete = resolve;
      tx.onerror    = function (e) { reject(e.target.error); };
    });
  };

  NotifStore.prototype.delete = function (id) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx    = self._db.transaction(self.storeName, 'readwrite');
      var store = tx.objectStore(self.storeName);
      store.delete(id);
      tx.oncomplete = resolve;
      tx.onerror    = function (e) { reject(e.target.error); };
    });
  };

  NotifStore.prototype.getAll = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx    = self._db.transaction(self.storeName, 'readonly');
      var store = tx.objectStore(self.storeName);
      var req   = store.getAll();
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  };

  NotifStore.prototype.clear = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx    = self._db.transaction(self.storeName, 'readwrite');
      var store = tx.objectStore(self.storeName);
      store.clear();
      tx.oncomplete = resolve;
      tx.onerror    = function (e) { reject(e.target.error); };
    });
  };

  return NotifStore;
})();
