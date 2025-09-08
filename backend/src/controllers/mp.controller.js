import pool from "../db.js";

export const mpWebhook = async (req, res, next) => {
  try {
    const topic = req.query.topic || req.body.type || "";
    const resource_id = req.query.id || req.body.data?.id || req.body?.resource || "";

    // guardá log crudo
    await pool.query(
      `INSERT INTO webhooks_mp_log (topic, resource_id, query_raw, body_raw)
       VALUES ($1,$2,$3,$4)`,
      [topic, String(resource_id), req.query, req.body]
    );

    // Solo nos interesa payment aprobado/cambios
    if (!resource_id) return res.status(200).json({ ok: true });

    // MP no te manda el access_token del vendedor. Necesitás:
    // 1) Buscar el pago por preference_id o external_reference que ya guardaste.
    // Para simplificar: si el body trae 'data.id' es payment_id.
    const payment_id = String(resource_id);

    // Evitar duplicados por unique(payment_id)
    const ya = await pool.query(
      `SELECT id_pago, id_orden, id_vendedor FROM pagos_marketplace WHERE payment_id=$1`,
      [payment_id]
    );
    if (ya.rowCount > 0) return res.status(200).json({ ok: true });

    // Consulta del pago: si necesitás detalles finos, podrías tener un token “técnico”
    // Pero la conciliación base la resolvemos con external_reference que viene en el merchant_order/pagos.
    // Como atajo, intentemos mapear por preference: buscamos preferencia desde merchant_order si llega.
    // Para operación robusta, implementá consulta /merchant_orders/{id} o /payments/{id} con el token del vendedor.

    // Minimalista: si llegó `data.id` como payment_id y el body trae `data` extendido:
    const status = req.body?.data?.status || req.body?.action === "payment.created" ? "pending" : undefined;

    // Plan B: si te llega `resource` con URL completa, podés evitar aquí; pero sin token del seller no se puede fetch.
    // Entonces confiamos en que al menos venga `external_reference` en el webhook extendido (depende de configuración).
    const external_reference = req.body?.data?.external_reference || req.body?.external_reference;

    if (!external_reference) {
      // No tenemos cómo actualizar. Marcamos log y salimos 200 para que MP no reintente infinito.
      return res.status(200).json({ ok: true, note: "sin external_reference" });
    }

    const [id_orden_str, id_vendedor_str] = String(external_reference).split(":");
    const id_orden = Number(id_orden_str);
    const id_vendedor = Number(id_vendedor_str);

    // Actualizamos el pago según lo que tengamos
    const pagoQ = await pool.query(
      `SELECT id_pago, status FROM pagos_marketplace
       WHERE id_orden=$1 AND id_vendedor=$2`,
      [id_orden, id_vendedor]
    );
    if (pagoQ.rowCount === 0) return res.status(200).json({ ok: true });

    const nuevoStatus = req.body?.data?.status || "approved"; // por defecto marcamos approved si vino success
    const paidAt = nuevoStatus === "approved" ? new Date() : null;

    await pool.query(
      `UPDATE pagos_marketplace
       SET payment_id = COALESCE($1, payment_id),
           status = $2,
           paid_at = COALESCE($3, paid_at),
           raw = $4
       WHERE id_orden=$5 AND id_vendedor=$6`,
      [payment_id, nuevoStatus, paidAt, req.body, id_orden, id_vendedor]
    );

    // Si todos los pagos de la orden están approved, cerramos la orden
    const allQ = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status='approved') AS ok,
              COUNT(*) AS total
       FROM pagos_marketplace WHERE id_orden=$1`,
      [id_orden]
    );
    const ok = Number(allQ.rows[0].ok);
    const total = Number(allQ.rows[0].total);
    if (total > 0 && ok === total) {
      await pool.query(
        `UPDATE ordenes_marketplace SET estado='pagado', actualizado_en=NOW() WHERE id_orden=$1`,
        [id_orden]
      );
    } else if (ok > 0 && ok < total) {
      await pool.query(
        `UPDATE ordenes_marketplace SET estado='parcial', actualizado_en=NOW() WHERE id_orden=$1`,
        [id_orden]
      );
    }

    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};
