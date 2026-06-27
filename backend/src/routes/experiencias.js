const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// OBTENER TODAS
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.nombre as autor FROM experiencias e
       JOIN usuarios u ON e.usuario_id = u.id
       ORDER BY e.fecha DESC`,
      []
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREAR
router.post('/', auth, async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: 'El texto es requerido' });
  try {
    const result = await pool.query(
      `INSERT INTO experiencias (usuario_id, texto)
       VALUES ($1, $2) RETURNING *`,
      [req.userId, texto]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR (solo la tuya)
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM experiencias WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Experiencia eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;