const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { programarAvisosVisita } = require('../notifHelper');

const KEY = process.env.ENCRYPTION_KEY;

async function encrypt(text) {
  if (!text || text.trim() === '') return null;
  try {
    const r = await pool.query(
      `SELECT encode(pgp_sym_encrypt($1::text, $2::text), 'base64') as encrypted`,
      [text, KEY]
    );
    return r.rows[0].encrypted;
  } catch(err) {
    console.error('Encrypt error:', err.message);
    return text;
  }
}

async function decrypt(encrypted) {
  if (!encrypted) return null;
  try {
    const r = await pool.query(
      `SELECT pgp_sym_decrypt(decode($1, 'base64'), $2::text) as decrypted`,
      [encrypted, KEY]
    );
    return r.rows[0].decrypted;
  } catch {
    return encrypted;
  }
}

// OBTENER TODAS
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM personas WHERE usuario_id = $1 ORDER BY nombre ASC',
      [req.userId]
    );
    const personas = await Promise.all(result.rows.map(async p => ({
      ...p,
      direccion: await decrypt(p.direccion),
      notas: await decrypt(p.notas)
    })));
    res.json(personas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AGREGAR
router.post('/', auth, async (req, res) => {
  const { nombre, direccion, telefono, gps_lat, gps_lng, tipo, estado, notas, proxima_visita, proxima_visita_hora, pub } = req.body;
  try {
    const dirEncriptada = await encrypt(direccion);
    const notasEncriptadas = await encrypt(notas);
    const result = await pool.query(
      `INSERT INTO personas (usuario_id, nombre, direccion, telefono, gps_lat, gps_lng, tipo, estado, notas, proxima_visita, proxima_visita_hora, pub)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [req.userId, nombre, dirEncriptada, telefono, gps_lat, gps_lng, tipo || 'Revisita', estado || 'Pendiente', notasEncriptadas, proxima_visita || null, proxima_visita_hora || null, pub || null]
    );
    const p = result.rows[0];

    // Programar avisos automáticos (1h antes, 30min antes, o urgente si ya está muy cerca)
    try {
      await programarAvisosVisita({
        usuarioId: req.userId,
        personaId: p.id,
        nombre: p.nombre,
        fecha: proxima_visita,
        hora: proxima_visita_hora,
        pub: pub
      });
    } catch (e) {
      console.error('Error programando avisos:', e.message);
    }

    res.status(201).json({
      ...p,
      direccion: direccion,
      notas: notas
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDITAR
router.put('/:id', auth, async (req, res) => {
  const { nombre, direccion, telefono, gps_lat, gps_lng, tipo, estado, notas, proxima_visita, proxima_visita_hora, pub } = req.body;
  try {
    const dirEncriptada = await encrypt(direccion);
    const notasEncriptadas = await encrypt(notas);
    const result = await pool.query(
      `UPDATE personas SET nombre=$1, direccion=$2, telefono=$3,
       gps_lat=$4, gps_lng=$5, tipo=$6, estado=$7, notas=$8,
       proxima_visita=$9, proxima_visita_hora=$10, pub=$11
       WHERE id=$12 AND usuario_id=$13 RETURNING *`,
      [nombre, dirEncriptada, telefono, gps_lat, gps_lng, tipo, estado, notasEncriptadas, proxima_visita || null, proxima_visita_hora || null, pub || null, req.params.id, req.userId]
    );
    const p = result.rows[0];

    // Reprograma avisos (borra los pendientes viejos y crea los nuevos según la fecha/hora actualizada)
    try {
      await programarAvisosVisita({
        usuarioId: req.userId,
        personaId: p.id,
        nombre: p.nombre,
        fecha: proxima_visita,
        hora: proxima_visita_hora,
        pub: pub
      });
    } catch (e) {
      console.error('Error reprogramando avisos:', e.message);
    }

    res.json({
      ...p,
      direccion: direccion,
      notas: notas
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM personas WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Persona eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// MARCAR VISITA COMPLETADA (crea registro en historial + limpia proxima visita)
router.post('/:id/visitas', auth, async (req, res) => {
  const { publicacion, notas } = req.body;
  try {
    const check = await pool.query('SELECT id FROM personas WHERE id=$1 AND usuario_id=$2', [req.params.id, req.userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Persona no encontrada' });

    const result = await pool.query(
      `INSERT INTO visitas (persona_id, publicacion, fecha, hora, notas)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3) RETURNING *`,
      [req.params.id, publicacion || null, notas || null]
    );

    await pool.query(
      'UPDATE personas SET proxima_visita=NULL, proxima_visita_hora=NULL WHERE id=$1',
      [req.params.id]
    );

    try {
      const { limpiarAvisosPendientes } = require('../notifHelper');
      await limpiarAvisosPendientes('personas', req.params.id);
    } catch (e) {}

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HISTORIAL DE VISITAS (todas las visitas del usuario, con nombre de persona)
router.get('/visitas/historial', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, p.nombre as persona_nombre
       FROM visitas v
       JOIN personas p ON p.id = v.persona_id
       WHERE p.usuario_id = $1
       ORDER BY v.fecha DESC, v.hora DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR VISITA DEL HISTORIAL
router.delete('/visitas/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM visitas WHERE id=$1 AND persona_id IN (SELECT id FROM personas WHERE usuario_id=$2)',
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;