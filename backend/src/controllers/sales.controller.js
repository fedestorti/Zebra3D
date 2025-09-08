import pool from "../db.js";

function qp(req, name, def) {
  const v = Number(req.query[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

async function getMySellerId(id_usuario) {
  const q = await pool.query(
    `SELECT id_vendedor FROM vendedores WHERE id_usuario=$1 AND activo=TRUE`,
    [id_usuario]
  );
  return q.rowCount ? q.rows[0].id_vendedor : null;
}

// Métricas rápidas para el dashboard del vendedor
export async function getMySalesSummary(req, res, next) {
  try {
    const { id_usuario } = req.user;
    const id_vendedor = await getMySellerId(id_usuario);
    if (!id_vendedor) return res.status(403).json({ error: "No sos vendedor activo" });

    const days = Math.min(qp(req, "days", 30), 365);

    const q = await pool.query(
      `WITH r AS (
        SELECT *
        FROM pagos_marketplace
        WHERE id_vendedor=$1
          AND creado_en >= NOW() - INTERVAL '${days} days'
      )
      SELECT
        COUNT(*)                         AS pagos_total,
        COUNT(*) FILTER (WHERE status='approved') AS pagos_aprobados,
        COALESCE(SUM(monto_bruto), 0)    AS bruto_total,
        COALESCE(SUM(fee_plataforma), 0) AS fee_total,
        COALESCE(SUM(monto_neto_vendedor), 0) AS neto_total
      FROM r`,
      [id_vendedor]
    );

    res.json({ days, ...q.rows[0], id_vendedor });
  } catch (err) { next(err); }
}

// Lista de órdenes donde vendí algo (una fila por orden-vendedor)
export async function getMySalesOrders(req, res, next) {
  try {
    const { id_usuario } = req.user;
    const id_vendedor = await getMySellerId(id_usuario);
    if (!id_vendedor) return res.status(403).json({ error: "No sos vendedor activo" });

    const page = qp(req, "page", 1);
    const pageSize = Math.min(qp(req, "pageSize", 10), 100);
    const offset = (page - 1) * pageSize;

    const status = (req.query.status || "").toLowerCase();

    const wh = ["pm.id_vendedor = $1"];
    const vals = [id_vendedor];

    if (status) {
      wh.push("pm.status = $2");
      vals.push(status);
    }
    const whereSQL = `WHERE ${wh.join(" AND ")}`;

    const countSQL = `
      SELECT COUNT(*) AS total
      FROM pagos_marketplace pm
      ${whereSQL}
    `;
    const { rows: c } = await pool.query(countSQL, vals);
    const totalRows = Number(c[0].total || 0);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    const listSQL = `
      SELECT
        pm.id_pago, pm.id_orden, pm.status, pm.monto_bruto, pm.fee_plataforma, pm.monto_neto_vendedor,
        pm.moneda, pm.paid_at, pm.external_reference,
        o.id_usuario AS comprador_id, o.creado_en AS orden_fecha,
        -- items míos dentro de esa orden
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id_item', oi.id_item,
              'id_diseno', oi.id_diseno,
              'titulo', oi.titulo,
              'precio_unit', oi.precio_unit,
              'qty', oi.qty,
              'subtotal_item', (oi.precio_unit * oi.qty)
            )
          ) FILTER (WHERE oi.id_item IS NOT NULL),
          '[]'
        ) AS items
      FROM pagos_marketplace pm
      JOIN ordenes_marketplace o ON o.id_orden = pm.id_orden
      LEFT JOIN orden_items_marketplace oi
        ON oi.id_orden = pm.id_orden AND oi.id_vendedor = pm.id_vendedor
      ${whereSQL}
      GROUP BY pm.id_pago, o.id_usuario, o.creado_en
      ORDER BY pm.id_pago DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const { rows } = await pool.query(listSQL, vals);

    res.json({ page, pageSize, totalPages, totalRows, data: rows, id_vendedor });
  } catch (err) { next(err); }
}

// Detalle de una orden, pero el vendedor solo ve SUS items y SU pago
export async function getSellerOrderDetail(req, res, next) {
  try {
    const { id_usuario } = req.user;
    const id_vendedor = await getMySellerId(id_usuario);
    if (!id_vendedor) return res.status(403).json({ error: "No sos vendedor activo" });

    const id_orden = Number(req.params.id);

    // Pago del vendedor en esa orden
    const pagoQ = await pool.query(
      `SELECT *
       FROM pagos_marketplace
       WHERE id_orden=$1 AND id_vendedor=$2`,
      [id_orden, id_vendedor]
    );
    if (pagoQ.rowCount === 0) return res.status(404).json({ error: "No hay venta tuya en esta orden" });

    // Items del vendedor dentro de la orden
    const itemsQ = await pool.query(
      `SELECT id_item, id_diseno, titulo, precio_unit, qty,
              (precio_unit * qty) AS subtotal_item
       FROM orden_items_marketplace
       WHERE id_orden=$1 AND id_vendedor=$2
       ORDER BY id_item`,
      [id_orden, id_vendedor]
    );

    // Info básica de la orden (sin exponer datos de otros vendors)
    const ordenQ = await pool.query(
      `SELECT id_orden, id_usuario AS comprador_id, subtotal, total, moneda, estado, creado_en
       FROM ordenes_marketplace
       WHERE id_orden=$1`,
      [id_orden]
    );

    res.json({
      orden: ordenQ.rows[0],
      pago: pagoQ.rows[0],
      items: itemsQ.rows
    });
  } catch (err) { next(err); }
}
