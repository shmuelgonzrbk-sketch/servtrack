const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }
);

pool.connect()
  .then(client => {
    console.log('✅ Conectado a PostgreSQL');
    client.release(); // Importante: devolver el cliente al pool, si no queda huérfano y sin manejo de errores
  })
  .catch(err => console.error('❌ Error de conexión:', err));

// Evita que una desconexión inesperada de la base (ej. Neon cerrando el socket)
// tumbe todo el servidor. Sin este listener, Node trata el error como no manejado y se cae.
pool.on('error', (err) => {
  console.error('⚠️ Error inesperado en el pool de PostgreSQL (no se cayó el servidor):', err.message);
});

module.exports = pool;
