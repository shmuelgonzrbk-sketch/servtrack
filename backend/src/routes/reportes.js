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

const FAQ_KEYWORDS = [
  { match: ['color', 'tema', 'personalizar'], respuesta: 'Para cambiar el color del tema: Ve a Ajustes → Personalización → Color del tema. Puedes elegir uno de la paleta o tocar "Elegir color exacto".' },
  { match: ['notificacion', 'notificaciones', 'aviso', 'avisos'], respuesta: 'Para activar las notificaciones: Ve a Ajustes → Notificaciones → activa "Notificame". Si el navegador te pide permiso, acéptalo.' },
  { match: ['asignacion', 'asignaciones', 'parte'], respuesta: 'Para agregar una asignación: Ve al menú → Asignaciones → toca "Agregar asignación" y elige la sección.' },
];

// Enviar un mensaje nuevo (con categoría opcional) + respuesta automática del bot
router.post('/', auth, async (req, res) => {
  const { mensaje, categoria } = req.body;
  if (!mensaje || !mensaje.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
  try {
    const r = await pool.query(
      `INSERT INTO reportes (usuario_id, remitente, mensaje, categoria) VALUES ($1, 'usuario', $2, $3) RETURNING *`,
      [req.userId, mensaje.trim(), categoria || null]
    );

    const total = await pool.query('SELECT COUNT(*) FROM reportes WHERE usuario_id = $1', [req.userId]);
    const esPrimero = parseInt(total.rows[0].count) === 1;

    // Busca coincidencia con alguna FAQ conocida
    const textoLower = mensaje.toLowerCase();
    const faqEncontrada = FAQ_KEYWORDS.find(f => f.match.some(k => textoLower.includes(k)));

    let respuestaBot = null;
    if (esPrimero) {
      const saludos = [
        '✅ Hemos recibido tu mensaje. Muy pronto recibirás una respuesta.',
        '👋 ¡Hola! Gracias por escribir, en breve te respondemos.',
      ];
      respuestaBot = saludos[Math.floor(Math.random() * saludos.length)];
    } else if (faqEncontrada) {
      respuestaBot = faqEncontrada.respuesta;
    } else {
      respuestaBot = 'Estamos para ayudarte 🙌 En breve un miembro del equipo te responde directamente. Mientras tanto, aquí tienes algunas preguntas comunes:\n\n• ¿Cómo cambio el color del tema?\n• ¿Cómo activo las notificaciones?\n• ¿Cómo agrego una asignación?\n\nEscríbeme cualquiera de esas y te respondo al toque.';
    }

    if (respuestaBot) {
      await pool.query(
        `INSERT INTO reportes (usuario_id, remitente, mensaje) VALUES ($1, 'admin', $2)`,
        [req.userId, respuestaBot]
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