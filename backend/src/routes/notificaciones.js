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

// ENVIAR NOTIFICACIÓN
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

module.exports = router;