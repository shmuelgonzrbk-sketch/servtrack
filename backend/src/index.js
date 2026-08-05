const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const personasRoutes = require('./routes/personas');
const precursoradoRoutes = require('./routes/precursorado');
const asignacionesRoutes = require('./routes/asignaciones');
const informesRoutes = require('./routes/informes');
const experienciasRoutes = require('./routes/experiencias');
const ajustesRoutes = require('./routes/ajustes');
const notificacionesRoutes = require('./routes/notificaciones');
const webpush = require('web-push');
const reportesRoutes = require('./routes/reportes');

const app = express();
const PORT = process.env.PORT || 3000;

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Usuarios activos
const usuariosActivos = new Set();

io.on('connection', (socket) => {
  socket.on('user:activo', (userId) => {
    usuariosActivos.add(parseInt(userId));
    io.emit('activos:update', [...usuariosActivos]);
  });
  socket.on('get:activos', () => {
    socket.emit('activos:update', [...usuariosActivos]);
  });
  socket.on('disconnect', () => {});
});

// Cambia app.listen por server.listen:
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

// ── MIDDLEWARES ── (PRIMERO)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── ADMIN ──


app.get('/control/panel/:key/api/usuarios/fotos', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, picture FROM usuarios');
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Endpoint de usuarios movido abajo con datos completos

app.get('/control/panel/st26', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
});

app.get('/control/panel/verify/:key', (req, res) => {
  try {
    const { user, pass } = JSON.parse(Buffer.from(req.params.key, 'base64').toString());
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
      res.json({ ok: true });
    } else {
      res.status(403).json({ error: 'Acceso denegado' });
    }
  } catch(e) {
    res.status(403).json({ error: 'Clave inválida' });
  }
});

function adminAuth(req, res, next) {
  try {
    const { user, pass } = JSON.parse(Buffer.from(req.params.key, 'base64').toString());
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) return next();
  } catch(e) {}
  res.status(403).json({ error: 'Acceso denegado' });
}

app.get('/control/panel/:key/api/usuarios',     adminAuth, async (req, res) => { const r = await pool.query('SELECT id,nombre,email,congregacion,fecha_registro FROM usuarios ORDER BY id DESC'); res.json(r.rows); });
app.get('/control/panel/:key/api/personas',     adminAuth, async (req, res) => { const r = await pool.query('SELECT id,usuario_id,nombre,tipo,estado FROM personas ORDER BY id DESC'); res.json(r.rows); });
app.get('/control/panel/:key/api/informes',     adminAuth, async (req, res) => { const r = await pool.query('SELECT * FROM informes ORDER BY id DESC'); res.json(r.rows); });
app.get('/control/panel/:key/api/asignaciones', adminAuth, async (req, res) => { const r = await pool.query('SELECT * FROM asignaciones ORDER BY id DESC'); res.json(r.rows); });
app.post('/control/panel/:key/api/notificar',   adminAuth, async (req, res) => {
  const { titulo, cuerpo } = req.body;
  const subs = await pool.query('SELECT subscription FROM push_subscriptions');
  let enviados = 0;
  for (const s of subs.rows) {
    try { await webpush.sendNotification(JSON.parse(s.subscription), JSON.stringify({ title: titulo, body: cuerpo })); enviados++; } catch(e) {}
  }
  res.json({ enviados });
});

// Lista de conversaciones (agrupadas por usuario, con último mensaje y no leídos)
// Lista de conversaciones (con categoría del primer mensaje = prioridad/tipo)
app.get('/control/panel/:key/api/reportes', adminAuth, async (req, res) => {
  const r = await pool.query(`
    SELECT u.id as usuario_id, u.nombre, u.email,
           (SELECT mensaje FROM reportes WHERE usuario_id = u.id AND oculto_para_admin = false ORDER BY fecha DESC LIMIT 1) as ultimo_mensaje,
           (SELECT fecha FROM reportes WHERE usuario_id = u.id AND oculto_para_admin = false ORDER BY fecha DESC LIMIT 1) as ultima_fecha,
           (SELECT categoria FROM reportes WHERE usuario_id = u.id AND categoria IS NOT NULL ORDER BY fecha ASC LIMIT 1) as categoria,
           (SELECT COUNT(*) FROM reportes WHERE usuario_id = u.id AND remitente = 'usuario' AND leido = false) as no_leidos
    FROM usuarios u
    WHERE EXISTS (SELECT 1 FROM reportes WHERE usuario_id = u.id AND oculto_para_admin = false)
    ORDER BY ultima_fecha DESC
  `);
  res.json(r.rows);
});

// Conversación completa con un usuario específico

