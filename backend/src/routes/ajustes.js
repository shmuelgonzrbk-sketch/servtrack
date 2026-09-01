const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// OBTENER
router.get('/', auth, async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM ajustes WHERE usuario_id = $1', [req.userId]
    );
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO ajustes (usuario_id)
         VALUES ($1) RETURNING *`,
        [req.userId]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR
router.put('/', auth, async (req, res) => {
  const { notificaciones, vibrar, sonido, minutos_antes, orden_lista, tema, recordatorios_minutos } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ajustes SET notificaciones=$1, vibrar=$2, sonido=$3,
       minutos_antes=$4, orden_lista=$5, tema=$6, recordatorios_minutos=$7
       WHERE usuario_id=$8 RETURNING *`,
      [notificaciones, vibrar, sonido, minutos_antes, orden_lista, tema, JSON.stringify(recordatorios_minutos || [minutos_antes || 60]), req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;