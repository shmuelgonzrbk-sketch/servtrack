const pool = require('./db/pool');
const webpush = require('web-push');
const { enviarNotificacionFCM } = require('./fcm');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPush(usuarioId, title, body, cardId = null) {
  let enviado = false;

  try {
    const fcmResult = await pool.query(
      'SELECT token FROM fcm_tokens WHERE usuario_id = $1', [usuarioId]
    );
    if (fcmResult.rows.length > 0) {
      const resp = await enviarNotificacionFCM(fcmResult.rows[0].token, title, body, cardId ? { cardId: String(cardId) } : {});
      if (resp.success) {
        enviado = true;
        console.log('FCM enviado a usuario', usuarioId);
      }
    }
  } catch (err) {
    console.error('Error FCM:', err.message);
  }

  if (!enviado) {
    try {
      const result = await pool.query(
        'SELECT subscription FROM push_subscriptions WHERE usuario_id = $1',
        [usuarioId]
      );
      if (result.rows.length > 0) {
        const subscription = JSON.parse(result.rows[0].subscription);
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, cardId }));
        console.log('Web push enviado a usuario', usuarioId);
      }
    } catch (err) {
      console.error('Error web push:', err.message);
    }
  }
}

module.exports = { sendPush };
