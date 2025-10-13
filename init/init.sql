
-- Usuarios
CREATE TABLE usuarios (
  id_usuario     SERIAL PRIMARY KEY,
  apodo          VARCHAR(100) UNIQUE NOT NULL,
  nombre         VARCHAR(50)  NOT NULL,
  apellido       VARCHAR(50)  NOT NULL,
  email          VARCHAR(100) UNIQUE NOT NULL,
  contrasena     TEXT NOT NULL,
  avatar_url     TEXT,
  es_premium     BOOLEAN DEFAULT FALSE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  biografia      TEXT,
  pais           VARCHAR(50),
  cuenta_pago    TEXT,
  mp_user_id       TEXT,
  mp_access_token  TEXT,
  mp_refresh_token TEXT,
  mp_token_scopes  TEXT,
  mp_token_expira  TIMESTAMP,
  mp_public_key    TEXT
);

-- Categorías (los IDs de acá van en disenos.categoria)
CREATE TABLE categorias (
  id_categoria SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL UNIQUE,
  slug         TEXT NOT NULL UNIQUE,
  activa       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semilla de categorías 
INSERT INTO categorias (nombre, slug, activa) VALUES
('Figuras',                'figuras',                TRUE),
('Miniaturas',             'miniaturas',             TRUE),
('Juguetes y juegos',      'juguetes-juegos',        TRUE),
('Arte y esculturas',      'arte-esculturas',        TRUE),
('Decoración',             'decoracion',             TRUE),
('Hogar y organización',   'hogar-organizacion',     TRUE),
('Cocina',                 'cocina',                 TRUE),
('Jardín',                 'jardin',                 TRUE),
('Oficina',                'oficina',                TRUE),
('Moda y accesorios',      'moda-accesorios',        TRUE),
('Joyería',                'joyeria',                TRUE),
('Cosplay y props',        'cosplay-props',          TRUE),
('Piezas mecánicas',       'piezas-mecanicas',       TRUE),
('Repuestos y soportes',   'repuestos-soportes',     TRUE),
('Herramientas',           'herramientas',           TRUE),
('Gadgets',                'gadgets',                TRUE),
('Soportes para teléfono', 'soportes-telefono',      TRUE),
('Electrónica',            'electronica',            TRUE),
('RC / Drones',            'rc-drones',              TRUE),
('Automotor',              'automotor',              TRUE),
('Bicicletas',             'bicicletas',             TRUE),
('Deportes',               'deportes',               TRUE),
('Música',                 'musica',                 TRUE),
('Animales y mascotas',    'animales-mascotas',      TRUE),
('Educación',              'educacion',              TRUE),
('Ciencia',                'ciencia',                TRUE),
('Arquitectura',           'arquitectura',           TRUE),
('Iluminación',            'iluminacion',            TRUE),
('Navidad y fiestas',      'navidad-fiestas',        TRUE),
('Halloween',              'halloween',              TRUE),
('Litofanías',             'litofanias',             TRUE),
('Puzzle y rompecabezas',  'puzzles',                TRUE),
('Tableros y dados',       'tableros-dados',         TRUE)
ON CONFLICT DO NOTHING;



-- Diseños
CREATE TABLE disenos (
  id_diseno SERIAL PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  archivo_url TEXT NOT NULL,
  precio NUMERIC(10,2) DEFAULT 0.00,
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  categoria INTEGER REFERENCES categorias(id_categoria),
  etiqueta VARCHAR(100),
  parametros_fabricacion TEXT,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX idx_disenos_categoria ON disenos(categoria);
CREATE INDEX idx_disenos_usuario   ON disenos(id_usuario);

-- Likes
CREATE TABLE likes (
  id_like SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_diseno  INT NOT NULL REFERENCES disenos(id_diseno)  ON DELETE CASCADE,
  fecha_like TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Imágenes de diseño
CREATE TABLE imagenes_diseno (
  id_imagen    SERIAL PRIMARY KEY,
  id_diseno    INT  NOT NULL REFERENCES disenos(id_diseno) ON DELETE CASCADE,
  url_imagenes TEXT NOT NULL,
  public_id    TEXT NOT NULL,
  orden        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_imagenes_diseno_diseno ON imagenes_diseno(id_diseno);
CREATE INDEX idx_imagenes_diseno_orden  ON imagenes_diseno(id_diseno, orden);

-- Seguidores
CREATE TABLE seguidores (
  id_seguidor   SERIAL PRIMARY KEY,
  id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_seguido    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  fecha_seguido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_usuario, id_seguido)
);

-- Reseñas
CREATE TABLE resenas (
  id_resena     SERIAL PRIMARY KEY,
  id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_calificado INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  calificacion  NUMERIC(2,1) NOT NULL,
  fecha         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_usuario, id_calificado)
);

-- Carritos
CREATE TABLE carritos (
  id_carrito  SERIAL PRIMARY KEY,
  id_usuario  INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  creado_en   TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_usuario)
);

CREATE TABLE carrito_items (
  id_item     SERIAL PRIMARY KEY,
  id_carrito  INT NOT NULL REFERENCES carritos(id_carrito) ON DELETE CASCADE,
  id_diseno   INT NOT NULL REFERENCES disenos(id_diseno)  ON DELETE CASCADE,
  qty         INT NOT NULL CHECK (qty > 0),
  agregado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_carrito, id_diseno)
);
CREATE INDEX ix_carrito_items_carrito ON carrito_items(id_carrito);

