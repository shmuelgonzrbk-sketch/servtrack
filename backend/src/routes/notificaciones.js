const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GUARDAR SUSCRIPCIÓN
router.post('/subscribe', auth, async (req, res) => {
  const { subscription } = req.body;
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (usuario_id, subscription)
       VALUES ($1, $2)
       ON CONFLICT (usuario_id) DO UPDATE SET subscription = $2`,
      [req.userId, JSON.stringify(subscription)]
    );
    res.json({ message: 'Suscripción guardada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENVIAR NOTIFICACIÓN (prueba manual)
router.post('/send', auth, async (req, res) => {
  const { title, body } = req.body;
  try {
    const result = await pool.query(
      'SELECT subscription FROM push_subscriptions WHERE usuario_id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay suscripción' });
    }
    const subscription = JSON.parse(result.rows[0].subscription);
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
    res.json({ message: 'Notificación enviada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar mis notificaciones (solo las ya enviadas), más recientes primero
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo, leida
       FROM notificaciones_programadas
       WHERE usuario_id = $1 AND enviada = true
       ORDER BY fecha_disparo DESC
       LIMIT 100`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cuántas no leídas tengo (para el puntito rojo)
router.get('/no-leidas', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total FROM notificaciones_programadas
       WHERE usuario_id = $1 AND enviada = true AND leida = false`,
      [req.userId]
    );
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar todas como leídas
router.put('/marcar-leidas', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notificaciones_programadas SET leida = true WHERE usuario_id = $1 AND leida = false`,
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Borrar una notificación específica
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM notificaciones_programadas WHERE id = $1 AND usuario_id = $2`,
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Borrar todas mis notificaciones
router.delete('/', auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM notificaciones_programadas WHERE usuario_id = $1 AND enviada = true`,
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
