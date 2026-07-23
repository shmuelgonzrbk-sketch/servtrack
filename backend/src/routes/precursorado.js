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
       VALUES ($1, $2, $3, $4)`,
      [req.userId, horas, mes, anio]
    );
    const total = await pool.query(
      `SELECT COALESCE(SUM(horas), 0) as total FROM registros_horas
       WHERE usuario_id=$1 AND mes=$2 AND anio=$3`,
      [req.userId, mes, anio]
    );
    res.json({ total: parseFloat(total.rows[0].total) });
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
    res.json({ message: 'Horas reiniciadas' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
