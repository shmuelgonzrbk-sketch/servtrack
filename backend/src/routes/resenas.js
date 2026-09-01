const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// GET /api/resenas — obtener reseñas aprobadas (público)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, congregacion, texto, estrellas, fecha FROM resenas WHERE aprobada = true ORDER BY fecha DESC LIMIT 20'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resenas/all — obtener todas (admin)
router.get('/all', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, email, congregacion, texto, estrellas, aprobada, fecha FROM resenas ORDER BY fecha DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resenas — crear reseña (requiere auth)
router.post('/', auth, async (req, res) => {
  const { texto, estrellas } = req.body;
  if (!texto || texto.trim().length < 10) {
    return res.status(400).json({ error: 'La reseña debe tener al menos 10 caracteres' });
  }
  if (!estrellas || estrellas < 1 || estrellas > 5) {
    return res.status(400).json({ error: 'Las estrellas deben ser entre 1 y 5' });
  }
  try {
    // Obtener datos del usuario
    const { rows: userRows } = await pool.query(
      'SELECT nombre, email, congregacion FROM usuarios WHERE id = $1', [req.userId]
    );
    if (!userRows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const user = userRows[0];

    // Verificar que no tenga ya una reseña
    const { rows: existing } = await pool.query(
      'SELECT id FROM resenas WHERE usuario_id = $1', [req.userId]
    );
    if (existing.length) {
      return res.status(400).json({ error: 'Ya dejaste una reseña. Solo se permite una por usuario.' });
    }

    const { rows } = await pool.query(
      'INSERT INTO resenas (usuario_id, nombre, email, congregacion, texto, estrellas) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, user.nombre, user.email, user.congregacion, texto.trim(), estrellas]
    );
    res.json({ ok: true, resena: rows[0], message: 'Reseña enviada. Será visible después de ser aprobada.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/resenas/:id/aprobar — aprobar reseña (admin)
router.put('/:id/aprobar', async (req, res) => {
  try {
    await pool.query('UPDATE resenas SET aprobada = true WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/resenas/:id — eliminar reseña (admin)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM resenas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
