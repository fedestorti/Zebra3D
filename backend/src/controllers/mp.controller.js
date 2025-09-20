// src/controllers/mp.controller.js
import jwt from "jsonwebtoken";
import pool from "../db.js";

const {
  MP_CLIENT_ID,
  MP_CLIENT_SECRET,
  MP_REDIRECT_URI,   // ej: http://localhost:4000/api/mp/callback
  FRONTEND_URL,      // ej: http://localhost:5173
  JWT_SECRET,
} = process.env;

const MP_AUTH_BASE = "https://auth.mercadopago.com.ar/authorization";
const MP_API = "https://api.mercadopago.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function signState(id_usuario) {
  return jwt.sign({ id_usuario }, JWT_SECRET, { expiresIn: "10m" });
}

async function mpTokenRequest(paramsObj) {
  const body = new URLSearchParams(paramsObj);
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();

  if (!res.ok) {
    const sent = Object.fromEntries([...body.entries()]);
    if (sent.client_secret) sent.client_secret = "***";
    console.error("=== [MP][TOKEN-ERROR] ===============================");
    console.error("Status:", res.status);
    console.error("Params enviados:", sent);
    console.error("Respuesta cruda:", text);
    console.error("====================================================");
    throw new Error(`MP oauth/token ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// GET /api/mp/vincular-url
// ---------------------------------------------------------------------------
export async function iniciarVinculacionURL(req, res) {
  const auth = req.user || req.usuario || {};
  const { id_usuario } = auth;
  if (!id_usuario) return res.status(401).json({ error: "No autenticado" });

  const state = signState(id_usuario);

  const url =
    `${MP_AUTH_BASE}?response_type=code` +
    `&client_id=${encodeURIComponent(MP_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}` +
    `&state=${encodeURIComponent(state)}`;

  console.log("=== [MP][AUTH-URL] =================================");
  console.log("User ID:", id_usuario);
  console.log("CLIENT_ID:", MP_CLIENT_ID);
  console.log("REDIRECT_URI:", MP_REDIRECT_URI);
  console.log("Final URL =>", url);
  console.log("====================================================");

  return res.json({ url });
}

// ---------------------------------------------------------------------------
// GET /api/mp/callback
// ---------------------------------------------------------------------------
export async function callbackMP(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

    console.log("=== [MP][CALLBACK] ===============================");
    console.log("Query recibida:", req.query);

    // ⚠️ Si Mercado Pago devuelve error en query
    if (error) {
      console.error("[MP][CB] error:", error, error_description);
      return res.send(`
        <script>
          window.opener.postMessage(
            { status: "error", source: "mercadopago", reason: "${error}" },
            "${process.env.FRONTEND_URL}"
          );
          window.close();
        </script>
      `);
    }

    // 🔑 Validar el state (para evitar CSRF)
    let id_usuario;
    try {
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      id_usuario = decoded?.id_usuario;
      console.log("[MP][CALLBACK] State decodificado:", decoded);
    } catch (e) {
      console.error("[MP][CALLBACK] State inválido:", e.message);
      return res.send(`
        <script>
          window.opener.postMessage(
            { status: "error", source: "mercadopago", reason: "invalid_state" },
            "${process.env.FRONTEND_URL}"
          );
          window.close();
        </script>
      `);
    }

    console.log("[MP][CALLBACK] Usuario a vincular:", id_usuario);
    console.log("[MP][CALLBACK] Intercambiando code por tokens...");

    // 🔄 Intercambiar code -> tokens
    const data = await mpTokenRequest({
      grant_type: "authorization_code",
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      code,
      redirect_uri: process.env.MP_REDIRECT_URI,
    });

    console.log("[MP][CALLBACK] Tokens recibidos (sanitizado):", {
      user_id: data.user_id,
      scope: data.scope,
      access_token: data.access_token ? "***" : null,
      refresh_token: data.refresh_token ? "***" : null,
      expires_in: data.expires_in,
    });

    // Guardar en DB
    const mp_user_id = data.user_id ? String(data.user_id) : null;
    const mp_access_token = data.access_token || null;
    const mp_refresh_token = data.refresh_token || null;
    const mp_token_scopes = data.scope || null;
    const expires_in = Number(data.expires_in || 0);
    const mp_token_expira = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    console.log("[MP][CALLBACK] Guardando en DB:", {
      cuenta_pago: "mercadopago",
      mp_user_id,
      mp_access_token: mp_access_token ? "***" : null,
      mp_refresh_token: mp_refresh_token ? "***" : null,
      mp_token_scopes,
      mp_token_expira,
      id_usuario,
    });

    const upd = await pool.query(
      `UPDATE usuarios
       SET cuenta_pago=$1, mp_user_id=$2, mp_access_token=$3,
           mp_refresh_token=$4, mp_token_scopes=$5, mp_token_expira=$6
       WHERE id_usuario=$7
       RETURNING id_usuario`,
      ["mercadopago", mp_user_id, mp_access_token, mp_refresh_token, mp_token_scopes, mp_token_expira, id_usuario]
    );

    console.log("[MP][CALLBACK] UPDATE rowCount:", upd.rowCount);

    if (upd.rowCount === 0) {
      console.error("[MP][CALLBACK] ⚠️ No se actualizó ningún usuario.");
    } else {
      console.log("[MP][CALLBACK] ✅ Usuario vinculado correctamente.");
    }

    // 👇 Enviamos mensaje al frontend y cerramos popup
    return res.send(`
      <script>
        window.opener.postMessage(
          { status: "ok", source: "mercadopago" },
          "${process.env.FRONTEND_URL}"
        );
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("[MP][CB] exception:", err);
    return res.send(`
      <script>
        window.opener.postMessage(
          { status: "error", source: "mercadopago", reason: "exception", detail: "${err.message}" },
          "${process.env.FRONTEND_URL}"
        );
        window.close();
      </script>
    `);
  }
}

// ---------------------------------------------------------------------------
// POST /api/mp/desvincular
// ---------------------------------------------------------------------------
export async function desvincularMP(req, res) {
  try {
    const auth = req.user || req.usuario || {};
    const { id_usuario } = auth;
    if (!id_usuario) return res.status(401).json({ error: "No autenticado" });

    const upd = await pool.query(
      `UPDATE usuarios
          SET cuenta_pago       = NULL,
              mp_user_id        = NULL,
              mp_access_token   = NULL,
              mp_refresh_token  = NULL,
              mp_token_scopes   = NULL,
              mp_token_expira   = NULL,
              mp_public_key     = NULL
        WHERE id_usuario = $1`,
      [id_usuario]
    );

    console.log("[MP][UNLINK] rowCount:", upd.rowCount);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[MP][UNLINK] exception:", err);
    return res.status(500).json({ error: "No se pudo desvincular" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/mp/refresh
// ---------------------------------------------------------------------------
export async function refrescarTokenMP(req, res) {
  try {
    const auth = req.user || req.usuario || {};
    const { id_usuario } = auth;
    if (!id_usuario) return res.status(401).json({ error: "No autenticado" });

    const q = await pool.query(
      `SELECT mp_refresh_token FROM usuarios WHERE id_usuario = $1`,
      [id_usuario]
    );
    if (!q.rowCount || !q.rows[0].mp_refresh_token) {
      return res.status(400).json({ error: "Sin refresh_token para renovar" });
    }

    const refresh_token = q.rows[0].mp_refresh_token;

    const params = {
      grant_type: "refresh_token",
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      refresh_token,
    };
    const logParams = { ...params, client_secret: "***" };
    console.log("[MP][REFRESH] token params:", logParams);

    let data;
    try {
      data = await mpTokenRequest(params);
      console.log("[MP][REFRESH] token OK:", {
        user_id: data.user_id,
        scope: data.scope,
        expires_in: data.expires_in,
      });
    } catch (e) {
      console.error("[MP][REFRESH] Error al pedir token:", e.message);
      return res.status(502).json({ error: "No se pudo refrescar el token", detail: e.message });
    }

    const mp_access_token  = data.access_token || null;
    const new_refresh      = data.refresh_token || refresh_token;
    const mp_token_scopes  = data.scope || null;
    const expires_in       = Number(data.expires_in || 0);
    const mp_token_expira  = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    const upd = await pool.query(
      `UPDATE usuarios
          SET mp_access_token   = $1,
              mp_refresh_token  = $2,
              mp_token_scopes   = $3,
              mp_token_expira   = $4
        WHERE id_usuario = $5`,
      [mp_access_token, new_refresh, mp_token_scopes, mp_token_expira, id_usuario]
    );
    console.log("[MP][REFRESH] UPDATE rowCount:", upd.rowCount);

    return res.json({ ok: true, expira: mp_token_expira });
  } catch (err) {
    console.error("[MP][REFRESH] exception:", err);
    return res.status(500).json({ error: "No se pudo refrescar el token" });
  }
}

// ---------------------------------------------------------------------------
// POST /api/mp/test-preference
// ---------------------------------------------------------------------------
export async function crearPreferenceTest(req, res) {
  try {
    const auth = req.user || req.usuario || {};
    const { id_usuario } = auth;
    if (!id_usuario) return res.status(401).json({ error: "No autenticado" });

    const q = await pool.query(
      `SELECT mp_access_token FROM usuarios WHERE id_usuario=$1`,
      [id_usuario]
    );
    if (!q.rowCount || !q.rows[0].mp_access_token) {
      return res.status(400).json({ error: "Usuario no tiene MP vinculado" });
    }
    const accessToken = q.rows[0].mp_access_token;

    const body = {
      items: [
        {
          title: "Diseño 3D de prueba",
          quantity: 1,
          currency_id: "ARS",
          unit_price: 1000,
        },
      ],
      back_urls: {
        success: `${FRONTEND_URL}/checkout/success`,
        failure: `${FRONTEND_URL}/checkout/failure`,
        pending: `${FRONTEND_URL}/checkout/pending`,
      },
      auto_return: "approved",
    };

    console.log("=== [MP][TEST-PREFERENCE] =====================");
    console.log("AccessToken:", accessToken ? accessToken.slice(0,15) + "..." : "NULL");
    console.log("Body:", JSON.stringify(body, null, 2));
    console.log("===============================================");

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("[MP][TEST-PREFERENCE] error:", data);
      return res.status(502).json({ error: "No se pudo crear preferencia", detail: data });
    }

    return res.json({ ok: true, init_point: data.init_point });
  } catch (err) {
    console.error("[MP][TEST-PREFERENCE] exception:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
