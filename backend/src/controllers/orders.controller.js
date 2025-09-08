import pool from "../db.js";

// helper simple para paginar
function qp(req, name, def) {
  const v = Number(req.query[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

export async function getMyOrders(req, res, next) {
  try {
    const { id_usuario } = req.user;
    const page = qp(req, "page", 1);
    const pageSize = Math.min(qp(req, "pageSize", 10), 100);
    const offset = (page - 1) * pageSize;

    const status = (req.query.status || "").toLowerCase();
    const search = (req.query.search || "").trim();

    // Filtro SQL dinámico
    const wh = ["o.id_usuario = $1"];
    const vals = [id_usuario];

    if (status) {
      wh.push("o.estado = $2");
      vals.push(status);
    }

    // Búsqueda por título de ítems
    let searchJoin = "";
    if (search) {
      searchJoin = "JOIN orden_items_marketplace oi2 ON oi2.id_orden = o.id_orden";
      wh.push(`(oi2.titulo ILIKE $${vals.length + 1})`);
      vals.push(`%${search}%`);
    }

    const whereSQL = wh.length ? `WHERE ${wh.join(" AND ")}` : "";

    const countSQL = `
      SELECT COUNT(DISTINCT o.id_orden) AS total
      FROM ordenes_marketplace o
      ${searchJoin}
      ${whereSQL}
    `;
    const { rows: c } = await pool.query(countSQL, vals);
    const totalRows = Number(c[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    const listSQL = `
      SELECT
        o.id_orden, o.subtotal, o.fee_plataforma, o.total, o.moneda,
        o.estado, o.creado_en,
        -- pagos agregados
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id_vendedor', pm.id_vendedor,
          'status', pm.status,
          'monto_bruto', pm.monto_bruto,
          'fee_plataforma', pm.fee_plataforma,
          'neto', pm.monto_neto_vendedor
        )) FILTER (WHERE pm.id_pago IS NOT NULL), '[]') AS pagos
      FROM ordenes_marketplace o
      LEFT JOIN pagos_marketplace pm ON pm.id_orden = o.id_orden
      ${searchJoin}
      ${whereSQL}
      GROUP BY o.id_orden
      ORDER BY o.id_orden DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const { rows } = await pool.query(listSQL, vals);

    res.json({
      page, pageSize, totalPages, totalRows,
      data: rows
    });
  } catch (err) { next(err); }
}

export async function getOrderDetail(req, res, next) {
  try {
    const { id_usuario } = req.user;
    const id = Number(req.params.id);

    // Verifica propiedad de la orden
    const o = await pool.query(
      `SELECT * FROM ordenes_marketplace WHERE id_orden=$1 AND id_usuario=$2`,
      [id, id_usuario]
    );
    if (o.rowCount === 0) return res.status(404).json({ error: "Orden no encontrada" });

    const itemsQ = await pool.query(
      `SELECT
         oi.id_item, oi.id_diseno, oi.id_vendedor, oi.titulo, oi.precio_unit, oi.qty,
         (oi.precio_unit * oi.qty) AS subtotal_item
       FROM orden_items_marketplace oi
       WHERE oi.id_orden=$1
       ORDER BY oi.id_item`,
      [id]
    );

    const pagosQ = await pool.query(
      `SELECT id_pago, id_vendedor, preference_id, init_point, payment_id,
              status, monto_bruto, fee_plataforma, monto_neto_vendedor, moneda,
              external_reference, paid_at
       FROM pagos_marketplace
       WHERE id_orden=$1
       ORDER BY id_pago`,
      [id]
    );

    res.json({
      ...o.rows[0],
      items: itemsQ.rows,
      pagos: pagosQ.rows
    });
  } catch (err) { next(err); }
}
