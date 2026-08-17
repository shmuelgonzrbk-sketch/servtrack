const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM precursorado WHERE usuario_id = $1', [req.userId]
    );
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO precursorado (usuario_id, tipo, meta_horas)
         VALUES ($1, 'publicador', 30) RETURNING *`,
        [req.userId]
      );
    }
    const horas = await pool.query(
      `SELECT COALESCE(SUM(horas), 0) as total FROM registros_horas
       WHERE usuario_id = $1 AND mes = $2 AND anio = $3`,
      [req.userId, new Date().getMonth() + 1, new Date().getFullYear()]
    );
    res.json({ ...result.rows[0], horas: parseFloat(horas.rows[0].total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  const { tipo, meta_horas } = req.body;
  try {
    const result = await pool.query(
      `UPDATE precursorado SET tipo=$1, meta_horas=$2
       WHERE usuario_id=$3 RETURNING *`,
      [tipo, meta_horas, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/horas', auth, async (req, res) => {
  const { horas, fecha } = req.body;
  let mes, anio, fechaRegistro;
  if (fecha) {
    const partes = fecha.split('-');
    anio = parseInt(partes[0]);
    mes = parseInt(partes[1]);
    fechaRegistro = fecha + 'T12:00:00';
  } else {
    const now = new Date();
    mes = now.getMonth() + 1;
    anio = now.getFullYear();
    fechaRegistro = null;
  }
  try {
    await pool.query(
      `INSERT INTO registros_horas (usuario_id, horas, mes, anio)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id, mes, anio)
       DO UPDATE SET horas = registros_horas.horas + EXCLUDED.horas
       RETURNING horas`,
      [req.userId, horas, mes, anio]
    );

    // Registro diario — con fecha específica si se envió, o la hora exacta de ahora
    if (fechaRegistro) {
      await pool.query(
        `INSERT INTO registros_horas_dia (usuario_id, horas, registrado_en)
         VALUES ($1, $2, $3::timestamp)`,
        [req.userId, horas, fechaRegistro]
      );
    } else {
      await pool.query(
        `INSERT INTO registros_horas_dia (usuario_id, horas, registrado_en)
         VALUES ($1, $2, NOW())`,
        [req.userId, horas]
      );
    }

    const total = await pool.query(
      `SELECT COALESCE(horas, 0) as total FROM registros_horas
       WHERE usuario_id=$1 AND mes=$2 AND anio=$3`,
      [req.userId, mes, anio]
    );
    res.json({ total: parseFloat(total.rows[0]?.total ?? 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/horas/diario', auth, async (req, res) => {
  const mes = parseInt(req.query.mes) || (new Date().getMonth() + 1);
  const anio = parseInt(req.query.anio) || new Date().getFullYear();
  try {
    const result = await pool.query(
      `SELECT DATE(registrado_en) as fecha, SUM(horas) as horas
       FROM registros_horas_dia
       WHERE usuario_id = $1 AND EXTRACT(MONTH FROM registrado_en) = $2 AND EXTRACT(YEAR FROM registrado_en) = $3
       GROUP BY DATE(registrado_en)
       ORDER BY fecha ASC`,
      [req.userId, mes, anio]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/horas', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mes, anio, horas FROM registros_horas
       WHERE usuario_id = $1
       ORDER BY anio DESC, mes DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/horas', auth, async (req, res) => {
  const mes = new Date().getMonth() + 1;
  const anio = new Date().getFullYear();
  try {
    await pool.query(
      'DELETE FROM registros_horas WHERE usuario_id=$1 AND mes=$2 AND anio=$3',
      [req.userId, mes, anio]
    );
    await pool.query(
      `DELETE FROM registros_horas_dia WHERE usuario_id=$1 AND EXTRACT(MONTH FROM registrado_en)=$2 AND EXTRACT(YEAR FROM registrado_en)=$3`,
      [req.userId, mes, anio]
    );
    res.json({ message: 'Horas reiniciadas' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HORARIO SEMANAL ──
router.get('/horario', auth, async (req, res) => {
  try {
    const filas = await pool.query(
      'SELECT dia, turno, horas FROM horario_semanal WHERE usuario_id = $1',
      [req.userId]
    );
    const metaRow = await pool.query(
      'SELECT meta_semanal_horario FROM precursorado WHERE usuario_id = $1',
      [req.userId]
    );
    const dias = {};
    filas.rows.forEach(function(f) {
      if (!dias[f.dia]) dias[f.dia] = {};
      dias[f.dia][f.turno] = parseFloat(f.horas) || 0;
    });
    res.json({
      dias: dias,
      meta: metaRow.rows[0] ? parseFloat(metaRow.rows[0].meta_semanal_horario) || 0 : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/horario', auth, async (req, res) => {
  const { dias, meta } = req.body;
  try {
    if (dias && typeof dias === 'object') {
      for (const dia of Object.keys(dias)) {
        for (const turno of Object.keys(dias[dia])) {
          const horas = parseFloat(dias[dia][turno]) || 0;
          await pool.query(
            `INSERT INTO horario_semanal (usuario_id, dia, turno, horas)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (usuario_id, dia, turno)
             DO UPDATE SET horas = EXCLUDED.horas`,
            [req.userId, dia, turno, horas]
          );
        }
      }
    }
    if (typeof meta === 'number') {
      await pool.query(
        'UPDATE precursorado SET meta_semanal_horario = $1 WHERE usuario_id = $2',
        [meta, req.userId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
