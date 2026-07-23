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

app.get('/control/panel/:key/api/usuarios', adminAuth, async (req, res) => { 
  const r = await pool.query(`
    SELECT u.id, u.nombre, u.email,
           COUNT(p.id) as personas,
           u.fecha_registro,
           u.ultimo_acceso
    FROM usuarios u
    LEFT JOIN personas p ON p.usuario_id = u.id
    GROUP BY u.id
    ORDER BY u.id DESC
  `); 
  res.json(r.rows); 
});

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


app.post('/control/panel/:key/api/notificar/:userId', adminAuth, async (req, res) => {
  const { titulo, cuerpo } = req.body;
  const { userId } = req.params;
  const sub = await pool.query('SELECT subscription FROM push_subscriptions WHERE usuario_id = $1', [userId]);
  if (!sub.rows.length) return res.json({ enviados: 0 });
  try {
    await webpush.sendNotification(JSON.parse(sub.rows[0].subscription), JSON.stringify({ title: titulo, body: cuerpo }));
    res.json({ enviados: 1 });
  } catch(e) {
    res.json({ enviados: 0, error: e.message });
  }
});

// ── API ROUTES ──
app.use('/api/auth', authRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/precursorado', precursoradoRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/informes', informesRoutes);
app.use('/api/experiencias', experienciasRoutes);
app.use('/api/ajustes', ajustesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

app.get('/', (req, res) => res.json({ message: 'ServTrack API ✅' }));

require('./cron');
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
