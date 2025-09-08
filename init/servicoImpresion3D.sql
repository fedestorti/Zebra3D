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