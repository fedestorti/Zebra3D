-- 🧑‍💻 Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    apodo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contraseña TEXT NOT NULL,
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
    imagen_portada TEXT,
    precio NUMERIC(10,2) DEFAULT 0.00,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
