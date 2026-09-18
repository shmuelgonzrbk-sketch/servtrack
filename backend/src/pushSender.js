const pool = require('./db/pool');
const webpush = require('web-push');
const { enviarNotificacionFCM } = require('./fcm');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPush(usuarioId, title, body, cardId = null) {
  // Antes: si FCM "tenía éxito" (Firebase acepta el envío aunque el token esté
  // desactualizado y el celular ya no tenga la app), nunca se intentaba el web push,
  // y la notificación se perdía sin avisar en el navegador. Ahora se manda por
  // AMBOS canales de forma independiente, si el usuario tiene registrado cada uno.
  try {
    const fcmResult = await pool.query(
      'SELECT token FROM fcm_tokens WHERE usuario_id = $1', [usuarioId]
    );
    if (fcmResult.rows.length > 0) {
      const resp = await enviarNotificacionFCM(fcmResult.rows[0].token, title, body, cardId ? { cardId: String(cardId) } : {});
      if (resp.success) {
        console.log('FCM enviado a usuario', usuarioId);
      } else {
        console.error('FCM no entregado a usuario', usuarioId, '-', resp.error);
      }
    }
  } catch (err) {
    console.error('Error FCM:', err.message);
  }

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

module.exports = { sendPush };