app.get('/control/panel/:key/api/usuarios/fotos', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, picture FROM usuarios');
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/control/panel/:key/api/usuarios', adminAuth, async (req, res) => {
  try {
    const usuarios = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.congregacion, u.picture, u.fecha_registro, u.ultimo_acceso,
              COUNT(DISTINCT p.id) as personas_count,
              COALESCE(SUM(rh.horas), 0) as horas_mes,
              COUNT(DISTINCT a.id) as asignaciones_count,
              ft.id IS NOT NULL as tiene_app,
              ps.id IS NOT NULL as tiene_web
       FROM usuarios u
       LEFT JOIN personas p ON p.usuario_id = u.id
       LEFT JOIN registros_horas rh ON rh.usuario_id = u.id 
            AND rh.mes = EXTRACT(MONTH FROM NOW()) 
            AND rh.anio = EXTRACT(YEAR FROM NOW())
       LEFT JOIN asignaciones a ON a.usuario_id = u.id AND a.estado != 'Completado'
       LEFT JOIN fcm_tokens ft ON ft.usuario_id = u.id
       LEFT JOIN push_subscriptions ps ON ps.usuario_id = u.id
       GROUP BY u.id, ps.id, ft.id
       ORDER BY u.id ASC`
    );

    // Para cada usuario, traer sus personas completas
    const result = await Promise.all(usuarios.rows.map(async (u) => {
      const personas = await pool.query(
        `SELECT id, nombre, direccion, telefono, tipo, estado, notas, proxima_visita, proxima_visita_hora, pub, gps_lat, gps_lng
         FROM personas WHERE usuario_id = $1 ORDER BY nombre ASC`,
        [u.id]
      );
      return { ...u, personas: personas.rows };
    }));

    res.json(result);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/control/panel/:key/api/reportes/:userId', adminAuth, async (req, res) => {
  const r = await pool.query(
    `SELECT id, remitente, mensaje, fecha, editado, categoria FROM reportes
     WHERE usuario_id = $1 AND oculto_para_admin = false ORDER BY fecha ASC`,
    [req.params.userId]
  );
  await pool.query(
    "UPDATE reportes SET leido = true WHERE usuario_id = $1 AND remitente = 'usuario'",
    [req.params.userId]
  );
  res.json(r.rows);
});

// Responder a un usuario (y notificarle por push)
app.post('/control/panel/:key/api/reportes/:userId', adminAuth, async (req, res) => {
  const { mensaje } = req.body;
  const { userId } = req.params;
  try {
    const r = await pool.query(
      `INSERT INTO reportes (usuario_id, remitente, mensaje) VALUES ($1, 'admin', $2) RETURNING *`,
      [userId, mensaje]
    );
    const sub = await pool.query('SELECT subscription FROM push_subscriptions WHERE usuario_id = $1', [userId]);
    if (sub.rows.length) {
      try {
        await webpush.sendNotification(JSON.parse(sub.rows[0].subscription), JSON.stringify({ title: '💬 Respuesta de soporte', body: mensaje }));
      } catch(e) {}
    }
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin edita su propio mensaje
app.put('/control/panel/:key/api/reportes/msg/:id', adminAuth, async (req, res) => {
  const { mensaje } = req.body;
  const r = await pool.query(
    `UPDATE reportes SET mensaje = $1, editado = true WHERE id = $2 AND remitente = 'admin' RETURNING *`,
    [mensaje, req.params.id]
  );
  res.json(r.rows[0] || { error: 'No se pudo editar' });
});

// Admin elimina: ?tipo=mio (oculta solo para admin) o ?tipo=todos (solo si es mensaje propio del admin)
app.delete('/control/panel/:key/api/reportes/msg/:id', adminAuth, async (req, res) => {
  const { tipo } = req.query;
  if (tipo === 'todos') {
    const r = await pool.query(
      `UPDATE reportes SET eliminado_global = true, mensaje = 'Mensaje eliminado'
       WHERE id = $1 AND remitente = 'admin' RETURNING *`,
      [req.params.id]
    );
    return res.json(r.rows[0] || { error: 'No se pudo eliminar' });
  }
  const r = await pool.query(
    `UPDATE reportes SET oculto_para_admin = true WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json(r.rows[0]);
});

app.post('/control/panel/:key/api/notificar/:userId', adminAuth, async (req, res) => {
  const { titulo, cuerpo } = req.body;
  const { userId } = req.params;
  let enviados = 0;

  // 1. FCM primero (app Android)
  try {
    const fcmResult = await pool.query('SELECT token FROM fcm_tokens WHERE usuario_id = $1', [userId]);
    if (fcmResult.rows.length) {
      const { enviarNotificacionFCM } = require('./fcm');
      const resp = await enviarNotificacionFCM(fcmResult.rows[0].token, titulo, cuerpo);
      if (resp.success) enviados = 1;
    }
  } catch(e) { console.error('FCM error:', e.message); }

  // 2. Web push como fallback
  if (!enviados) {
    try {
      const sub = await pool.query('SELECT subscription FROM push_subscriptions WHERE usuario_id = $1', [userId]);
      if (sub.rows.length) {
        await webpush.sendNotification(JSON.parse(sub.rows[0].subscription), JSON.stringify({ title: titulo, body: cuerpo }));
        enviados = 1;
      }
    } catch(e) { console.error('WebPush error:', e.message); }
  }

  res.json({ enviados });
});

// ── API ROUTES ──
// Registrar FCM token
app.post('/api/fcm/token', require('./middleware/auth'), async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });
  try {
    await pool.query(
      'INSERT INTO fcm_tokens (usuario_id, token) VALUES ($1, $2) ON CONFLICT (usuario_id) DO UPDATE SET token = $2, creado_en = NOW()',
      [req.userId, token]
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Enviar notificacion FCM a un usuario
app.post('/api/fcm/notificar/:userId', require('./middleware/auth'), async (req, res) => {
  const { titulo, cuerpo } = req.body;
  const { userId } = req.params;
  try {
    const result = await pool.query('SELECT token FROM fcm_tokens WHERE usuario_id = $1', [userId]);
    if (!result.rows.length) return res.json({ enviado: false, motivo: 'Sin token FCM' });
    const { enviarNotificacionFCM } = require('./fcm');
    const resp = await enviarNotificacionFCM(result.rows[0].token, titulo, cuerpo);
    res.json({ enviado: resp.success });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.use('/api/reportes', reportesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/precursorado', precursoradoRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/informes', informesRoutes);
app.use('/api/experiencias', experienciasRoutes);
app.use('/api/ajustes', ajustesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

app.get('/', (req, res) => res.json({ message: 'AssendApp API ✅' }));

require('./cron');
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
