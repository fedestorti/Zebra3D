import pool from "../db.js";
import { groupBy } from "../utils/groupBy.js";
import { round2, toNumber } from "../utils/money.js";

const MP_API = "https://api.mercadopago.com";
const SITE_URL = process.env.SITE_URL || "https://tu-dominio";
const SPONSOR_ID = Number(process.env.MP_SPONSOR_ID || 0);
const FEE_PCT = Number(process.env.MKT_FEE_PCT || 15); // 15% por defecto

async function mpCreatePreference(accessToken, payload) {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MP ${res.status}: ${err}`);
  }
  return res.json();
}

export const createCheckout = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id_usuario } = req.user;

    // 1) Cargar items del carrito
    const cartQ = await client.query(
      `SELECT c.id_carrito FROM carritos c WHERE c.id_usuario=$1`, [id_usuario]
    );
    if (cartQ.rowCount === 0) return res.status(400).json({ error: "Carrito vacío" });

    const itemsQ = await client.query(
      `SELECT d.id_diseno, d.titulo, d.precio, d.id_usuario AS id_creador, ci.qty
       FROM carrito_items ci
       JOIN disenos d ON d.id_diseno = ci.id_diseno
       WHERE ci.id_carrito=$1`,
      [cartQ.rows[0].id_carrito]
    );
    const items = itemsQ.rows;
    if (items.length === 0) return res.status(400).json({ error: "Carrito vacío" });

    // 2) Snapshot y totales
    const subtotal = items.reduce((a, b) => a + toNumber(b.precio) * b.qty, 0);
    const fee_plataforma = round2(subtotal * (FEE_PCT / 100));
    const total = round2(subtotal);

    // 3) Crear orden Marketplace
    await client.query("BEGIN");
    const ordIns = await client.query(
      `INSERT INTO ordenes_marketplace (id_usuario, subtotal, fee_plataforma, total, estado, moneda)
       VALUES ($1,$2,$3,$4,'pendiente','ARS')
       RETURNING id_orden`,
      [id_usuario, subtotal, fee_plataforma, total]
    );
    const id_orden = ordIns.rows[0].id_orden;

    // 4) Insertar ítems snapshot
    const insertItemsSQL = `
      INSERT INTO orden_items_marketplace
      (id_orden, id_diseno, id_vendedor, titulo, precio_unit, qty)
      VALUES ($1,$2,$3,$4,$5,$6)
    `;
    for (const it of items) {
      // mapear id_creador -> id_vendedor
      const vendQ = await client.query(
        `SELECT id_vendedor, mp_access_token FROM vendedores WHERE id_usuario=$1 AND activo=TRUE`,
        [it.id_creador]
      );
      if (vendQ.rowCount === 0) throw new Error(`Vendedor inactivo o inexistente para usuario ${it.id_creador}`);

      await client.query(insertItemsSQL, [
        id_orden, it.id_diseno, vendQ.rows[0].id_vendedor, it.titulo, toNumber(it.precio), it.qty
      ]);
    }

    // 5) Agrupar por vendedor y crear preferences
    const ordItems = await client.query(
      `SELECT oi.*, v.mp_access_token
       FROM orden_items_marketplace oi
       JOIN vendedores v ON v.id_vendedor = oi.id_vendedor
       WHERE oi.id_orden=$1`,
      [id_orden]
    );

    const porVendedor = groupBy(ordItems.rows, r => r.id_vendedor);

    const respuestas = [];
    for (const [id_vendedor, lista] of Object.entries(porVendedor)) {
      const mp_access_token = lista[0].mp_access_token;
      if (!mp_access_token) throw new Error(`Vendedor ${id_vendedor} sin access token MP`);

      const monto_bruto = round2(lista.reduce((a, b) => a + toNumber(b.precio_unit) * b.qty, 0));
      const fee = round2(monto_bruto * (FEE_PCT / 100));
      const neto = round2(monto_bruto - fee);

      const itemsMP = lista.map(li => ({
        title: li.titulo,
        quantity: li.qty,
        unit_price: Number(li.precio_unit),
        currency_id: "ARS"
      }));

      const external_reference = `${id_orden}:${id_vendedor}`;

      const prefPayload = {
        items: itemsMP,
        back_urls: {
          success: `${SITE_URL}/pago/ok?o=${id_orden}&v=${id_vendedor}`,
          failure: `${SITE_URL}/pago/error?o=${id_orden}&v=${id_vendedor}`,
          pending: `${SITE_URL}/pago/pendiente?o=${id_orden}&v=${id_vendedor}`
        },
        auto_return: "approved",
        notification_url: `${SITE_URL}/api/mp/webhook`,
        external_reference,
        sponsor_id: SPONSOR_ID,
        metadata: { id_orden, id_vendedor }
      };

      const pref = await mpCreatePreference(mp_access_token, prefPayload);

      const payIns = await client.query(
        `INSERT INTO pagos_marketplace
         (id_orden, id_vendedor, preference_id, init_point, status, monto_bruto, fee_plataforma, monto_neto_vendedor, moneda, external_reference)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,'ARS',$8)
         RETURNING id_pago`,
        [id_orden, id_vendedor, pref.id, pref.init_point, monto_bruto, fee, neto, external_reference]
      );

      respuestas.push({
        id_pago: payIns.rows[0].id_pago,
        id_vendedor: Number(id_vendedor),
        preference_id: pref.id,
        init_point: pref.init_point,
        monto_bruto,
        fee,
        neto
      });
    }

    // 6) Vaciar carrito del usuario
    const id_carrito = cartQ.rows[0].id_carrito;
    await client.query(`DELETE FROM carrito_items WHERE id_carrito=$1`, [id_carrito]);

    await client.query("COMMIT");
    res.status(201).json({ id_orden, links: respuestas, currency: "ARS" });
  } catch (err) {
    try { await pool.query("ROLLBACK"); } catch {}
    next(err);
  } finally {
    client.release();
  }
};
