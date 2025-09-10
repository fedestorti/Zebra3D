// src/controllers/checkout.controller.js
import pool from "../db.js";
import { round2, toNumber } from "../utils/money.js";

const MP_API = "https://api.mercadopago.com";
const SITE_URL = process.env.SITE_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const SPONSOR_ID = Number(process.env.MP_SPONSOR_ID || 0);
const FEE_PCT = Number(process.env.MKT_FEE_PCT || 15); // 15% por defecto

async function mpCreatePreference(accessToken, payload) {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP ${res.status}: ${text}`);
  }
  return res.json();
}

export const createCheckout = async (req, res) => {
  const client = await pool.connect();
  let began = false;

  try {
    const comprador_id = req?.user?.id_usuario;
    if (!comprador_id) {
      return res.status(401).json({ error: "Token inválido o faltante" });
    }

    // 1) Carrito e ítems
    const cartQ = await client.query(
      `SELECT c.id_carrito FROM carritos c WHERE c.id_usuario = $1`,
      [comprador_id]
    );
    if (cartQ.rowCount === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }
    const id_carrito = cartQ.rows[0].id_carrito;

    const itemsQ = await client.query(
      `SELECT
         d.id_diseno,
         d.titulo,
         d.precio,
         d.id_usuario  AS autor_id,
         u.apodo       AS autor_apodo,
         u.mp_access_token,
         u.mp_user_id,
         ci.qty
       FROM carrito_items ci
       JOIN disenos d   ON d.id_diseno = ci.id_diseno
       JOIN usuarios u  ON u.id_usuario = d.id_usuario
       WHERE ci.id_carrito = $1`,
      [id_carrito]
    );
    const items = itemsQ.rows || [];
    if (items.length === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }

    // 2) Validaciones previas
    const sinMP = items
      .filter(r => !r.mp_access_token)
      .map(r => ({ id_diseno: r.id_diseno, autor_id: r.autor_id, autor_apodo: r.autor_apodo }));
    if (sinMP.length) {
      return res.status(400).json({
        error: "Hay autores sin credenciales de Mercado Pago",
        faltantes: sinMP
      });
    }

    // 3) Totales (snapshot orden)
    const subtotal = round2(items.reduce((a, b) => a + toNumber(b.precio) * (b.qty || 1), 0));
    const fee_plataforma = round2(subtotal * (FEE_PCT / 100));
    const total = subtotal; // tu fee lo cobrás vía marketplace_fee por ítem

    if (total <= 0) {
      return res.status(400).json({ error: "Todos los ítems son gratuitos. No se requiere pago." });
    }

    // 4) Crear orden
    await client.query("BEGIN");
    began = true;

    const ordIns = await client.query(
      `INSERT INTO ordenes_marketplace (id_usuario, subtotal, fee_plataforma, total, estado, moneda)
       VALUES ($1,$2,$3,$4,'pendiente','ARS')
       RETURNING id_orden`,
      [comprador_id, subtotal, fee_plataforma, total]
    );
    const id_orden = ordIns.rows[0].id_orden;

    // 5) Snapshot de ítems
    const inserted = [];
    for (const it of items) {
      const r = await client.query(
        `INSERT INTO orden_items_marketplace (id_orden, id_diseno, titulo, precio_unit, qty)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id_item`,
        [id_orden, it.id_diseno, it.titulo, toNumber(it.precio), it.qty || 1]
      );
      inserted.push({
        id_item: r.rows[0].id_item,
        id_diseno: it.id_diseno,
        titulo: it.titulo,
        precio_unit: toNumber(it.precio),
        qty: it.qty || 1,
        autor_id: it.autor_id,
        autor_apodo: it.autor_apodo,
        mp_access_token: it.mp_access_token
      });
    }

    // 6) Crear preferencias MP por ÍTEM y registrar en pagos_marketplace (id_item)
    const back_urls_base = {
      success: `${SITE_URL}/pago/ok`,
      failure: `${SITE_URL}/pago/error`,
      pending: `${SITE_URL}/pago/pendiente`,
    };

    const respuestas = [];

    for (const li of inserted) {
      const monto_bruto = round2(li.precio_unit * li.qty);
      if (monto_bruto <= 0) continue;

      const fee = round2(monto_bruto * (FEE_PCT / 100));
      const neto = round2(monto_bruto - fee);

      const external_reference = `${id_orden}:${li.id_item}:${comprador_id}`;

      const prefPayload = {
        items: [
          {
            title: li.titulo,
            quantity: li.qty,
            unit_price: Number(li.precio_unit),
            currency_id: "ARS",
          },
        ],
        back_urls: {
          success: `${back_urls_base.success}?o=${id_orden}&i=${li.id_item}`,
          failure: `${back_urls_base.failure}?o=${id_orden}&i=${li.id_item}`,
          pending: `${back_urls_base.pending}?o=${id_orden}&i=${li.id_item}`,
        },
        auto_return: "approved",
        notification_url: `${BACKEND_URL}/api/mp/webhook?o=${id_orden}&i=${li.id_item}`,
        external_reference,
        marketplace_fee: fee,
        metadata: { id_orden, id_item: li.id_item, autor_id: li.autor_id },
        ...(SPONSOR_ID > 0 ? { sponsor_id: SPONSOR_ID } : {}),
      };

      let pref;
      try {
        pref = await mpCreatePreference(li.mp_access_token, prefPayload);
      } catch (e) {
        console.error("MercadoPago preference error:", e.message);
        throw Object.assign(new Error("Error creando preferencia de pago"), {
          status: 502,
          cause: e.message,
        });
      }

      const payIns = await client.query(
        `INSERT INTO pagos_marketplace
           (id_item, preference_id, init_point, status,
            moneda, monto_bruto, fee_plataforma, monto_neto_vendedor, raw)
         VALUES ($1,$2,$3,'pending','ARS',$4,$5,$6,NULL)
         RETURNING id_pago`,
        [li.id_item, pref.id, pref.init_point, monto_bruto, fee, neto]
      );

      respuestas.push({
        id_pago: payIns.rows[0].id_pago,
        id_item: li.id_item,
        preference_id: pref.id,
        init_point: pref.init_point,
        monto_bruto,
        fee,
        neto,
      });
    }

    if (respuestas.length === 0) {
      throw Object.assign(new Error("Los ítems no requieren pago (monto total $0)."), { status: 400 });
    }

    // 7) Vaciar carrito
    await client.query(`DELETE FROM carrito_items WHERE id_carrito = $1`, [id_carrito]);

    await client.query("COMMIT");
    return res.status(201).json({ id_orden, links: respuestas, currency: "ARS" });
  } catch (err) {
    if (began) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    const code = err.status && Number.isInteger(err.status) ? err.status : 500;
    return res.status(code).json({
      error: err.status ? err.message : "No se pudo iniciar el checkout",
      detalle: err.cause || err.message,
    });
  } finally {
    client.release();
  }
};
