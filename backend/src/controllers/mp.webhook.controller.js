// src/controllers/mp.webhook.controller.js
import pool from "../db.js";

const MP_API = "https://api.mercadopago.com";
const APP_TOKEN = process.env.MP_APP_ACCESS_TOKEN;

// Helpers simples
async function mpGet(path) {
  const res = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${APP_TOKEN}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MP GET ${path} -> ${res.status}: ${t}`);
  }
  return res.json();
}

export async function webhookMP(req, res) {
  try {
    // MP puede mandar info en query y/o body, soportá ambas
    const topic = req.query.topic || req.body?.type || req.body?.topic;
    const id = req.query.id || req.body?.data?.id || req.body?.resource?.id;

    // Parámetros de referencia para tu lógica
    const id_orden = Number(req.query.o || req.body?.o);
    const id_item = Number(req.query.i || req.body?.i);

    if (!topic || !id) {
      return res.status(200).send("ping");
    }

    // Obtenemos la entidad
    let payment = null;
    if (topic === "payment") {
      payment = await mpGet(`/v1/payments/${id}`);
    } else if (topic === "merchant_order") {
      const mo = await mpGet(`/merchant_orders/${id}`);
      // Podrías mapear mo.payments[0] si querés, pero con "payment" alcanza.
    } else {
      // tipos varios: plan, subscription, etc.
      return res.status(200).send("ignored");
    }

    if (!payment) return res.status(200).send("no-payment");

    const status = payment.status; // approved, pending, rejected
    const preference_id = payment.preference_id;

    // Actualizar pago por preference_id e id_item
    // Nota: si preferís, guardá payment_id cuando lo tengas.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const payQ = await client.query(
        `UPDATE pagos_marketplace
           SET status = $1,
               raw = $2
         WHERE preference_id = $3
           AND id_item = $4
         RETURNING id_item`,
        [status, payment, preference_id, id_item]
      );

      if (payQ.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(200).send("no-match");
      }

      // Si el ítem aprobado, marcamos el item como pagado, y si todos, cerramos orden
      if (status === "approved") {
        // marcá el item pagado en tu tabla si la tenés (opcional)
        // Ahora chequeamos si todos los items de la orden están aprobados:
        const allQ = await client.query(
          `SELECT COUNT(*) FILTER (WHERE p.status <> 'approved') AS pendientes
             FROM pagos_marketplace p
             JOIN orden_items_marketplace oi ON oi.id_item = p.id_item
            WHERE oi.id_orden = $1`,
          [id_orden]
        );
        const pendientes = Number(allQ.rows[0].pendientes || 0);

        if (pendientes === 0) {
          await client.query(
            `UPDATE ordenes_marketplace SET estado = 'aprobada' WHERE id_orden = $1`,
            [id_orden]
          );
        } else {
          await client.query(
            `UPDATE ordenes_marketplace SET estado = 'parcial' WHERE id_orden = $1 AND estado = 'pendiente'`,
            [id_orden]
          );
        }
      } else if (status === "rejected") {
        await client.query(
          `UPDATE ordenes_marketplace SET estado = 'rechazada' WHERE id_orden = $1 AND estado = 'pendiente'`,
          [id_orden]
        );
      }

      await client.query("COMMIT");
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      client.release();
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("webhookMP", err);
    // Respondé 200 igual para que MP no reintente eternamente si tu error es interno
    return res.status(200).send("err");
  }
}
