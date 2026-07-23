const cron = require('node-cron');
const pool = require('./db/pool');
const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPush(usuarioId, title, body) {
  try {
    const result = await pool.query(
      'SELECT subscription FROM push_subscriptions WHERE usuario_id = $1',
      [usuarioId]
    );
    if (result.rows.length === 0) return;
    const subscription = JSON.parse(result.rows[0].subscription);
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
  } catch (err) {
    console.error('Error enviando push:', err.message);
  }
}

// Cada hora revisa visitas próximas
cron.schedule('0 * * * *', async () => {
  console.log('🔔 Revisando visitas próximas...');
  try {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];
    const hoy = new Date().toISOString().split('T')[0];

    // Visitas de mañana
    const visitasManana = await pool.query(
      `SELECT p.usuario_id, p.nombre, p.estado
       FROM personas p
       WHERE p.estado != 'visitado'
       AND p.proxima_visita = $1`,
      [fechaManana]
    );

    for (const v of visitasManana.rows) {
      await sendPush(
        v.usuario_id,
        '📍 Visita mañana',
        `Tienes visita con ${v.nombre} mañana`
      );
    }

    // Asignaciones próximas
    const asignaciones = await pool.query(
      `SELECT a.usuario_id, a.seccion, a.titulo, a.fecha_reunion
       FROM asignaciones a
       WHERE a.estado = 'Pendiente'
       AND a.fecha_reunion = $1`,
      [fechaManana]
    );

    const seccionNombre = {
      discurso10: 'Discurso de 10 min',
      perlas: 'Busquemos perlas escondidas',
      lectura: 'Lectura de la Biblia',
      conversacion: 'Empiece conversaciones',
      revisitas: 'Haga revisitas',
      discipulos: 'Haga discípulos',
      discurso: 'Explique sus creencias'
    };

    for (const a of asignaciones.rows) {
      const nombre = seccionNombre[a.seccion] || a.seccion;
      await sendPush(
        a.usuario_id,
        'Asignación mañana',
        `Tu parte "${nombre}" es mañana`
      );
    }

  } catch (err) {
    console.error('Error en cron:', err.message);
  }
});

// Cada día a las 8am revisa asignaciones de la semana
cron.schedule('0 8 * * *', async () => {
  console.log('📅 Revisando asignaciones semanales...');
  try {
    const en7dias = new Date();
    en7dias.setDate(en7dias.getDate() + 7);
    const fecha7 = en7dias.toISOString().split('T')[0];

    const asignaciones = await pool.query(
      `SELECT usuario_id, seccion, titulo, fecha_reunion
       FROM asignaciones
       WHERE estado = 'Pendiente' AND fecha_reunion = $1`,
      [fecha7]
    );

    for (const a of asignaciones.rows) {
      await sendPush(
        a.usuario_id,
        '📖 Asignación en 1 semana',
        `Tu parte "${a.seccion}" es en 7 días — ¡empieza a prepararte!`
      );
    }
  } catch (err) {
    console.error('Error en cron semanal:', err.message);
  }
});

console.log('✅ Cron jobs iniciados');


// Cada día a las 8pm verifica si es penúltimo día del mes
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