const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM informes WHERE usuario_id = $1 ORDER BY anio DESC, mes DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { mes, anio, año, cursos_biblicos, horas, revisitas } = req.body;
  const anioFinal = anio || año;
  try {
    const result = await pool.query(
      `INSERT INTO informes (usuario_id, mes, anio, cursos_biblicos, horas, revisitas)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usuario_id, mes, anio)
       DO UPDATE SET cursos_biblicos=$4, horas=$5, revisitas=$6
       RETURNING *`,
      [req.userId, mes, anioFinal, cursos_biblicos || 0, horas || 0, revisitas || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/enviar', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE informes SET enviado=true, fecha_envio=NOW()
       WHERE id=$1 AND usuario_id=$2 RETURNING *`,
      [req.params.id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM informes WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Informe eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
