const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client('111121682803-0uqtc6j7n54jdt99rs3r52j00qf6nqh1.apps.googleusercontent.com');

// REGISTRO
router.post('/register', async (req, res) => {
  const { nombre, email, password, congregacion } = req.body;
  try {
    const userExists = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1', [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, congregacion)
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, congregacion`,
      [nombre, email, password_hash, congregacion]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// L// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1', [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, congregacion: user.congregacion } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GOOGLE LOGIN
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: '111121682803-0uqtc6j7n54jdt99rs3r52j00qf6nqh1.apps.googleusercontent.com'
    });
    const payload = ticket.getPayload();
    const { email, name, sub } = payload;
    let result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1', [email]
    );
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, congregacion)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, email, sub, '']
      );
    }
    const user = result.rows[0];
    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, congregacion: user.congregacion } });
  } catch (err) {
    console.error('Error verificando token de Google:', err.message);
    res.status(401).json({ error: 'Token de Google inválido', detalle: err.message });
  }
  
});



module.exports = router;