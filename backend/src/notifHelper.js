const pool = require('./db/pool');

/**
 * Construye un Date a partir de una fecha "YYYY-MM-DD" y hora "HH:MM",
 * interpretados en hora LOCAL del servidor (que debe tener TZ=America/Lima).
 * Evita el bug de .toISOString() que siempre normaliza a UTC.
 */
function construirFechaHora(fechaStr, horaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const [h, min] = (horaStr || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

/**
 * Borra los avisos pendientes (no enviados) de una referencia específica.
 * Se usa antes de reprogramar, para no duplicar si el usuario edita la fecha/hora.
 */
async function limpiarAvisosPendientes(tabla, referenciaId) {
  await pool.query(
    `DELETE FROM notificaciones_programadas
     WHERE referencia_tabla = $1 AND referencia_id = $2 AND enviada = false`,
    [tabla, referenciaId]
  );
}

/**
 * Programa los avisos de una VISITA (persona): 1h antes, 30min antes,
 * y si ya no hay tiempo para esos dos, un aviso "urgente" inmediato.
 */
async function programarAvisosVisita({ usuarioId, personaId, nombre, fecha, hora, pub }) {
  await limpiarAvisosPendientes('personas', personaId);
  if (!fecha || !hora) return;

  const horaVisita = construirFechaHora(fecha, hora);
  const ahora = new Date();

  const temaTxt = pub && pub.trim() ? `. 📌 TEMA PENDIENTE: ${pub.trim().toUpperCase()}` : '';
  const cuerpoBase = `Tienes visita con ${nombre} a las ${hora}${temaTxt}`;

  const avisos = [
    { tipo: 'visita_1h',  minutosAntes: 60, titulo: '⏰ Visita en 1 hora' },
    { tipo: 'visita_30m', minutosAntes: 30, titulo: '⏰ Visita en 30 minutos' },
  ];

  let algunoFuturo = false;

  for (const aviso of avisos) {
    const disparo = new Date(horaVisita.getTime() - aviso.minutosAntes * 60000);
    if (disparo > ahora) {
      algunoFuturo = true;
      await pool.query(
        `INSERT INTO notificaciones_programadas
         (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
         VALUES ($1,$2,'personas',$3,$4,$5,$6)`,
        [usuarioId, aviso.tipo, personaId, aviso.titulo, cuerpoBase, disparo]
      );
    }
  }

  // Si ni el de 1h ni el de 30min caben en el futuro (visita muy próxima o "hoy mismo, ya casi"),
  // programamos un aviso urgente para YA (o para la hora de la visita si aún no llega).
  if (!algunoFuturo && horaVisita > ahora) {
    await pool.query(
      `INSERT INTO notificaciones_programadas
       (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
       VALUES ($1,'visita_urgente','personas',$2,'🚨 ¡Visita muy pronto!',$3,$4)`,
      [usuarioId, personaId, cuerpoBase, ahora]
    );
  }
}

/**
 * Programa los avisos de una ASIGNACIÓN: día 7, 5, 3, 1 antes de la reunión.
 * Si la fecha ya está muy cerca (menos de 1 día), programa solo un aviso motivador inmediato.
 */
async function programarAvisosAsignacion({ usuarioId, asigId, nombreParte, fecha, ayudante, fechaPractica }) {
  await limpiarAvisosPendientes('asignaciones', asigId);
  if (!fecha) return;

  const fechaReunion = construirFechaHora(fecha, '09:00');
  const ahora = new Date();
  const diasHasta = Math.floor((fechaReunion - ahora) / 86400000);
  const semanas = Math.floor(diasHasta / 7);

  const avisos = [];
  const push = (dias, titulo, cuerpo) => {
    const disparo = new Date(fechaReunion.getTime() - dias * 24 * 60 * 60000);
    if (disparo > ahora) avisos.push({ tipo: `asig_dia${dias}`, titulo, cuerpo, disparo });
  };

  if (semanas >= 4) {
    push(28, '🗓️ Nueva asignación', `¿Ya pensaste en el tema de "${nombreParte}"? Tienes tiempo, ¡empieza a planificar!`);
    push(21, '📚 Sigue preparándote', `¿Cómo vas con "${nombreParte}"? Esta semana es buen momento para investigar.`);
    push(14, '✍️ Vas bien', `¿Ya tienes el bosquejo o los puntos principales de "${nombreParte}"?`);
    push(7,  '💪 ¡Una semana!', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  } else if (semanas >= 3) {
    push(21, '📚 Sigue preparándote', `¿Cómo vas con "${nombreParte}"? Esta semana es buen momento para investigar.`);
    push(14, '✍️ Vas bien', `¿Ya tienes los puntos principales de "${nombreParte}"?`);
    push(7,  '💪 ¡Una semana!', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  } else if (semanas >= 2) {
    push(14, '✍️ Vas bien', `¿Ya tienes los puntos principales de "${nombreParte}"?`);
    push(7,  '💪 ¡Una semana!', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  } else if (semanas >= 1) {
    push(7, '💪 ¡Una semana!', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  }

  push(3, '📖 Últimos días', `¡Últimos 3 días para "${nombreParte}"! Últimos ensayos — tú puedes.`);
  push(2, '📖 Ya casi', `Faltan 2 días para "${nombreParte}". Repasa tus puntos principales.`);
  push(1, '💪 ¡Mañana es tu parte!', `Tu parte "${nombreParte}" es mañana. Confía en tu preparación.`);
  push(0, '🎉 ¡Hoy es tu día!', `Hoy presentas "${nombreParte}". ¡Mucho éxito!`);

  if (ayudante && fechaPractica) {
    const practicaFecha = construirFechaHora(fechaPractica, '09:00');
    const disparo1 = new Date(practicaFecha.getTime() - 24 * 60 * 60000);
    if (disparo1 > ahora) avisos.push({ tipo: 'asig_practica_previa', titulo: 'Práctica mañana', cuerpo: `¿Ya coordinaron todo con ${ayudante} para mañana?`, disparo: disparo1 });
    if (practicaFecha > ahora) avisos.push({ tipo: 'asig_practica_hoy', titulo: '¡Hoy practican!', cuerpo: `Hoy es el día de practicar con ${ayudante}. ¡Mucho éxito!`, disparo: practicaFecha });
  }

  for (const a of avisos) {
    await pool.query(
      `INSERT INTO notificaciones_programadas
       (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
       VALUES ($1,$2,'asignaciones',$3,$4,$5,$6)`,
      [usuarioId, a.tipo, asigId, a.titulo, a.cuerpo, a.disparo]
    );
  }

  if (avisos.length === 0 && fechaReunion > ahora) {
    await pool.query(
      `INSERT INTO notificaciones_programadas
       (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
       VALUES ($1,'asig_urgente','asignaciones',$2,'💪 ¡Tu parte es muy pronto!',$3,$4)`,
      [usuarioId, asigId, `Tu parte "${nombreParte}" está muy cerca. ¡Confía en tu preparación!`, ahora]
    );
  }
}

module.exports = {
  programarAvisosVisita,
  programarAvisosAsignacion,
  limpiarAvisosPendientes,
};