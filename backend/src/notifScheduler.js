const pool = require('./db/pool');
const { sendPush } = require('./pushSender');

const _timers = {};
const MAX_DELAY_MS = 24 * 24 * 60 * 60 * 1000; // 24 días

function scheduleRow(row) {
  if (_timers[row.id]) return;
  const delay = new Date(row.fecha_disparo).getTime() - Date.now();

  if (delay <= 0) {
    fireNow(row);
    return;
  }
  if (delay > MAX_DELAY_MS) {
    return;
  }

  _timers[row.id] = setTimeout(() => fireNow(row), delay);
}

async function fireNow(row) {
  delete _timers[row.id];
  try {
    const cardId = row.referencia_tabla === 'personas' ? row.referencia_id : null;
    await sendPush(row.usuario_id, row.titulo, row.cuerpo, cardId);
    await pool.query('UPDATE notificaciones_programadas SET enviada = true WHERE id = $1', [row.id]);

    if (row.referencia_tabla === 'recordatorios_personales') {
      try {
        const rec = await pool.query(
          'SELECT tipo_notificacion, titulo, cuerpo FROM recordatorios_personales WHERE id = $1',
          [row.referencia_id]
        );
        if (rec.rows[0] && rec.rows[0].tipo_notificacion === 'semanal') {
          const siguienteDisparo = new Date(Date.now() + 7 * 24 * 60 * 60000);
          const insertado = await pool.query(
            `INSERT INTO notificaciones_programadas
             (usuario_id, tipo, referencia_tabla, referencia_id, titulo, cuerpo, fecha_disparo)
             VALUES ($1,'recordatorio_personal','recordatorios_personales',$2,$3,$4,$5) RETURNING *`,
            [row.usuario_id, row.referencia_id, rec.rows[0].titulo, rec.rows[0].cuerpo, siguienteDisparo]
          );
          scheduleRow(insertado.rows[0]);
        }
      } catch (e) { console.error('Error reprogramando recordatorio semanal:', e.message); }
    }
  } catch (err) {
    console.error('Error enviando notificación programada (id ' + row.id + '):', err.message);
  }
}

function cancelRow(id) {
  if (_timers[id]) {
    clearTimeout(_timers[id]);
    delete _timers[id];
  }
}

async function cargarYProgramarTodo() {
  try {
    const res = await pool.query(
      `SELECT * FROM notificaciones_programadas WHERE enviada = false`
    );
    res.rows.forEach(scheduleRow);
    console.log('[notifScheduler] ' + res.rows.length + ' avisos programados en memoria');
  } catch (err) {
    console.error('[notifScheduler] Error cargando avisos pendientes:', err.message);
  }
}

module.exports = { scheduleRow, cancelRow, cargarYProgramarTodo };
