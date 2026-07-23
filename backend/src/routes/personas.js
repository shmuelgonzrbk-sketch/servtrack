const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

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
  const { nombre, direccion, telefono, gps_lat, gps_lng, tipo, estado, notas, proxima_visita, proxima_visita_hora } = req.body;
  try {
    const dirEncriptada = await encrypt(direccion);
    const notasEncriptadas = await encrypt(notas);
    const result = await pool.query(
      `INSERT INTO personas (usuario_id, nombre, direccion, telefono, gps_lat, gps_lng, tipo, estado, notas, proxima_visita, proxima_visita_hora)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.userId, nombre, dirEncriptada, telefono, gps_lat, gps_lng, tipo || 'Revisita', estado || 'Pendiente', notasEncriptadas, proxima_visita || null, proxima_visita_hora || null]
    );
    const p = result.rows[0];
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
  const { nombre, direccion, telefono, gps_lat, gps_lng, tipo, estado, notas, proxima_visita, proxima_visita_hora } = req.body;
  try {
    const dirEncriptada = await encrypt(direccion);
    const notasEncriptadas = await encrypt(notas);
    const result = await pool.query(
      `UPDATE personas SET nombre=$1, direccion=$2, telefono=$3,
       gps_lat=$4, gps_lng=$5, tipo=$6, estado=$7, notas=$8,
       proxima_visita=$9, proxima_visita_hora=$10
       WHERE id=$11 AND usuario_id=$12 RETURNING *`,
      [nombre, dirEncriptada, telefono, gps_lat, gps_lng, tipo, estado, notasEncriptadas, proxima_visita || null, proxima_visita_hora || null, req.params.id, req.userId]
    );
    res.json({
      ...result.rows[0],
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

module.exports = router;