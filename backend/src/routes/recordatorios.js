const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { programarAvisoRecordatorio, limpiarAvisosPendientes } = require('../notifHelper');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recordatorios_personales WHERE usuario_id = $1 ORDER BY fecha ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { titulo, descripcion, fecha, tipo_notificacion } = req.body;
  if (!titulo || !fecha) return res.status(400).json({ error: 'Título y fecha son obligatorios' });
  try {
    const result = await pool.query(
      `INSERT INTO recordatorios_personales (usuario_id, titulo, descripcion, fecha, tipo_notificacion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, titulo, descripcion || null, fecha, tipo_notificacion || 'una_vez']
    );
    const nuevo = result.rows[0];
    try {
      await programarAvisoRecordatorio({
        usuarioId: req.userId,
        recordatorioId: nuevo.id,
        titulo: nuevo.titulo,
        descripcion: nuevo.descripcion,
        fecha: nuevo.fecha
      });
    } catch (e) { console.error('Error programando aviso de recordatorio:', e); }
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM recordatorios_personales WHERE id=$1 AND usuario_id=$2', [req.params.id, req.userId]);
    await limpiarAvisosPendientes('recordatorios_personales', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
