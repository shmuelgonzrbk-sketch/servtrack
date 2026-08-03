const cron = require('node-cron');
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

  // 1. Intentar FCM primero (app Android nativa)
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

  // 2. Web push como fallback (navegador)
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

/* ================================================================
   CRON PRINCIPAL — cada minuto revisa avisos YA PROGRAMADOS
   cuya fecha_disparo ya llegó, y los manda.
   Toda la lógica de "cuándo" se calculó de antemano al crear/editar
   la persona o asignación (ver notifHelper.js), así que aquí no hay
   ninguna comparación de fechas ni ventanas frágiles.
================================================================ */
cron.schedule('* * * * *', async () => {
  try {
    console.log('🔍 Cron corriendo, hora servidor:', new Date().toString());

    const pendientes = await pool.query(
      `SELECT id, usuario_id, titulo, cuerpo, referencia_id, referencia_tabla
       FROM notificaciones_programadas
       WHERE enviada = false AND fecha_disparo <= NOW()
       ORDER BY fecha_disparo ASC
       LIMIT 50`
    );

    console.log('📋 Avisos pendientes encontrados:', pendientes.rows.length);

    for (const n of pendientes.rows) {
      const cardId = n.referencia_tabla === 'personas' ? n.referencia_id : null;
      await sendPush(n.usuario_id, n.titulo, n.cuerpo, cardId);
      await pool.query('UPDATE notificaciones_programadas SET enviada = true WHERE id = $1', [n.id]);
    }

    if (pendientes.rows.length > 0) {
      console.log(`🔔 ${pendientes.rows.length} notificación(es) enviada(s)`);
    }
  } catch (err) {
    console.error('Error en cron de notificaciones programadas:', err.message);
  }
});

console.log('✅ Cron jobs iniciados');

/* ================================================================
   Recordatorio de fin de mes para precursores — se queda como estaba,
   corre una vez al día y revisa si es el penúltimo día del mes.
================================================================ */
cron.schedule('0 20 * * *', async () => {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

  if (hoy.getDate() !== ultimoDia - 1) return;

  console.log('📅 Recordatorio fin de mes...');
  try {
    const usuarios = await pool.query(
        `SELECT pc.usuario_id, COALESCE(SUM(r.horas), 0) as total,
                pc.meta_horas, pc.tipo
        FROM precursorado pc
        LEFT JOIN registros_horas r ON r.usuario_id = pc.usuario_id
            AND r.mes = $1 AND r.año = $2
        WHERE pc.tipo != 'publicador'
        GROUP BY pc.usuario_id, pc.meta_horas, pc.tipo`,
        [hoy.getMonth() + 1, hoy.getFullYear()]
        );

    for (const u of usuarios.rows) {
      const falta = u.meta_horas - u.total;
      const msg = falta > 0
        ? `Te faltan ${falta}h para completar tu meta de ${u.meta_horas}h este mes.`
        : `¡Meta cumplida! Completaste ${u.total}h este mes. 🎉`;

      await sendPush(
        u.usuario_id,
        ' Mañana termina el mes',
        msg
      );
    }
  } catch (err) {
    console.error('Error en recordatorio fin de mes:', err.message);
  }
});