-- Órdenes
CREATE TABLE ordenes_marketplace (
  id_orden       SERIAL PRIMARY KEY,
  id_usuario     INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  subtotal       NUMERIC(12,2) NOT NULL,
  fee_plataforma NUMERIC(12,2) NOT NULL DEFAULT 0,
  total          NUMERIC(12,2) NOT NULL,
  moneda         CHAR(3) NOT NULL DEFAULT 'ARS',
  estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','pagado','fallido','cancelado','refunded','parcial')),
  external_reference TEXT,
  creado_en      TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orden_items_marketplace (
  id_item       SERIAL PRIMARY KEY,
  id_orden      INT NOT NULL REFERENCES ordenes_marketplace(id_orden) ON DELETE CASCADE,
  id_diseno     INT NOT NULL REFERENCES disenos(id_diseno) ON DELETE RESTRICT,
  titulo        TEXT NOT NULL,
  precio_unit   NUMERIC(12,2) NOT NULL,
  qty           INT NOT NULL CHECK (qty > 0),
  subtotal_item NUMERIC(12,2) GENERATED ALWAYS AS (precio_unit * qty) STORED
);
CREATE INDEX ix_orden_items_orden  ON orden_items_marketplace(id_orden);
CREATE INDEX ix_orden_items_diseno ON orden_items_marketplace(id_diseno);

-- Pagos
CREATE TABLE pagos_marketplace (
  id_pago              SERIAL PRIMARY KEY,
  id_item              INT NOT NULL REFERENCES orden_items_marketplace(id_item) ON DELETE RESTRICT,
  preference_id        TEXT UNIQUE,
  init_point           TEXT,
  payment_id           TEXT UNIQUE,
  status               TEXT CHECK (status IN ('approved','pending','rejected','refunded','cancelled','in_process')),
  moneda               CHAR(3) DEFAULT 'ARS',
  monto_bruto          NUMERIC(12,2),
  fee_plataforma       NUMERIC(12,2),
  monto_neto_vendedor  NUMERIC(12,2),
  paid_at              TIMESTAMP,
  raw                  JSONB,
  creado_en            TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ix_pagos_item ON pagos_marketplace(id_item);
CREATE INDEX ix_pagos_stat ON pagos_marketplace(status);

-- OAuth usuarios
CREATE TABLE usuarios_oauth (
  id_usuario      INT PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  state_nonce     TEXT,
  last_auth_at    TIMESTAMP,
  last_refresh_at TIMESTAMP,
  scope           TEXT,
  extra           JSONB
);

-- Logs Webhooks MP
CREATE TABLE webhooks_mp_log (
  id_log      BIGSERIAL PRIMARY KEY,
  topic       TEXT,
  resource_id TEXT,
  query_raw   JSONB,
  body_raw    JSONB,
  received_at TIMESTAMP DEFAULT NOW(),
  processed   BOOLEAN DEFAULT FALSE,
  error_msg   TEXT
);
CREATE INDEX ix_webhooks_processed ON webhooks_mp_log(processed);
CREATE INDEX ix_webhooks_resource  ON webhooks_mp_log(resource_id);




# =============================================
# 1) SQL: Tablas para mensajería (PostgreSQL)
# =============================================
-- 01_mensajeria.sql


-- Conversaciones (threads)
CREATE TABLE IF NOT EXISTS conversaciones (
id_conversacion SERIAL PRIMARY KEY,
creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);


-- Participantes por conversación (2 o más)
CREATE TABLE IF NOT EXISTS conversacion_participantes (
id_conversacion INTEGER NOT NULL REFERENCES conversaciones(id_conversacion) ON DELETE CASCADE,
id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
ultimo_leido_id INTEGER, -- FK deferida a mensajes.id_mensaje
PRIMARY KEY (id_conversacion, id_usuario)
);


-- Mensajes
CREATE TABLE IF NOT EXISTS mensajes (
id_mensaje SERIAL PRIMARY KEY,
id_conversacion INTEGER NOT NULL REFERENCES conversaciones(id_conversacion) ON DELETE CASCADE,
id_remitente INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
cuerpo TEXT NOT NULL,
creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
editado_en TIMESTAMP,
borrado BOOLEAN NOT NULL DEFAULT FALSE
);


-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_fecha ON mensajes(id_conversacion, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes(id_remitente);


-- Trigger para actualizar "actualizado_en" de la conversación al llegar mensaje nuevo
CREATE OR REPLACE FUNCTION set_conversacion_actualizado_en() RETURNS TRIGGER AS $$
BEGIN
UPDATE conversaciones SET actualizado_en = NOW() WHERE id_conversacion = NEW.id_conversacion;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_conversacion_touch ON mensajes;
CREATE TRIGGER trg_conversacion_touch
AFTER INSERT OR UPDATE ON mensajes
FOR EACH ROW EXECUTE FUNCTION set_conversacion_actualizado_en();







-- compras del usuario
CREATE TABLE IF NOT EXISTS compras (
  id_compra       BIGSERIAL PRIMARY KEY,
  id_usuario      INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado          TEXT NOT NULL CHECK (estado IN ('paid','refunded','canceled')),
  fecha_compra    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ítems comprados (cada diseño dentro de una compra)
CREATE TABLE IF NOT EXISTS compra_items (
  id_item             BIGSERIAL PRIMARY KEY,
  id_compra           BIGINT NOT NULL REFERENCES compras(id_compra) ON DELETE CASCADE,
  id_diseno           INTEGER NOT NULL REFERENCES disenos(id_diseno) ON DELETE RESTRICT,
  titulo_cache        TEXT NOT NULL,
  precio_unitario     NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Para descargar de Cloudinary de manera segura:
  archivo_public_id   TEXT NOT NULL,   -- ej: "archivos_3d/usuarioX/mi_modelo_123"
  archivo_formato     TEXT NOT NULL,   -- ej: "stl" o "obj"
  portada_url         TEXT,            -- thumbnail/preview opcional
  UNIQUE(id_compra, id_diseno)
);

-- auditoría de descargas (sirve para limitar y mirar abuso)
CREATE TABLE IF NOT EXISTS descargas (
  id_descarga     BIGSERIAL PRIMARY KEY,
  id_item         BIGINT NOT NULL REFERENCES compra_items(id_item) ON DELETE CASCADE,
  fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
  ip              INET,
  user_agent      TEXT
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_compras_usuario ON compras(id_usuario);
CREATE INDEX IF NOT EXISTS idx_items_compra ON compra_items(id_compra);
CREATE INDEX IF NOT EXISTS idx_descargas_item ON descargas(id_item);