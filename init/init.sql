-- 🧑‍💻 Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    apodo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contrasena TEXT NOT NULL,
    avatar_url TEXT,
    es_premium BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    biografia TEXT,
    pais VARCHAR(50),
    cuenta_pago TEXT
);

-- 📦 Tabla de diseños
CREATE TABLE IF NOT EXISTS disenos (
    id_diseno SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    archivo_url TEXT NOT NULL,
    precio NUMERIC(10,2) DEFAULT 0.00,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    categoria VARCHAR(100),
    etiqueta VARCHAR(100),
    parametros_fabricacion TEXT,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- ❤️ Tabla de likes
CREATE TABLE IF NOT EXISTS likes (
    id_like SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_diseno INT NOT NULL,
    fecha_like TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_diseno) REFERENCES disenos(id_diseno) ON DELETE CASCADE
);

-- 🛒 Tabla de compras
CREATE TABLE IF NOT EXISTS compras (
    id_compra SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_diseno INT NOT NULL,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monto NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_diseno) REFERENCES disenos(id_diseno) ON DELETE CASCADE
);

-- 💰 Tabla de pagos con comisión
CREATE TABLE IF NOT EXISTS pagos_plataforma (
    id_pago SERIAL PRIMARY KEY,
    id_compra INT NOT NULL,
    monto_total NUMERIC(10,2) NOT NULL,
    monto_autor NUMERIC(10,2) NOT NULL,
    monto_comision NUMERIC(10,2) NOT NULL,
    estado_pago VARCHAR(20) DEFAULT 'pendiente', -- pagado, fallido, retenido
    metodo_pago VARCHAR(50),
    FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE
);

--  Tabla de Imagenes de diseños
CREATE TABLE IF NOT EXISTS imagenes_diseno (
    id_imagen SERIAL PRIMARY KEY,
    id_diseno INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE CASCADE,
    url_imagenes TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0
);

-- Crea la tabla de seguidores
-- en tu SQL de migrations o directamente en la base de datos
CREATE TABLE IF NOT EXISTS seguidores (
  id_seguidor   SERIAL PRIMARY KEY,
  id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_seguido    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  fecha_seguido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_usuario, id_seguido)
);


-- 1️⃣ Creamos la tabla de reseñas
CREATE TABLE IF NOT EXISTS resenas (
  id_resena     SERIAL PRIMARY KEY,
  id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_calificado INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  calificacion  NUMERIC(2,1) NOT NULL,
  fecha         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_usuario, id_calificado)
);
