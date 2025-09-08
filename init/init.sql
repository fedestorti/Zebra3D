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

-- Tabla de Imagenes de diseños
CREATE TABLE IF NOT EXISTS imagenes_diseno (
    id_imagen SERIAL PRIMARY KEY,
    id_diseno INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE CASCADE,
    url_imagenes TEXT NOT NULL,
    public_id TEXT NOT NULL, -- 👈 clave en Cloudinary para poder borrar
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





-- 🛒 Carritos
CREATE TABLE IF NOT EXISTS carritos (
  id_carrito SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  creado_en  TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_usuario)  -- un carrito activo por usuario
);

CREATE TABLE carrito_items (
  id_item     SERIAL PRIMARY KEY,
  id_carrito  INT NOT NULL REFERENCES carritos(id_carrito) ON DELETE CASCADE,
  id_diseno   INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE CASCADE,
  qty         INT NOT NULL CHECK (qty > 0),
  agregado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_carrito, id_diseno)
);

CREATE INDEX ix_carrito_items_carrito ON carrito_items(id_carrito);


-- 🧾 Orden digital (marketplace)
CREATE TABLE IF NOT EXISTS ordenes_marketplace (
  id_orden       SERIAL PRIMARY KEY,
  id_usuario     INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  subtotal       NUMERIC(12,2) NOT NULL,
  fee_plataforma NUMERIC(12,2) NOT NULL DEFAULT 0,  -- suma de todas las commissions
  total          NUMERIC(12,2) NOT NULL,
  moneda         CHAR(3) NOT NULL DEFAULT 'ARS',
  estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','pagado','fallido','cancelado','refunded','parcial')),
  external_reference TEXT,          -- para atar con MP (orden global)
  creado_en      TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Ítems de la orden con snapshot de precio
CREATE TABLE IF NOT EXISTS orden_items_marketplace (
  id_item       SERIAL PRIMARY KEY,
  id_orden      INT NOT NULL REFERENCES ordenes_marketplace(id_orden) ON DELETE CASCADE,
  id_diseno     INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE RESTRICT,
  id_vendedor   INT NOT NULL REFERENCES vendedores(id_vendedor) ON DELETE RESTRICT,
  titulo        TEXT NOT NULL,
  precio_unit   NUMERIC(12,2) NOT NULL,
  qty           INT NOT NULL CHECK (qty > 0),
  subtotal_item NUMERIC(12,2) GENERATED ALWAYS AS (precio_unit * qty) STORED
);

CREATE INDEX ix_orden_items_orden ON orden_items_marketplace(id_orden);
CREATE INDEX ix_orden_items_vend  ON orden_items_marketplace(id_vendedor);

-- 💳 Pagos por vendedor dentro de una orden marketplace
CREATE TABLE IF NOT EXISTS pagos_marketplace (
  id_pago              SERIAL PRIMARY KEY,
  id_orden             INT NOT NULL REFERENCES ordenes_marketplace(id_orden) ON DELETE CASCADE,
  id_vendedor          INT NOT NULL REFERENCES vendedores(id_vendedor) ON DELETE RESTRICT,
  preference_id        TEXT,         -- MP preference (Checkout Pro) creada a nombre del vendedor
  init_point           TEXT,         -- link de pago
  payment_id           TEXT,         -- MP payment ID cuando se aprueba
  status               TEXT          -- approved/pending/rejected/refunded/cancelled/in_process
                    CHECK (status IN ('approved','pending','rejected','refunded','cancelled','in_process')),
  monto_bruto         NUMERIC(12,2), -- suma de sus ítems
  fee_plataforma      NUMERIC(12,2), -- tu comisión aplicada a este subpago
  monto_neto_vendedor NUMERIC(12,2), -- lo que le queda al vendedor
  moneda              CHAR(3) DEFAULT 'ARS',
  external_reference  TEXT,          -- `${id_orden}:${id_vendedor}`
  paid_at             TIMESTAMP,
  raw                 JSONB,         -- payload crudo último (opcional)
  creado_en           TIMESTAMP DEFAULT NOW(),
  UNIQUE (payment_id),
  UNIQUE (preference_id)
);

CREATE INDEX ix_pagos_market_orden ON pagos_marketplace(id_orden);
CREATE INDEX ix_pagos_market_vend  ON pagos_marketplace(id_vendedor);
CREATE INDEX ix_pagos_market_stat  ON pagos_marketplace(status);


-- 🔐 Estado de OAuth (opcional pero sano)
CREATE TABLE IF NOT EXISTS vendedores_oauth (
  id_vendedor    INT PRIMARY KEY REFERENCES vendedores(id_vendedor) ON DELETE CASCADE,
  state_nonce    TEXT,         -- para validar callback
  last_auth_at   TIMESTAMP,
  last_refresh_at TIMESTAMP,
  scope          TEXT,
  extra          JSONB
);

-- 🛰️ Log de webhooks (idempotencia y trazabilidad)
CREATE TABLE IF NOT EXISTS webhooks_mp_log (
  id_log       BIGSERIAL PRIMARY KEY,
  topic        TEXT,            -- payment, merchant_order, etc.
  resource_id  TEXT,
  query_raw    JSONB,
  body_raw     JSONB,
  received_at  TIMESTAMP DEFAULT NOW(),
  processed    BOOLEAN DEFAULT FALSE,
  error_msg    TEXT
);

CREATE INDEX ix_webhooks_processed ON webhooks_mp_log(processed);
CREATE INDEX ix_webhooks_resource  ON webhooks_mp_log(resource_id);
