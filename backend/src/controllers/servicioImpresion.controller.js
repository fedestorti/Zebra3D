// src/controllers/servicioImpresion.controller.js
import pool from "../db.js";
import { MP_CLIENT_ID, MP_CLIENT_SECRET, MP_REDIRECT_URI, WEB_URL } from "../config.js";

/* ===========================
   Vendedores
=========================== */
export async function getMiVendedor(req, res) {
  const { id_usuario } = req.usuario;
  const { rows } = await pool.query(
    "SELECT id_vendedor, id_usuario, cuit, condicion_fiscal, mp_user_id FROM vendedores WHERE id_usuario = $1",
    [id_usuario]
  );
  return res.json(rows[0] || null);
}

export async function upsertVendedor(req, res) {
  const { id_usuario } = req.usuario;
  const { cuit, condicion_fiscal } = req.body;

  const q = `
    INSERT INTO vendedores (id_usuario, cuit, condicion_fiscal)
    VALUES ($1,$2,$3)
    ON CONFLICT (id_usuario) DO UPDATE
      SET cuit = EXCLUDED.cuit, condicion_fiscal = EXCLUDED.condicion_fiscal
    RETURNING id_vendedor, id_usuario, cuit, condicion_fiscal, mp_user_id;
  `;
  const { rows } = await pool.query(q, [id_usuario, cuit, condicion_fiscal]);
  return res.json(rows[0]);
}

/* ===========================
   Mercado Pago OAuth
=========================== */
export async function mpOAuthStart(req, res) {
  const { id_usuario } = req.usuario;
  const state = Buffer.from(JSON.stringify({ u: id_usuario, t: Date.now() })).toString("base64url");

  const authUrl = "https://auth.mercadopago.com/authorization"
    + `?client_id=${encodeURIComponent(process.env.MP_CLIENT_ID || "")}`
    + `&response_type=code&platform_id=mp`
    + `&redirect_uri=${encodeURIComponent(process.env.MP_REDIRECT_URI || "")}`
    + `&state=${encodeURIComponent(state)}`;

  console.log("🟦 MP authUrl:", authUrl); // 👈 revisá que NO tenga undefined
  res.json({ auth_url: authUrl });
}

export async function mpOAuthCallback(req, res) {
  console.log("🟨 MP callback query:", req.query); // 👈 acá puede venir { error, error_description }

  const { error, error_description, code, state } = req.query;
  const FRONT = process.env.WEB_URL || "http://localhost:5173";

  if (error) {
    console.error("🟥 MP authorize error:", error, "-", error_description || "(sin descripción)");
    return res.redirect(`${FRONT}/servicio-impresion?mp=err&msg=${encodeURIComponent(error_description || error)}`);
  }
  if (!code) {
    console.error("🟥 MP callback sin 'code'");
    return res.redirect(`${FRONT}/servicio-impresion?mp=err&msg=sin_code`);
  }

  let id_usuario;
  try { id_usuario = JSON.parse(Buffer.from(String(state||""), "base64url").toString("utf8"))?.u; } catch {}
  console.log("state->id_usuario:", id_usuario);
  if (!id_usuario) {
    console.error("🟥 State inválido, no hay id_usuario");
    return res.redirect(`${FRONT}/servicio-impresion?mp=err&msg=state_invalido`);
  }

  // Intercambio de code -> token
  const body = {
    grant_type: "authorization_code",
    client_id: process.env.MP_CLIENT_ID,
    client_secret: process.env.MP_CLIENT_SECRET,
    code,
    redirect_uri: process.env.MP_REDIRECT_URI
  };

  let tokenRes;
  try {
    tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(body)
    });
  } catch (netErr) {
    console.error("🟥 MP token network error:", netErr);
    return res.redirect(`${FRONT}/servicio-impresion?mp=err&msg=network_error`);
  }

  if (!tokenRes.ok) {
    let payload; try { payload = await tokenRes.json(); } catch { payload = await tokenRes.text(); }
    console.error("🟥 MP token error:", tokenRes.status, payload); // 👈 acá te dice redirect_uri_mismatch / invalid_client / invalid_grant
    const msg = typeof payload === "string" ? payload : (payload?.message || payload?.error_description || JSON.stringify(payload));
    return res.redirect(`${FRONT}/servicio-impresion?mp=err&msg=${encodeURIComponent(msg)}`);
  }

  const tok = await tokenRes.json();
  console.log("🟩 MP token ok. user_id:", tok.user_id);

  // Guardar en DB (mp_user_id/tokens). Logueá rows afectadas por sanidad:
  const upd = await pool.query(
    `UPDATE vendedores
       SET mp_user_id=$1, mp_access_token=$2, mp_refresh_token=$3, mp_token_scopes=$4, actualizado_en=NOW()
     WHERE id_usuario=$5`,
    [tok.user_id?.toString?.() || null, tok.access_token || null, tok.refresh_token || null, (tok.scope||tok.scopes||"").toString(), id_usuario]
  );
  console.log("UPDATE vendedores rowCount:", upd.rowCount);

  return res.redirect(`${FRONT}/servicio-impresion?mp=ok`);
}

