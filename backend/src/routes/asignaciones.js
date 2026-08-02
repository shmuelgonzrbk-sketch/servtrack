const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { programarAvisosAsignacion } = require('../notifHelper');

// OBTENER TODAS
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM asignaciones WHERE usuario_id = $1 ORDER BY fecha_reunion ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREAR
router.post('/', auth, async (req, res) => {
  const { seccion, titulo, fecha_reunion, estado, notas } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO asignaciones (usuario_id, seccion, titulo, fecha_reunion, estado, notas)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, seccion, titulo, fecha_reunion, estado || 'Pendiente', notas]
    );
    const nueva = result.rows[0];
    if (fecha_reunion) {
      await programarAvisosAsignacion({
        usuarioId: req.userId,
        asigId: nueva.id,
        nombreParte: titulo,
        fecha: fecha_reunion,
        ayudante: notas,
        fechaPractica: req.body.fecha_practica || null
      });
    }
    res.status(201).json(nueva);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR
router.put('/:id', auth, async (req, res) => {
  const { seccion, titulo, fecha_reunion, estado, notas } = req.body;
  try {
    const result = await pool.query(
      `UPDATE asignaciones SET seccion=$1, titulo=$2, fecha_reunion=$3, estado=$4, notas=$5
       WHERE id=$6 AND usuario_id=$7 RETURNING *`,
      [seccion, titulo, fecha_reunion, estado, notas, req.params.id, req.userId]
    );
    const actualizada = result.rows[0];
    if (actualizada && fecha_reunion) {
      await programarAvisosAsignacion({
        usuarioId: req.userId,
        asigId: actualizada.id,
        nombreParte: titulo,
        fecha: fecha_reunion,
        ayudante: notas,
        fechaPractica: req.body.fecha_practica || null
      });
    }
    res.json(actualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM asignaciones WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Asignación eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;