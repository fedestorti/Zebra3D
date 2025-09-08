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


-- ////////////Servico de impresion 3D /////////////

-- 001_vendedores.sql
CREATE TABLE vendedores (
  id_vendedor        SERIAL PRIMARY KEY,
  id_usuario         INT NOT NULL
                      REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  cuit               TEXT NOT NULL,
  condicion_fiscal   TEXT NOT NULL
                      CHECK (condicion_fiscal IN (
                        'monotributo','responsable_inscripto','exento','consumidor_final'
                      )),
  mp_user_id         TEXT,          -- ID del seller en MP
  mp_access_token    TEXT,          -- guardalo cifrado a nivel app
  mp_refresh_token   TEXT,
  mp_token_scopes    TEXT,
  activo             BOOLEAN DEFAULT TRUE,
  creado_en          TIMESTAMP DEFAULT NOW(),
  actualizado_en     TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_usuario)
);

CREATE INDEX ix_vendedores_activo ON vendedores(activo);


-- 002_impresoras.sql
CREATE TABLE impresoras (
  id_impresora       SERIAL PRIMARY KEY,
  id_vendedor        INT NOT NULL
                      REFERENCES vendedores(id_vendedor) ON DELETE CASCADE,
  nombre_publico     TEXT NOT NULL,     -- "Prusa MK3S #1"
  tecnologia         TEXT NOT NULL,     -- FDM, SLA...
  materiales         TEXT[] NOT NULL,   -- ['PLA','PETG']
  volumen            TEXT,              -- "220x220x250"
  boquillas          TEXT[],            -- ['0.4','0.6']
  costo_hora         NUMERIC(12,2) NOT NULL,
  costo_envio_base   NUMERIC(12,2) DEFAULT 0,
  activo             BOOLEAN DEFAULT TRUE,
  creado_en          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_impresoras_vendedor ON impresoras(id_vendedor);
CREATE INDEX ix_impresoras_activo   ON impresoras(activo);


-- 003_precios_material.sql
CREATE TABLE precios_material (
  id_precio     SERIAL PRIMARY KEY,
  id_vendedor   INT NOT NULL
                 REFERENCES vendedores(id_vendedor) ON DELETE CASCADE,
  material      TEXT NOT NULL,         -- 'PLA', 'PETG', 'ABS', etc.
  costo_gramo   NUMERIC(12,2) NOT NULL,
  UNIQUE (id_vendedor, material)
);

CREATE INDEX ix_precios_vendedor ON precios_material(id_vendedor);


-- 004_ordenes_pagos.sql
CREATE TABLE ordenes_impresion (
  id_orden             SERIAL PRIMARY KEY,
  id_comprador         INT NOT NULL
                        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  id_vendedor          INT NOT NULL
                        REFERENCES vendedores(id_vendedor) ON DELETE RESTRICT,
  id_diseno            INT NULL
                        REFERENCES disenos(id_diseno) ON DELETE SET NULL, -- opcional si imprimen diseños de tu plataforma
  titulo               TEXT,
  gramos_estimados     NUMERIC(10,2) DEFAULT 0,
  horas_estimadas      NUMERIC(10,2) DEFAULT 0,
  posprocesado         NUMERIC(12,2) DEFAULT 0,
  urgencia_pct         NUMERIC(5,2)  DEFAULT 0,        -- 0..100
  envio                NUMERIC(12,2) DEFAULT 0,
  subtotal             NUMERIC(12,2),                  -- sin urgencia
  fee_plataforma_pct   NUMERIC(5,2)  DEFAULT 10,       -- tu comisión %
  total                NUMERIC(12,2),                  -- con urgencia + envío
  estado               TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN (
                          'pendiente','pagado','en_produccion','enviado','entregado','cancelado','reembolsado'
                        )),
  external_reference   TEXT,                            -- para atar con MP
  creado_en            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_ordenes_comprador ON ordenes_impresion(id_comprador);
CREATE INDEX ix_ordenes_vendedor  ON ordenes_impresion(id_vendedor);
CREATE INDEX ix_ordenes_estado    ON ordenes_impresion(estado);

-- 005_pagos_impresion.sql
CREATE TABLE pagos_impresion (
  id_pago              SERIAL PRIMARY KEY,
  id_orden             INT NOT NULL
                        REFERENCES ordenes_impresion(id_orden) ON DELETE CASCADE,
  proveedor            TEXT NOT NULL DEFAULT 'MP',
  external_payment_id  TEXT,                    -- id de pago/reportes MP
  status               TEXT                     -- approved/pending/rejected/refunded/cancelled/in_process
                        CHECK (status IN (
                          'approved','pending','rejected','refunded','cancelled','in_process'
                        )),
  paid_at              TIMESTAMP,
  raw                  JSONB,                   -- payload crudo del webhook
  creado_en            TIMESTAMP DEFAULT NOW(),
  UNIQUE (external_payment_id)                  -- evita duplicar por reintentos
);

CREATE INDEX ix_pagos_orden  ON pagos_impresion(id_orden);
CREATE INDEX ix_pagos_status ON pagos_impresion(status);


-- 006_vw_impresores_publicos.sql
CREATE OR REPLACE VIEW vw_impresores_publicos AS
SELECT
  i.id_impresora,
  v.id_vendedor,
  u.id_usuario,
  u.apodo,
  i.nombre_publico,
  i.tecnologia,
  i.materiales,
  i.volumen,
  i.boquillas,
  i.costo_hora
FROM impresoras i
JOIN vendedores v ON v.id_vendedor = i.id_vendedor AND v.activo = TRUE
JOIN usuarios  u ON u.id_usuario   = v.id_usuario
WHERE i.activo = TRUE
ORDER BY i.id_impresora DESC;


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
