const cron = require('node-cron');
const pool = require('./db/pool');
const { sendPush } = require('./pushSender');

/* ================================================================
   CRON PRINCIPAL — Corre CADA MINUTO como respaldo real
   Toda la lógica de "cuándo" se calculó de antemano al crear/editar
   la persona o asignación (ver notifHelper.js).
================================================================ */
cron.schedule('*/1 * * * *', async () => { 
  try {
    const pendientes = await pool.query(
      `SELECT id, usuario_id, titulo, cuerpo, referencia_id, referencia_tabla
       FROM notificaciones_programadas
       WHERE enviada = false AND fecha_disparo <= NOW()
       ORDER BY fecha_disparo ASC
       LIMIT 50`
    );

    if (pendientes.rows.length > 0) {
      console.log('[Cron] Avisos pendientes encontrados:', pendientes.rows.length);
    }

    for (const n of pendientes.rows) {
      const cardId = n.referencia_tabla === 'personas' ? n.referencia_id : null;
      
      // Enviamos la notificación push
      await sendPush(n.usuario_id, n.titulo, n.cuerpo, cardId);
      
      // Marcamos como enviada usando la sintaxis correcta de Postgres
      await pool.query('UPDATE notificaciones_programadas SET enviada = true WHERE id = \$1', [n.id]);

      // Reprogramar semanal (Cálculo matemático corregido en ms)
      if (n.referencia_tabla === 'recordatorios_personales') {
        try {
          const rec = await pool.query(
            'SELECT tipo_notificacion, titulo, cuerpo FROM recordatorios_personales WHERE id = \$1',
            [n.referencia_id]
          );
          if (rec.rows[0] && rec.rows[0].tipo_notificacion === 'semanal') {
            const siguienteDisparo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
            await pool.query(
              `INSERT INTO notificaciones_programadas
               (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
               VALUES ($1,'recordatorio_personal','recordatorios_personales',$2,$3,$4,$5)`,
              [n.usuario_id, n.referencia_id, rec.rows[0].titulo, rec.rows[0].cuerpo, siguienteDisparo]
            );
          }
        } catch (e) { console.error('Error reprogramando recordatorio semanal:', e.message); }
      }
    }
  } catch (err) {
    console.error('Error en cron de notificaciones programadas:', err.message);
  }
});

console.log('Cron jobs iniciados');

/* ================================================================
   AUTO-REPROGRAMACION — cada hora revisa visitas vencidas
   Si la fecha/hora ya pasó y el usuario no editó ni completó,
   mueve la visita al mismo día de la siguiente semana.
   Máximo 4 reprogramaciones (4 semanas).
================================================================ */
cron.schedule('0 8 * * *', async () => { 
  try {
    const ahora = new Date();
    
    const vencidas = await pool.query(
      `SELECT p.id, p.usuario_id, p.nombre, p.proxima_visita, p.proxima_visita_hora,
              p.pub, COALESCE(p.auto_reprogramada, 0) as auto_reprogramada
       FROM personas p
       WHERE p.proxima_visita IS NOT NULL
         AND p.proxima_visita_hora IS NOT NULL
         AND COALESCE(p.auto_reprogramada, 0) < 4
         AND (p.proxima_visita + COALESCE(p.proxima_visita_hora, '00:00')::time) < NOW()
       ORDER BY p.proxima_visita ASC
       LIMIT 50`
    );

    if (vencidas.rows.length > 0) {
      console.log('Auto-reprogramacion: ' + vencidas.rows.length + ' visitas vencidas encontradas');
    }

    for (const p of vencidas.rows) {
      const fechaVieja = new Date(p.proxima_visita);
      const nuevaFecha = new Date(fechaVieja.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nuevaFechaStr = nuevaFecha.toISOString().split('T')[0];
      
      await pool.query(
        `UPDATE personas 
         SET proxima_visita = $1, 
             auto_reprogramada = COALESCE(auto_reprogramada, 0) + 1
         WHERE id = $2`,
        [nuevaFechaStr, p.id]
      );

      const { programarAvisosVisita } = require('./notifHelper');
      await programarAvisosVisita({
        usuarioId: p.usuario_id,
        personaId: p.id,
        nombre: p.nombre,
        fecha: nuevaFechaStr,
        hora: p.proxima_visita_hora ? p.proxima_visita_hora.substring(0, 5) : null,
        pub: p.pub
      });

      console.log('Reprogramada: ' + p.nombre + ' -> ' + nuevaFechaStr + ' (semana ' + (p.auto_reprogramada + 1) + '/4)');
    }
  } catch (err) {
    console.error('Error en auto-reprogramacion:', err.message);
  }
});

/* ================================================================
   Recordatorio de fin de mes para precursores — se queda como estaba,
   corre una vez al día y revisa si es el penúltimo día del mes.
================================================================ */
cron.schedule('0 20 * * *', async () => {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

  if (hoy.getDate() !== ultimoDia - 1) return;

  console.log('Recordatorio fin de mes...');
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
        : `¡Meta cumplida! Completaste ${u.total}h este mes.`;

      await sendPush(
        u.usuario_id,
        'Mañana termina el mes',
        msg
      );
    }
  } catch (err) {
    console.error('Error en recordatorio fin de mes:', err.message);
  }
});

/* ================================================================
   REINICIO SEMANAL DE SESIONES — cada domingo a las 2am
   Manda una señal a todas las webs/apps conectadas para que
   recarguen datos frescos y reconecten, sin cerrar sesión real.
   Corre mientras las personas duermen, para no interrumpir a nadie.
================================================================ */
const { getIo } = require('./socketRegistry');

cron.schedule('0 2 * * 0', () => {
  const io = getIo();
  if (io) {
    io.emit('sesion:reiniciar');
    console.log('[Cron] Reinicio semanal de sesiones enviado a todas las webs/apps conectadas');
  } else {
    console.error('[Cron] No se pudo enviar el reinicio semanal: socket no disponible');
  }
});
