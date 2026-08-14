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
  const { horas } = req.body;
  const mes = new Date().getMonth() + 1;
  const anio = new Date().getFullYear();
  try {
    await pool.query(
      `INSERT INTO registros_horas (usuario_id, horas, mes, anio)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id, mes, anio)
       DO UPDATE SET horas = registros_horas.horas + EXCLUDED.horas
       RETURNING horas`,
      [req.userId, horas, mes, anio]
    );

    // Registro diario (nuevo) — una fila por cada vez que se registran horas, con hora exacta
    await pool.query(
      `INSERT INTO registros_horas_dia (usuario_id, horas, registrado_en)
       VALUES ($1, $2, NOW())`,
      [req.userId, horas]
    );

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

module.exports = router;
