const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// Obtener mi conversación (filtra lo que el usuario ocultó para sí mismo)
router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, remitente, mensaje, fecha, editado, eliminado_global
       FROM reportes
       WHERE usuario_id = $1 AND oculto_para_usuario = false
       ORDER BY fecha ASC`,
      [req.userId]
    );
    await pool.query(
      "UPDATE reportes SET leido = true WHERE usuario_id = $1 AND remitente = 'admin'",
      [req.userId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar un mensaje nuevo (con categoría opcional)
router.post('/', auth, async (req, res) => {
  const { mensaje, categoria } = req.body;
  if (!mensaje || !mensaje.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
  try {
    const r = await pool.query(
      `INSERT INTO reportes (usuario_id, remitente, mensaje, categoria) VALUES ($1, 'usuario', $2, $3) RETURNING *`,
      [req.userId, mensaje.trim(), categoria || null]
    );

    // ¿Es el primer mensaje de esta conversación?
    const total = await pool.query('SELECT COUNT(*) FROM reportes WHERE usuario_id = $1', [req.userId]);
    if (parseInt(total.rows[0].count) === 1) {
      await pool.query(
        `INSERT INTO reportes (usuario_id, remitente, mensaje) VALUES ($1, 'admin', $2)`,
        [req.userId, '✅ Hemos recibido tu mensaje. Muy pronto recibirás una respuesta.']
      );
    }

    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar mi propio mensaje
router.put('/:id', auth, async (req, res) => {
  const { mensaje } = req.body;
  try {
    const r = await pool.query(
      `UPDATE reportes SET mensaje = $1, editado = true
       WHERE id = $2 AND usuario_id = $3 AND remitente = 'usuario' RETURNING *`,
      [mensaje, req.params.id, req.userId]
    );
    if (!r.rows.length) return res.status(403).json({ error: 'No puedes editar este mensaje' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar: ?tipo=mio (solo lo oculta para el usuario) o ?tipo=todos (solo si es mensaje propio)
router.delete('/:id', auth, async (req, res) => {
  const { tipo } = req.query;
  try {
    if (tipo === 'todos') {
      const r = await pool.query(
        `UPDATE reportes SET eliminado_global = true, mensaje = 'Mensaje eliminado'
         WHERE id = $1 AND usuario_id = $2 AND remitente = 'usuario' RETURNING *`,
        [req.params.id, req.userId]
      );
      if (!r.rows.length) return res.status(403).json({ error: 'No puedes eliminar este mensaje para todos' });
      return res.json(r.rows[0]);
    }
    const r = await pool.query(
      `UPDATE reportes SET oculto_para_usuario = true WHERE id = $1 AND usuario_id = $2 RETURNING *`,
      [req.params.id, req.userId]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;