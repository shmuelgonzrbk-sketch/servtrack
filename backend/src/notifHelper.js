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

  let listaMinutos = [60];
  try {
    const ajustesRes = await pool.query('SELECT recordatorios_minutos FROM ajustes WHERE usuario_id = $1', [usuarioId]);
    const raw = ajustesRes.rows[0] && ajustesRes.rows[0].recordatorios_minutos;
    if (Array.isArray(raw) && raw.length > 0) listaMinutos = raw.filter(m => m > 0);
  } catch (e) {}
  if (listaMinutos.length === 0) listaMinutos = [60];

  function formatearMinutos(m) {
    if (m < 60) return `${m} minutos`;
    if (m < 1440) return (m % 60 === 0) ? (m === 60 ? '1 hora' : `${m/60} horas`) : `${Math.floor(m/60)}h ${m%60}min`;
    const dias = Math.round(m / 1440);
    return dias === 1 ? '1 día' : `${dias} días`;
  }

  function mensajesPara(m, etiqueta) {
    if (m >= 1440 && m < 2880) {
      return [
        `Mañana tienes visita con ${nombre} a las ${hora}. Prepara tu tema.${temaTxt}`,
        `Recuerda: mañana visitas a ${nombre} a las ${hora}.${temaTxt}`,
        `Visita con ${nombre} mañana a las ${hora}. Revisa tus notas.${temaTxt}`,
      ];
    }
    if (m >= 1440) {
      const dias = Math.round(m / 1440);
      return [
        `En ${dias} días tendrás visita con ${nombre} a las ${hora}.${temaTxt}`,
        `Recuerda: en ${dias} días visitas a ${nombre}.${temaTxt}`,
      ];
    }
    return [
      `En ${etiqueta} tienes visita con ${nombre} a las ${hora}. Prepara tu tema.${temaTxt}`,
      `Recuerda: visita con ${nombre} a las ${hora}. Revisa tus notas.${temaTxt}`,
      `Falta ${etiqueta} para tu visita con ${nombre}. No olvides llegar a tiempo.${temaTxt}`,
      `${nombre} te espera a las ${hora}. Tienes ${etiqueta} para prepararte.${temaTxt}`,
    ];
  }

  const avisos = listaMinutos.map(function(m) {
    const etiqueta = formatearMinutos(m);
    return { tipo: 'visita_aviso_' + m, minutosAntes: m, titulo: `${nombre} — Visita a las ${hora}`, cuerpo: alAzar(mensajesPara(m, etiqueta)) };
  });

  const msgsUrgente = [
    `Tu visita con ${nombre} es en pocos minutos. Sal ahora.${temaTxt}`,
    `${nombre} te espera pronto. No demores en salir.${temaTxt}`,
    `La visita con ${nombre} a las ${hora} ya casi empieza.${temaTxt}`,
    `Es hora de visitar a ${nombre}. La visita es a las ${hora}.${temaTxt}`,
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

function formatearMinutosGenerico(m) {
  if (m < 60) return `${m} minutos`;
  if (m < 1440) return (m % 60 === 0) ? (m === 60 ? '1 hora' : `${m/60} horas`) : `${Math.floor(m/60)}h ${m%60}min`;
  if (m < 10080) {
    const dias = Math.round(m / 1440);
    return dias === 1 ? '1 dia' : `${dias} dias`;
  }
  const semanas = Math.round(m / 10080);
  return semanas === 1 ? '1 semana' : `${semanas} semanas`;
}

async function programarAvisosAsignacion({ usuarioId, asigId, nombreParte, fecha, ayudante, fechaPractica }) {
  await limpiarAvisosPendientes('asignaciones', asigId);
  if (!fecha) return;

  const fechaReunion = construirFechaHora(fecha, '09:00');
  const ahora = new Date();

  let listaMinutos = [1440];
  try {
    const asigRes = await pool.query('SELECT recordatorios_minutos FROM asignaciones WHERE id = $1', [asigId]);
    const raw = asigRes.rows[0] && asigRes.rows[0].recordatorios_minutos;
    if (Array.isArray(raw) && raw.length > 0) listaMinutos = raw.filter(m => m > 0);
  } catch (e) {}
  if (listaMinutos.length === 0) listaMinutos = [1440];

  const avisos = listaMinutos.map(function(m) {
    const disparo = new Date(fechaReunion.getTime() - m * 60000);
    const etiqueta = formatearMinutosGenerico(m);
    let cuerpo;
    if (m === 0) cuerpo = `Hoy presentas "${nombreParte}". \u00a1Mucho \u00e9xito!`;
    else if (m < 1440) cuerpo = `En ${etiqueta} tienes tu parte "${nombreParte}". Pr\u00e9parate.`;
    else if (m < 2880) cuerpo = `Ma\u00f1ana tienes tu parte "${nombreParte}". Conf\u00eda en tu preparaci\u00f3n.`;
    else cuerpo = `En ${etiqueta} tienes tu parte "${nombreParte}". Es buen momento para repasar.`;
    return { tipo: `asig_aviso_${m}`, titulo: `Asignaci\u00f3n \u2014 ${nombreParte}`, cuerpo, disparo };
  }).filter(function(a){ return a.disparo > ahora; });

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
}

async function programarAvisoRecordatorio({ usuarioId, recordatorioId, titulo, descripcion, fecha, hora }) {
  const fechaBase = construirFechaHora(fecha, hora || '09:00');
  const ahora = new Date();

  let listaMinutos = [1440];
  try {
    const recRes = await pool.query('SELECT recordatorios_minutos FROM recordatorios_personales WHERE id = $1', [recordatorioId]);
    const raw = recRes.rows[0] && recRes.rows[0].recordatorios_minutos;
    if (Array.isArray(raw) && raw.length > 0) listaMinutos = raw.filter(m => m > 0);
  } catch (e) {}
  if (listaMinutos.length === 0) listaMinutos = [1440];

  const cuerpoBase = descripcion && descripcion.trim() ? descripcion.trim() : 'Tienes un recordatorio pendiente.';

  for (const m of listaMinutos) {
    const disparo = new Date(fechaBase.getTime() - m * 60000);
    if (disparo <= ahora) continue;
    await pool.query(
      `INSERT INTO notificaciones_programadas
       (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
       VALUES ($1,$2,'recordatorios_personales',$3,$4,$5,$6)`,
      [usuarioId, `recordatorio_${m}`, recordatorioId, titulo, cuerpoBase, disparo]
    );
  }
}

module.exports = {
  programarAvisosVisita,
  programarAvisosAsignacion,
  programarAvisoRecordatorio,
  limpiarAvisosPendientes,
};
