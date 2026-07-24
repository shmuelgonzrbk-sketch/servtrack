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
const MENSAJES_ASIG = {
  7: { titulo: '📖 Te queda 1 semana', cuerpo: (n) => `Tu parte "${n}" es en 7 días — ¡empieza a prepararte!` },
  5: { titulo: '📚 Sigue preparándote', cuerpo: (n) => `Quedan 5 días para tu parte "${n}". ¿Cómo va tu preparación?` },
  3: { titulo: '✍️ Ya casi es tu turno', cuerpo: (n) => `Faltan 3 días para "${n}". Buen momento para repasar y practicar.` },
  1: { titulo: '💪 ¡Mañana es tu parte!', cuerpo: (n) => `Tu parte "${n}" es mañana. Confía en tu preparación — ¡tú puedes!` },
};

async function programarAvisosAsignacion({ usuarioId, asigId, nombreParte, fecha }) {
  await limpiarAvisosPendientes('asignaciones', asigId);
  if (!fecha) return;

  const fechaReunion = construirFechaHora(fecha, '08:00'); // se dispara a las 8am de ese día
  const ahora = new Date();
  let algunoFuturo = false;

  for (const dias of [7, 5, 3, 1]) {
    const disparo = new Date(fechaReunion.getTime() - dias * 24 * 60 * 60000);
    if (disparo > ahora) {
      algunoFuturo = true;
      const msg = MENSAJES_ASIG[dias];
      await pool.query(
        `INSERT INTO notificaciones_programadas
         (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
         VALUES ($1,$2,'asignaciones',$3,$4,$5,$6)`,
        [usuarioId, `asig_dia${dias}`, asigId, msg.titulo, msg.cuerpo(nombreParte), disparo]
      );
    }
  }

  // Si la asignación es muy próxima (menos de 1 día) y ningún aviso de la escala cabe, uno motivador ya
  if (!algunoFuturo && fechaReunion > ahora) {
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