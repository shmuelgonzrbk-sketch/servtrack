// Registro simple para compartir la instancia de socket.io entre index.js y otros
// módulos (como cron.js) que no tienen acceso directo a ella.
let _io = null;

module.exports = {
  setIo: (io) => { _io = io; },
  getIo: () => _io
};
