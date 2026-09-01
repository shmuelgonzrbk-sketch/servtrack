CREATE TABLE IF NOT EXISTS recordatorios (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha DATE,
  icono VARCHAR(20) DEFAULT 'pin',
  color VARCHAR(9),
  recordatorios_minutos INTEGER[] DEFAULT ARRAY[1440],
  completado BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

ALTER TABLE personas ADD COLUMN IF NOT EXISTS color VARCHAR(9);