/* ===========================
   Impresoras
=========================== */
export async function crearImpresora(req, res) {
  const { id_usuario } = req.usuario;

  const vend = await pool.query(
    "SELECT id_vendedor FROM vendedores WHERE id_usuario = $1",
    [id_usuario]
  );
  if (vend.rowCount === 0) return res.status(400).json({ error: "no_sos_vendedor" });

  const id_vendedor = vend.rows[0].id_vendedor;
  const { nombre_publico, tecnologia, materiales, volumen, boquillas, costo_hora, costo_envio_base } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO impresoras
      (id_vendedor, nombre_publico, tecnologia, materiales, volumen, boquillas, costo_hora, costo_envio_base)
     VALUES
      ($1,$2,$3, string_to_array($4, ','), $5, string_to_array($6, ','), $7, $8)
     RETURNING *`,
    [id_vendedor, nombre_publico, tecnologia, materiales, volumen, boquillas, costo_hora, costo_envio_base]
  );
  return res.json(rows[0]);
}

export async function listarImpresorasPublicas(_req, res) {
  const { rows } = await pool.query(
    `SELECT i.id_impresora, i.nombre_publico, i.tecnologia, i.materiales, i.volumen, i.boquillas, i.costo_hora,
            v.id_vendedor
     FROM impresoras i
     JOIN vendedores v ON v.id_vendedor = i.id_vendedor
     WHERE i.activo = TRUE AND v.activo = TRUE
     ORDER BY i.id_impresora DESC`
  );
  return res.json(rows);
}

/* ===========================
   Stubs
=========================== */
export async function cotizarOrden(_req, res) { return res.status(501).json({ error: "not_implemented" }); }

export async function webhookMP(_req, res) { return res.sendStatus(200); }

// controllers/servicioImpresion.controller.js
export async function checkoutMP(req, res) {
  const { id_usuario } = req.usuario;
  const { id_orden } = req.body; // o params

  // 1) Traer el token del vendedor + lo necesario para item/precio
  const q = await pool.query(`
    SELECT v.mp_access_token, v.mp_user_id,
           o.titulo, o.descripcion, o.monto_total, o.cantidad
    FROM ordenes_impresion o
    JOIN vendedores v ON v.id_vendedor = o.id_vendedor
    WHERE o.id_orden = $1 AND o.id_comprador = $2
  `, [id_orden, id_usuario]);

  if (q.rowCount === 0) return res.status(404).json({ error: "orden_no_encontrada" });
  const { mp_access_token, mp_user_id, titulo, descripcion, monto_total, cantidad } = q.rows[0];
  if (!mp_access_token) return res.status(400).json({ error: "vendedor_sin_mp" });

  // 2) Armar preferencia. Acá va la comisión si querés (application_fee).
  const preference = {
    items: [
      {
        title: titulo || "Impresión 3D",
        description: descripcion || "",
        quantity: cantidad || 1,
        unit_price: Number(monto_total) || 0,
        currency_id: "ARS",
      },
    ],
    payer: {}, // si querés prellenar mail/nombre
    back_urls: {
      success: `${process.env.WEB_URL}/checkout/success?id=${id_orden}`,
      failure: `${process.env.WEB_URL}/checkout/failure?id=${id_orden}`,
      pending: `${process.env.WEB_URL}/checkout/pending?id=${id_orden}`,
    },
    auto_return: "approved",
    notification_url: `https://tu-backend.com/api/servicio/webhooks/mercadopago`, // o http://localhost:4000/... en dev
    statement_descriptor: "ZEBRA3D",
    // 👇 comisión opcional para la plataforma (en moneda del cobro)
    marketplace: "ZEBRA3D",
    application_fee: 0, // por ejemplo, 200.00 para $200 de comisión
    // a veces conviene setear quién “patrocina” (opcional según uso):
    sponsor_id: Number(mp_user_id) || undefined,
  };

  // 3) Crear preferencia con EL TOKEN DEL VENDEDOR
  const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mp_access_token}`, // <-- token del vendedor
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preference),
  });

  if (!resp.ok) {
    let payload; try { payload = await resp.json(); } catch { payload = await resp.text(); }
    console.error("MP pref error:", resp.status, payload);
    return res.status(400).json({ error: "mp_preference_error", detail: payload });
  }

  const pref = await resp.json();

  // 4) Guardar id de preferencia en la orden para conciliar por webhook
  await pool.query(`UPDATE ordenes_impresion SET mp_preference_id = $1 WHERE id_orden = $2`, [pref.id, id_orden]);

  // 5) Devolver init_point para que el front redirija
  return res.json({ init_point: pref.init_point, sandbox_init_point: pref.sandbox_init_point });
}
