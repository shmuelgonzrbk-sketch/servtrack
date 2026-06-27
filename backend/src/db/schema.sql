CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  congregacion VARCHAR(100),
  fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  telefono VARCHAR(20),
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  tipo VARCHAR(20) DEFAULT 'Revisita',
  estado VARCHAR(20) DEFAULT 'Pendiente'
);

CREATE TABLE IF NOT EXISTS visitas (
  id SERIAL PRIMARY KEY,
  persona_id INTEGER REFERENCES personas(id) ON DELETE CASCADE,
  publicacion VARCHAR(255),
  fecha DATE,
  hora TIME,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS precursorado (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) DEFAULT 'Auxiliar',
  meta_horas INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS registros_horas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  horas DECIMAL(5,2),
  mes INTEGER,
  año INTEGER,
  fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asignaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  seccion VARCHAR(50),
  titulo VARCHAR(255),
  fecha_reunion DATE,
  estado VARCHAR(20) DEFAULT 'Pendiente',
  notas TEXT
);

CREATE TABLE IF NOT EXISTS informes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  mes INTEGER,
  año INTEGER,
  cursos_biblicos INTEGER DEFAULT 0,
  horas DECIMAL(5,2) DEFAULT 0,
  revisitas INTEGER DEFAULT 0,
  enviado BOOLEAN DEFAULT FALSE,
  fecha_envio TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ajustes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  notificaciones BOOLEAN DEFAULT TRUE,
  vibrar BOOLEAN DEFAULT TRUE,
  sonido BOOLEAN DEFAULT TRUE,
  minutos_antes INTEGER DEFAULT 60,
  orden_lista VARCHAR(20) DEFAULT 'fecha',
  tema VARCHAR(20) DEFAULT 'azul_noche'
);

CREATE TABLE IF NOT EXISTS experiencias (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frases (
  id SERIAL PRIMARY KEY,
  dia_mes INTEGER NOT NULL,
  texto TEXT NOT NULL
);