const pool = require('./db/pool');

function construirFechaHora(fechaStr, horaStr) {
  // Siempre interpretar como hora Peru (UTC-5), sin importar timezone del servidor
  const [y, m, d] = fechaStr.split('-').map(Number);
  const [h, min] = (horaStr || '00:00').split(':').map(Number);
  // Crear fecha en UTC y sumarle 5 horas (Peru = UTC-5)
  const utcMs = Date.UTC(y, m - 1, d, h + 5, min, 0, 0);
  return new Date(utcMs);
}

async function limpiarAvisosPendientes(tabla, referenciaId) {
  await pool.query(
    `DELETE FROM notificaciones_programadas
     WHERE referencia_tabla = $1 AND referencia_id = $2 AND enviada = false`,
    [tabla, referenciaId]
  );
}

function alAzar(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function programarAvisosVisita({ usuarioId, personaId, nombre, fecha, hora, pub }) {
  await limpiarAvisosPendientes('personas', personaId);
  if (!fecha || !hora) return;

  const horaVisita = construirFechaHora(fecha, hora);
  const ahora = new Date();
  const temaTxt = pub && pub.trim() ? ` · Tema: ${pub.trim()}` : '';

  let minutosAntesPref = 60;
  try {
    const ajustesRes = await pool.query('SELECT minutos_antes FROM ajustes WHERE usuario_id = $1', [usuarioId]);
    if (ajustesRes.rows[0] && ajustesRes.rows[0].minutos_antes > 0) {
      minutosAntesPref = ajustesRes.rows[0].minutos_antes;
    }
  } catch (e) {}

  function formatearMinutos(m) {
    if (m < 60) return `${m} minutos`;
    if (m % 60 === 0) return m === 60 ? '1 hora' : `${m/60} horas`;
    return `${Math.floor(m/60)}h ${m%60}min`;
  }
  const etiquetaTiempo = formatearMinutos(minutosAntesPref);

  const msgsAviso = [
    `En ${etiquetaTiempo} tienes visita con ${nombre} a las ${hora}. Prepara tu tema.${temaTxt}`,
    `Recuerda: visita con ${nombre} a las ${hora}. Revisa tus notas.${temaTxt}`,
    `Falta ${etiquetaTiempo} para tu visita con ${nombre}. No olvides llegar a tiempo.${temaTxt}`,
    `${nombre} te espera a las ${hora}. Tienes ${etiquetaTiempo} para prepararte.${temaTxt}`,
  ];

  const msgsUrgente = [
    `Tu visita con ${nombre} es en pocos minutos. Sal ahora.${temaTxt}`,
    `${nombre} te espera pronto. No demores en salir.${temaTxt}`,
    `La visita con ${nombre} a las ${hora} ya casi empieza.${temaTxt}`,
    `Es hora de visitar a ${nombre}. La visita es a las ${hora}.${temaTxt}`,
  ];

  const avisos = [
    { tipo: 'visita_aviso', minutosAntes: minutosAntesPref, titulo: `${nombre} — Visita a las ${hora}`, cuerpo: alAzar(msgsAviso) },
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
        [usuarioId, aviso.tipo, personaId, aviso.titulo, aviso.cuerpo, disparo]
      );
    }
  }

  if (!algunoFuturo && horaVisita > ahora) {
    await pool.query(
      `INSERT INTO notificaciones_programadas
       (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
       VALUES ($1,'visita_urgente','personas',$2,$3,$4,$5)`,
      [usuarioId, personaId, `${nombre} — Visita ahora`, alAzar(msgsUrgente), ahora]
    );
  }
}

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
    push(28, 'Nueva asignacion asignada', `Ya pensaste en el tema de "${nombreParte}"? Tienes tiempo, empieza a planificar.`);
    push(21, 'Sigue preparandote', `Como vas con "${nombreParte}"? Esta semana es buen momento para investigar.`);
    push(14, 'Vas bien, sigue asi', `Ya tienes el bosquejo o los puntos principales de "${nombreParte}"?`);
    push(7,  'Una semana para tu parte', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  } else if (semanas >= 3) {
    push(21, 'Sigue preparandote', `Como vas con "${nombreParte}"? Esta semana es buen momento para investigar.`);
    push(14, 'Vas bien, sigue asi', `Ya tienes los puntos principales de "${nombreParte}"?`);
    push(7,  'Una semana para tu parte', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  } else if (semanas >= 2) {
    push(14, 'Vas bien, sigue asi', `Ya tienes los puntos principales de "${nombreParte}"?`);
    push(7,  'Una semana para tu parte', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  } else if (semanas >= 1) {
    push(7, 'Una semana para tu parte', `Falta una semana para "${nombreParte}". Es hora de practicar en voz alta.`);
  }

  push(3, 'Ultimos dias para tu parte', `Ultimos 3 dias para "${nombreParte}". Ultimos ensayos, tu puedes.`);
  push(2, 'Ya casi es tu parte', `Faltan 2 dias para "${nombreParte}". Repasa tus puntos principales.`);
  push(1, 'Manana es tu parte', `Tu parte "${nombreParte}" es manana. Confia en tu preparacion.`);
  push(0, 'Hoy presentas tu parte', `Hoy presentas "${nombreParte}". Mucho exito!`);

  if (ayudante && fechaPractica) {
    const practicaFecha = construirFechaHora(fechaPractica, '09:00');
    const disparo1 = new Date(practicaFecha.getTime() - 24 * 60 * 60000);
    if (disparo1 > ahora) avisos.push({ tipo: 'asig_practica_previa', titulo: 'Practica manana', cuerpo: `Ya coordinaron todo con ${ayudante} para manana?`, disparo: disparo1 });
    if (practicaFecha > ahora) avisos.push({ tipo: 'asig_practica_hoy', titulo: 'Hoy practican', cuerpo: `Hoy es el dia de practicar con ${ayudante}. Mucho exito!`, disparo: practicaFecha });
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
       VALUES ($1,'asig_urgente','asignaciones',$2,$3,$4,$5)`,
      [usuarioId, asigId, 'Tu parte es muy pronto', `Tu parte "${nombreParte}" esta muy cerca. Confia en tu preparacion!`, ahora]
    );
  }
}

async function programarAvisoRecordatorio({ usuarioId, recordatorioId, titulo, descripcion, fecha }) {
  const disparo = construirFechaHora(fecha, '09:00');
  const ahora = new Date();
  if (disparo <= ahora) return;
  const cuerpo = descripcion && descripcion.trim() ? descripcion.trim() : 'Tienes un recordatorio pendiente hoy.';
  await pool.query(
    `INSERT INTO notificaciones_programadas
     (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
     VALUES ($1,'recordatorio_personal','recordatorios_personales',$2,$3,$4,$5)`,
    [usuarioId, recordatorioId, titulo, cuerpo, disparo]
  );
}

module.exports = {
  programarAvisosVisita,
  programarAvisosAsignacion,
  programarAvisoRecordatorio,
  limpiarAvisosPendientes,
};
