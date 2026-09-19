const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;

    // Corta el acceso al toque si la cuenta fue bloqueada después de emitido el token,
    // incluso si la sesión ya estaba abierta.
    const check = await pool.query('SELECT bloqueado FROM usuarios WHERE id = $1', [decoded.id]);
    if (check.rows[0] && check.rows[0].bloqueado) {
      return res.status(403).json({ error: 'Esta cuenta ha sido bloqueada' });
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};