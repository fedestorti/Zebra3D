-- 🧑‍💻 Tabla de usuarios
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    contraseña TEXT NOT NULL, -- Hash con bcrypt
    avatar_url TEXT DEFAULT NULL, -- Foto de perfil opcional
    es_premium BOOLEAN DEFAULT FALSE, -- Premium habilitado a futuro
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📦 Tabla de diseños
CREATE TABLE diseños (
    id_diseño SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    archivo_url TEXT NOT NULL, -- URL del archivo STL/OBJ
    imagen_portada TEXT DEFAULT NULL, -- Imagen de portada
    precio NUMERIC(10,2) DEFAULT 0.00, -- Precio (0 = gratuito)
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL, -- Autor del diseño
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

-- ❤️ Tabla de likes
CREATE TABLE IF NOT EXISTS likes (
    id_like SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_diseño INT NOT NULL,
    fecha_like TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_diseño) REFERENCES diseños (id_diseño) ON DELETE CASCADE
);

--  Tabla de Compras
CREATE TABLE compras (
    id_compra SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL, -- Quién compra
    id_diseño INT NOT NULL, -- Qué diseño compra
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monto NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_diseño) REFERENCES diseños (id_diseño) ON DELETE CASCADE
);