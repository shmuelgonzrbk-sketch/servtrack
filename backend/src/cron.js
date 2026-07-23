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

// Arma el cuerpo del mensaje con o sin publicación/tema pendiente
function armarCuerpoVisita(nombre, hora, pub) {
  let cuerpo = `Tienes visita con ${nombre} a las ${hora}`;
  if (pub && pub.trim()) {
    cuerpo += `. 📌 TEMA PENDIENTE: ${pub.trim().toUpperCase()}`;
  }
  return cuerpo;
}

// Cada hora revisa visitas y asignaciones de MAÑANA
cron.schedule('0 * * * *', async () => {
  console.log('🔔 Revisando visitas próximas...');
  try {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];

    // Visitas de mañana (incluye pub como tema pendiente)
    const visitasManana = await pool.query(
      `SELECT p.usuario_id, p.nombre, p.pub, p.proxima_visita_hora
       FROM personas p
       WHERE p.estado != 'visitado'
       AND p.proxima_visita = $1`,
      [fechaManana]
    );

    for (const v of visitasManana.rows) {
      const horaTxt = v.proxima_visita_hora ? v.proxima_visita_hora.substring(0,5) : '';
      const cuerpo = horaTxt
        ? armarCuerpoVisita(v.nombre, horaTxt, v.pub)
        : `Tienes visita con ${v.nombre} mañana` + (v.pub ? `. 📌 TEMA PENDIENTE: ${v.pub.trim().toUpperCase()}` : '');
      await sendPush(v.usuario_id, '📍 Visita mañana', cuerpo);
    }

    // Asignaciones de mañana
    const asignacionesManana = await pool.query(
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

    for (const a of asignacionesManana.rows) {
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

// Cada 5 minutos revisa visitas/estudios de HOY que están por comenzar (1h y 30min antes)
cron.schedule('*/5 * * * *', async () => {
  try {
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0];

    const visitasHoy = await pool.query(
      `SELECT id, usuario_id, nombre, pub, proxima_visita_hora, notif_1h_enviada, notif_30m_enviada
       FROM personas
       WHERE proxima_visita = $1
       AND proxima_visita_hora IS NOT NULL
       AND estado != 'visitado'`,
      [hoy]
    );

    for (const p of visitasHoy.rows) {
      const horaTxt = p.proxima_visita_hora.substring(0,5);
      const [h, m] = horaTxt.split(':').map(Number);
      const horaVisita = new Date(ahora);
      horaVisita.setHours(h, m, 0, 0);

      const minutosFaltan = (horaVisita - ahora) / 60000;
      const cuerpo = armarCuerpoVisita(p.nombre, horaTxt, p.pub);

      // Aviso de 1 hora antes (ventana de 55-65 min para no perderlo con el intervalo de 5 min)
      if (!p.notif_1h_enviada && minutosFaltan <= 65 && minutosFaltan >= 55) {
        await sendPush(p.usuario_id, '⏰ Visita en 1 hora', cuerpo);
        await pool.query('UPDATE personas SET notif_1h_enviada = true WHERE id = $1', [p.id]);
      }

      // Aviso de 30 min antes (ventana de 25-35 min)
      if (!p.notif_30m_enviada && minutosFaltan <= 35 && minutosFaltan >= 25) {
        await sendPush(p.usuario_id, '⏰ Visita en 30 minutos', cuerpo);
        await pool.query('UPDATE personas SET notif_30m_enviada = true WHERE id = $1', [p.id]);
      }
    }
  } catch (err) {
    console.error('Error en cron de recordatorio horario:', err.message);
  }
});

const seccionNombreGlobal = {
  discurso10: 'Discurso de 10 min',
  perlas: 'Busquemos perlas escondidas',
  lectura: 'Lectura de la Biblia',
  conversacion: 'Empiece conversaciones',
  revisitas: 'Haga revisitas',
  discipulos: 'Haga discípulos',
  discurso: 'Explique sus creencias'
};

const MENSAJES_ASIG = {
  7: { titulo: '📖 Te queda 1 semana', cuerpo: (n) => `Tu parte "${n}" es en 7 días — ¡empieza a prepararte!` },
  5: { titulo: '📚 Sigue preparándote', cuerpo: (n) => `Quedan 5 días para tu parte "${n}". ¿Cómo va tu preparación?` },
  3: { titulo: '✍️ Ya casi es tu turno', cuerpo: (n) => `Faltan 3 días para "${n}". Buen momento para repasar y practicar.` },
  1: { titulo: '💪 ¡Mañana es tu parte!', cuerpo: (n) => `Tu parte "${n}" es mañana. Confía en tu preparación — ¡tú puedes!` },
};

// Cada día a las 8am revisa asignaciones en día 7, 5, 3 y 1 antes de la reunión
cron.schedule('0 8 * * *', async () => {
  console.log('📅 Revisando asignaciones (días 7, 5, 3, 1)...');
  try {
    for (const dias of [7, 5, 3, 1]) {
      const fechaObjetivo = new Date();
      fechaObjetivo.setDate(fechaObjetivo.getDate() + dias);
      const fechaStr = fechaObjetivo.toISOString().split('T')[0];
      const columnaFlag = `notif_dia${dias}`;

      const asignaciones = await pool.query(
        `SELECT id, usuario_id, seccion, titulo, fecha_reunion
         FROM asignaciones
         WHERE estado = 'Pendiente' AND fecha_reunion = $1 AND ${columnaFlag} = false`,
        [fechaStr]
      );

      for (const a of asignaciones.rows) {
        const nombre = seccionNombreGlobal[a.seccion] || a.seccion;
        const msg = MENSAJES_ASIG[dias];
        await sendPush(a.usuario_id, msg.titulo, msg.cuerpo(nombre));
        await pool.query(`UPDATE asignaciones SET ${columnaFlag} = true WHERE id = $1`, [a.id]);
      }
    }
  } catch (err) {
    console.error('Error en cron de asignaciones:', err.message);
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