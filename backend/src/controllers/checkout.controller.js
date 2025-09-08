// src/controllers/checkout.controller.js
import pool from "../db.js";
import { groupBy } from "../utils/groupBy.js";
import { round2, toNumber } from "../utils/money.js";

// Si NO estás en Node 18+, descomenta esto:
// import fetch from "node-fetch";

const MP_API = "https://api.mercadopago.com";
const SITE_URL = process.env.SITE_URL || "http://localhost:5173";
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
    const { id_usuario } = req.user;

    // 1) Carrito e ítems
    const cartQ = await client.query(
      `SELECT c.id_carrito FROM carritos c WHERE c.id_usuario=$1`,
      [id_usuario]
    );
    if (cartQ.rowCount === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }
    const id_carrito = cartQ.rows[0].id_carrito;

    const itemsQ = await client.query(
      `SELECT d.id_diseno, d.titulo, d.precio, d.id_usuario AS id_creador, ci.qty
       FROM carrito_items ci
       JOIN disenos d ON d.id_diseno = ci.id_diseno
       WHERE ci.id_carrito=$1`,
      [id_carrito]
    );
    const items = itemsQ.rows || [];
    if (items.length === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }

    // 2) Totales (snapshot)
    const subtotal = round2(
      items.reduce((a, b) => a + toNumber(b.precio) * (b.qty || 1), 0)
    );
    const fee_plataforma = round2(subtotal * (FEE_PCT / 100));
    const total = subtotal;

    if (total <= 0) {
      return res
        .status(400)
        .json({ error: "Todos los ítems son gratuitos. No se requiere pago." });
    }

    // 3) Crear orden
    await client.query("BEGIN");
    began = true;

    const ordIns = await client.query(
      `INSERT INTO ordenes_marketplace (id_usuario, subtotal, fee_plataforma, total, estado, moneda)
       VALUES ($1,$2,$3,$4,'pendiente','ARS')
       RETURNING id_orden`,
      [id_usuario, subtotal, fee_plataforma, total]
    );
    const id_orden = ordIns.rows[0].id_orden;

    // 4) Snapshot de ítems + validación de vendedor
    const insertItemsSQL = `
      INSERT INTO orden_items_marketplace
      (id_orden, id_diseno, id_vendedor, titulo, precio_unit, qty)
      VALUES ($1,$2,$3,$4,$5,$6)
    `;

    for (const it of items) {
      const vendQ = await client.query(
        `SELECT id_vendedor, mp_access_token
         FROM vendedores
         WHERE id_usuario=$1 AND activo=TRUE`,
        [it.id_creador]
      );
      if (vendQ.rowCount === 0) {
        throw Object.assign(
          new Error(
            `Vendedor inactivo o inexistente para usuario ${it.id_creador}`
          ),
          { status: 400 }
        );
      }
      await client.query(insertItemsSQL, [
        id_orden,
        it.id_diseno,
        vendQ.rows[0].id_vendedor,
        it.titulo,
        toNumber(it.precio),
        it.qty || 1,
      ]);
    }

    // 5) Agrupar por vendedor y crear preferencias MP
    const ordItems = await client.query(
      `SELECT oi.*, v.mp_access_token
       FROM orden_items_marketplace oi
       JOIN vendedores v ON v.id_vendedor = oi.id_vendedor
       WHERE oi.id_orden=$1`,
      [id_orden]
    );

    const porVendedor = groupBy(ordItems.rows, (r) => r.id_vendedor);
    const respuestas = [];

    for (const [id_vendedor, lista] of Object.entries(porVendedor)) {
      const mp_access_token = lista[0].mp_access_token;
      if (!mp_access_token) {
        throw Object.assign(
          new Error(`Vendedor ${id_vendedor} sin access token MP`),
          { status: 400 }
        );
      }

      const monto_bruto = round2(
        lista.reduce(
          (a, b) => a + toNumber(b.precio_unit) * (b.qty || 1),
          0
        )
      );
      if (monto_bruto <= 0) continue;

      const fee = round2(monto_bruto * (FEE_PCT / 100));
      const neto = round2(monto_bruto - fee);

      const itemsMP = lista.map((li) => ({
        title: li.titulo,
        quantity: li.qty || 1,
        unit_price: Number(li.precio_unit),
        currency_id: "ARS",
      }));

      const external_reference = `${id_orden}:${id_vendedor}`;

      const prefPayload = {
        items: itemsMP,
        back_urls: {
          success: `${SITE_URL}/pago/ok?o=${id_orden}&v=${id_vendedor}`,
          failure: `${SITE_URL}/pago/error?o=${id_orden}&v=${id_vendedor}`,
          pending: `${SITE_URL}/pago/pendiente?o=${id_orden}&v=${id_vendedor}`,
        },
        auto_return: "approved",
        // Pasamos orden y vendedor para que el webhook concilie fácil
        notification_url: `${SITE_URL}/api/mp/webhook?v=${id_vendedor}&o=${id_orden}`,
        external_reference,
        marketplace_fee: fee, // 👈 comisión de la plataforma en ARS (15%)
        metadata: { id_orden, id_vendedor: Number(id_vendedor) },
        ...(SPONSOR_ID > 0 ? { sponsor_id: SPONSOR_ID } : {}),
      };

      let pref;
      try {
        pref = await mpCreatePreference(mp_access_token, prefPayload);
      } catch (e) {
        console.error("MercadoPago preference error:", e.message);
        throw Object.assign(new Error("Error creando preferencia de pago"), {
          status: 502,
          cause: e.message,
        });
      }

      const payIns = await client.query(
        `INSERT INTO pagos_marketplace
         (id_orden, id_vendedor, preference_id, init_point, status,
          monto_bruto, fee_plataforma, monto_neto_vendedor, moneda, external_reference)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,'ARS',$8)
         RETURNING id_pago`,
        [
          id_orden,
          id_vendedor,
          pref.id,
          pref.init_point,
          monto_bruto,
          fee,
          neto,
          external_reference,
        ]
      );

      respuestas.push({
        id_pago: payIns.rows[0].id_pago,
        id_vendedor: Number(id_vendedor),
        preference_id: pref.id,
        init_point: pref.init_point,
        monto_bruto,
        fee,
        neto,
      });
    }

    if (respuestas.length === 0) {
      throw Object.assign(
        new Error("Los ítems no requieren pago (monto total $0)."),
        { status: 400 }
      );
    }

    // 6) Vaciar carrito
    await client.query(
      `DELETE FROM carrito_items WHERE id_carrito=$1`,
      [id_carrito]
    );

    await client.query("COMMIT");
    return res
      .status(201)
      .json({ id_orden, links: respuestas, currency: "ARS" });
  } catch (err) {
    if (began) {
      try {
        await client.query("ROLLBACK");
      } catch {}
    }
    const code =
      err.status && Number.isInteger(err.status) ? err.status : 500;
    return res.status(code).json({
      error: err.status ? err.message : "No se pudo iniciar el checkout",
      detalle: err.cause || err.message,
    });
  } finally {
    client.release();
  }
};
