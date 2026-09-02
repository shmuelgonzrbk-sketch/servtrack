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
  const { titulo, descripcion, fecha, hora, tipo_notificacion, icono, recordatorios_minutos } = req.body;
  if (!titulo || !fecha) return res.status(400).json({ error: 'Título y fecha son obligatorios' });
  try {
    const result = await pool.query(
      `INSERT INTO recordatorios_personales (usuario_id, titulo, descripcion, fecha, hora, tipo_notificacion, icono, recordatorios_minutos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, titulo, descripcion || null, fecha, hora || '09:00', tipo_notificacion || 'una_vez', icono || 'pin', JSON.stringify(recordatorios_minutos || [1440])]
    );
    const nuevo = result.rows[0];
    try {
      await programarAvisoRecordatorio({
        usuarioId: req.userId,
        recordatorioId: nuevo.id,
        titulo: nuevo.titulo,
        descripcion: nuevo.descripcion,
        fecha: nuevo.fecha,
        hora: nuevo.hora
      });
    } catch (e) { console.error('Error programando aviso de recordatorio:', e); }
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { titulo, descripcion, fecha, hora, icono, recordatorios_minutos } = req.body;
  if (!titulo || !fecha) return res.status(400).json({ error: 'Título y fecha son obligatorios' });
  try {
    const result = await pool.query(
      `UPDATE recordatorios_personales
       SET titulo=$1, descripcion=$2, fecha=$3, icono=$4, recordatorios_minutos=$5, hora=$6
       WHERE id=$7 AND usuario_id=$8 RETURNING *`,
      [titulo, descripcion || null, fecha, icono || 'pin', JSON.stringify(recordatorios_minutos || [1440]), hora || '09:00', req.params.id, req.userId]
    );
    const actualizado = result.rows[0];
    if (actualizado) {
      try {
        await limpiarAvisosPendientes('recordatorios_personales', actualizado.id);
        await programarAvisoRecordatorio({
          usuarioId: req.userId,
          recordatorioId: actualizado.id,
          titulo: actualizado.titulo,
          descripcion: actualizado.descripcion,
          fecha: actualizado.fecha,
          hora: actualizado.hora
        });
      } catch (e) { console.error('Error reprogramando aviso:', e); }
    }
    res.json(actualizado);
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
