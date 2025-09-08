import pool from "../db.js";

// Si NO estás en Node 18+, descomentá esto:
// import fetch from "node-fetch";

const MP_API = "https://api.mercadopago.com";

// Helper: GET /v1/payments/:id con el token del vendedor
async function mpGetPayment(accessToken, paymentId) {
  const r = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`MP ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

export const mpWebhook = async (req, res, next) => {
  // Respondé rápido para que MP no reintente infinitamente
  // (hacemos el trabajo y devolvemos 200)
  try {
    const topic = String(req.query.topic || req.body.type || "");
    // MP manda distintas formas: ?id=, body.data.id, o 'resource' con URL
    const rawId =
      req.query.id ||
      req.body?.data?.id ||
      (typeof req.body?.resource === "string"
        ? req.body.resource.split("/").pop()
        : undefined);

    // params que NOSOTROS agregamos en la preference (ver abajo)
    const id_vendedor = Number(req.query.v || req.query.vendedor || 0);
    const id_orden = Number(req.query.o || req.query.orden || 0);

    // guardá log crudo (mejor stringify por compatibilidad)
    await pool.query(
      `INSERT INTO webhooks_mp_log (topic, resource_id, query_raw, body_raw)
       VALUES ($1,$2,$3,$4)`,
      [topic, String(rawId || ""), JSON.stringify(req.query), JSON.stringify(req.body)]
    );

    // Si no hay id o no sabemos qué vendedor es, salimos OK (no reintentos)
    if (!rawId || !id_vendedor) {
      return res.status(200).json({ ok: true, note: "faltan id o vendedor" });
    }

    // Buscamos token del vendedor
    const vendQ = await pool.query(
      `SELECT mp_access_token FROM vendedores WHERE id_vendedor=$1 AND activo=TRUE`,
      [id_vendedor]
    );
    if (vendQ.rowCount === 0) {
      return res.status(200).json({ ok: true, note: "vendedor sin token" });
    }
    const mp_access_token = vendQ.rows[0].mp_access_token;

    // Solo procesamos payments (lo más útil). merchant_order se puede sumar igual si lo necesitás.
    const isPayment =
      topic === "payment" ||
      req.body?.action?.startsWith("payment.") ||
      req.body?.type === "payment";

    if (!isPayment) {
      // No es payment; lo registramos y salimos
      return res.status(200).json({ ok: true, note: "ignorado (no payment)" });
    }

    const payment_id = String(rawId);

    // Idempotencia: si ya lo guardamos, salimos
    const dup = await pool.query(
      `SELECT id_pago FROM pagos_marketplace WHERE payment_id=$1`,
      [payment_id]
    );
    if (dup.rowCount > 0) {
      return res.status(200).json({ ok: true, note: "ya procesado" });
    }

    // Consultamos el pago a MP con el token del vendedor
    const pagoMP = await mpGetPayment(mp_access_token, payment_id);
    const newStatus = pagoMP.status; // approved | rejected | pending | in_process | cancelled | etc
    const extRef = pagoMP.external_reference || "";
    // Si no vino id_orden por query, lo tomamos del external_reference "orden:vendedor"
    let ordenId = id_orden;
    if (!ordenId && extRef.includes(":")) {
      const [o] = extRef.split(":");
      ordenId = Number(o);
    }

    if (!ordenId) {
      // sin orden no podemos conciliar bien
      return res.status(200).json({ ok: true, note: "sin id_orden" });
    }

    // Actualizamos el registro del pago del grupo (uno por vendedor)
    await pool.query(
      `UPDATE pagos_marketplace
       SET payment_id = $1,
           status = $2,
           paid_at = CASE WHEN $2='approved' THEN NOW() ELSE paid_at END,
           raw = $3
       WHERE id_orden=$4 AND id_vendedor=$5`,
      [payment_id, newStatus, JSON.stringify(pagoMP), ordenId, id_vendedor]
    );

    // Recalcular estado de la orden (pagado/parcial/pendiente)
    const allQ = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status='approved') AS ok,
              COUNT(*) AS total
       FROM pagos_marketplace
       WHERE id_orden=$1`,
      [ordenId]
    );
    const ok = Number(allQ.rows[0].ok);
    const total = Number(allQ.rows[0].total);

    if (total > 0 && ok === total) {
      await pool.query(
        `UPDATE ordenes_marketplace SET estado='pagado', actualizado_en=NOW() WHERE id_orden=$1`,
        [ordenId]
      );
    } else if (ok > 0 && ok < total) {
      await pool.query(
        `UPDATE ordenes_marketplace SET estado='parcial', actualizado_en=NOW() WHERE id_orden=$1`,
        [ordenId]
      );
    } else {
      await pool.query(
        `UPDATE ordenes_marketplace SET estado='pendiente', actualizado_en=NOW() WHERE id_orden=$1`,
        [ordenId]
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    // NO devolver 500 a MP; registramos y devolvemos 200 para evitar reintentos eternos
    console.error("Webhook error:", err.message);
    try {
      await pool.query(
        `INSERT INTO webhooks_mp_log (topic, resource_id, query_raw, body_raw, error)
         VALUES ($1,$2,$3,$4,$5)`,
        ["exception", "", "{}", "{}", err.message]
      );
    } catch {}
    return res.status(200).json({ ok: true, note: "logged" });
  }
};
