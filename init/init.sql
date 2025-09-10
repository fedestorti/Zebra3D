-- 🧑‍💻 Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario     SERIAL PRIMARY KEY,
  apodo          VARCHAR(100) UNIQUE NOT NULL,
  nombre         VARCHAR(50)  NOT NULL,
  apellido       VARCHAR(50)  NOT NULL,
  email          VARCHAR(100) UNIQUE NOT NULL,
  contrasena     TEXT NOT NULL,        -- guardar hash
  avatar_url     TEXT,
  es_premium     BOOLEAN DEFAULT FALSE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  biografia      TEXT,
  pais           VARCHAR(50),
  cuenta_pago    TEXT,
  -- Mercado Pago
  mp_user_id       TEXT,       -- ID del usuario en MP
  mp_access_token  TEXT,       -- token de acceso
  mp_refresh_token TEXT,       -- token de refresco
  mp_token_scopes  TEXT,       -- permisos concedidos
  mp_token_expira  TIMESTAMP,  -- cuándo caduca el access_token
  mp_public_key    TEXT        -- clave pública opcional
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
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);


-- ❤️ Tabla de likes
CREATE TABLE IF NOT EXISTS likes (
  id_like SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_diseno INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE CASCADE,
  fecha_like TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 🖼️ Tabla de imágenes de diseños
CREATE TABLE IF NOT EXISTS imagenes_diseno (
  id_imagen SERIAL PRIMARY KEY,
  id_diseno INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE CASCADE,
  url_imagenes TEXT NOT NULL,
  public_id TEXT NOT NULL, -- clave en Cloudinary para poder borrar
  orden INTEGER NOT NULL DEFAULT 0
);


-- 👥 Tabla de seguidores
CREATE TABLE IF NOT EXISTS seguidores (
  id_seguidor   SERIAL PRIMARY KEY,
  id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_seguido    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  fecha_seguido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_usuario, id_seguido)
);


-- ⭐ Tabla de reseñas
CREATE TABLE IF NOT EXISTS resenas (
  id_resena     SERIAL PRIMARY KEY,
  id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE, -- quién reseña
  id_calificado INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE, -- a quién reseña
  calificacion  NUMERIC(2,1) NOT NULL,
  fecha         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_usuario, id_calificado)
);


-- 🛒 Carritos
CREATE TABLE IF NOT EXISTS carritos (
  id_carrito SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  creado_en  TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_usuario)  -- un carrito activo por usuario
);

CREATE TABLE IF NOT EXISTS carrito_items (
  id_item     SERIAL PRIMARY KEY,
  id_carrito  INT NOT NULL REFERENCES carritos(id_carrito) ON DELETE CASCADE,
  id_diseno   INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE CASCADE,
  qty         INT NOT NULL CHECK (qty > 0),
  agregado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_carrito, id_diseno)
);

CREATE INDEX IF NOT EXISTS ix_carrito_items_carrito ON carrito_items(id_carrito);


-- 🧾 Ordenes (compras de usuarios)
CREATE TABLE IF NOT EXISTS ordenes_marketplace (
  id_orden       SERIAL PRIMARY KEY,
  id_usuario     INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT, -- comprador
  subtotal       NUMERIC(12,2) NOT NULL,
  fee_plataforma NUMERIC(12,2) NOT NULL DEFAULT 0,  -- comisión total
  total          NUMERIC(12,2) NOT NULL,
  moneda         CHAR(3) NOT NULL DEFAULT 'ARS',
  estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','pagado','fallido','cancelado','refunded','parcial')),
  external_reference TEXT,          -- referencia de MP (orden global)
  creado_en      TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);


-- 🧾 Ítems de la orden (detalle de cada diseño comprado)
CREATE TABLE IF NOT EXISTS orden_items_marketplace (
  id_item       SERIAL PRIMARY KEY,
  id_orden      INT NOT NULL REFERENCES ordenes_marketplace(id_orden) ON DELETE CASCADE,
  id_diseno     INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE RESTRICT,
  titulo        TEXT NOT NULL,                 -- snapshot del título del diseño
  precio_unit   NUMERIC(12,2) NOT NULL,        -- snapshot del precio
  qty           INT NOT NULL CHECK (qty > 0),
  subtotal_item NUMERIC(12,2) GENERATED ALWAYS AS (precio_unit * qty) STORED
);

CREATE INDEX IF NOT EXISTS ix_orden_items_orden  ON orden_items_marketplace(id_orden);
CREATE INDEX IF NOT EXISTS ix_orden_items_diseno ON orden_items_marketplace(id_diseno);


-- 💳 Pagos (atados al ítem de la orden)
CREATE TABLE IF NOT EXISTS pagos_marketplace (
  id_pago              SERIAL PRIMARY KEY,
  id_item              INT NOT NULL REFERENCES orden_items_marketplace(id_item) ON DELETE RESTRICT,
  preference_id        TEXT UNIQUE,      -- MP preference
  init_point           TEXT,             -- link de pago
  payment_id           TEXT UNIQUE,      -- ID de pago de MP
  status               TEXT CHECK (status IN ('approved','pending','rejected','refunded','cancelled','in_process')),
  moneda               CHAR(3) DEFAULT 'ARS',
  monto_bruto          NUMERIC(12,2),
  fee_plataforma       NUMERIC(12,2),
  monto_neto_vendedor  NUMERIC(12,2),
  paid_at              TIMESTAMP,
  raw                  JSONB,            -- payload crudo de MP
  creado_en            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pagos_item  ON pagos_marketplace(id_item);
CREATE INDEX IF NOT EXISTS ix_pagos_stat  ON pagos_marketplace(status);


-- 🔐 Estado de OAuth de usuarios (para MP)
CREATE TABLE IF NOT EXISTS usuarios_oauth (
  id_usuario     INT PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  state_nonce    TEXT,
  last_auth_at   TIMESTAMP,
  last_refresh_at TIMESTAMP,
  scope          TEXT,
  extra          JSONB
);


-- 🛰️ Log de webhooks de MP
CREATE TABLE IF NOT EXISTS webhooks_mp_log (
  id_log       BIGSERIAL PRIMARY KEY,
  topic        TEXT,
  resource_id  TEXT,
  query_raw    JSONB,
  body_raw     JSONB,
  received_at  TIMESTAMP DEFAULT NOW(),
  processed    BOOLEAN DEFAULT FALSE,
  error_msg    TEXT
);

CREATE INDEX IF NOT EXISTS ix_webhooks_processed ON webhooks_mp_log(processed);
CREATE INDEX IF NOT EXISTS ix_webhooks_resource  ON webhooks_mp_log(resource_id);
