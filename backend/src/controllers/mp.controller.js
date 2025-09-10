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

const MP_AUTH_BASE = (process.env.MP_AUTH_BASE || "https://auth.mercadolibre.com/authorization").trim();
const MP_API = "https://api.mercadopago.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function signState(id_usuario) {
  return jwt.sign({ id_usuario }, JWT_SECRET, { expiresIn: "10m" });
}
function verifyState(state) {
  return jwt.verify(state, JWT_SECRET);
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
    // Logs FULL del error para entender el motivo (redirect_uri, client, grant, etc.)
    const sent = Object.fromEntries([...body.entries()]);
    if (sent.client_secret) sent.client_secret = "***"; // enmascaramos
    console.error("=== [MP][TOKEN-ERROR] ===============================");
    console.error("Status:", res.status);
    console.error("Params enviados:", sent);
    console.error("Respuesta cruda:", text);
    console.error("====================================================");
    throw new Error(`MP oauth/token ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error("=== [MP][TOKEN-ERROR] JSON parse ====================");
    console.error("Respuesta cruda:", text);
    console.error("====================================================");
    throw new Error(`MP oauth/token JSON parse error: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// GET /api/mp/vincular-url  (front pide URL y redirige)
// ---------------------------------------------------------------------------
export async function iniciarVinculacionURL(req, res) {
  const auth = req.user || req.usuario || {};
  const { id_usuario } = auth;
  if (!id_usuario) return res.status(401).json({ error: "No autenticado" });

  const RAW_CLIENT_ID = (process.env.MP_CLIENT_ID || "").trim();
  const RAW_REDIRECT  = (process.env.MP_REDIRECT_URI || "").trim();
  const RAW_AUTH_BASE = (process.env.MP_AUTH_BASE || MP_AUTH_BASE).trim();

  const EXPECTED_REDIRECT = "http://localhost:4000/api/mp/callback";
  const cmpRedirect = RAW_REDIRECT === EXPECTED_REDIRECT;

  const problems = [];
  if (!RAW_CLIENT_ID) problems.push("MP_CLIENT_ID vacío");
  if (!RAW_REDIRECT)  problems.push("MP_REDIRECT_URI vacío");
  if (!cmpRedirect)   problems.push(`redirect_uri NO coincide con ${EXPECTED_REDIRECT}`);

  console.log("=== [MP][AUTH-URL] =================================");
  console.log("User ID:", id_usuario);
  console.log("AUTH_BASE:", RAW_AUTH_BASE);
  console.log("CLIENT_ID:", RAW_CLIENT_ID);
  console.log("REDIRECT_URI:", RAW_REDIRECT, "cmp:", cmpRedirect);
  console.log("ENV OK?:", problems.length === 0 ? "SI" : "NO");
  if (problems.length) console.warn("PROBLEMAS:", problems);
  console.log("====================================================");

  if (problems.length) {
    return res.status(500).json({ error: "Misconfig", problems });
  }

  const state = signState(id_usuario);

  const url =
    `${RAW_AUTH_BASE}?response_type=code` +
    `&client_id=${encodeURIComponent(RAW_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(RAW_REDIRECT)}` +
    `&state=${encodeURIComponent(state)}`;

  console.log("[MP][AUTH-URL] Final URL =>", url);
  return res.json({ url });
}

// ---------------------------------------------------------------------------
// GET /api/mp/vincular  (opcional: backend redirige con 302)
// ---------------------------------------------------------------------------
export async function iniciarVinculacion(req, res) {
  try {
    const auth = req.user || req.usuario || {};
    const { id_usuario } = auth;
    if (!id_usuario) return res.status(401).json({ error: "No autenticado" });

    const state = signState(id_usuario);

    const url =
      `${MP_AUTH_BASE}` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(MP_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}` +
      `&state=${encodeURIComponent(state)}`;

    console.log("=== [MP][AUTH-REDIRECT] ============================");
    console.log("User ID:", id_usuario);
    console.log("302 =>", url);
    console.log("====================================================");

    return res.redirect(302, url);
  } catch (err) {
    console.error("[MP][AUTH-REDIRECT] exception:", err);
    return res.status(500).json({ error: "No se pudo iniciar la vinculación" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/mp/callback  (MP redirige con ?code=&state=)
// Intercambia code -> tokens y guarda en `usuarios`
// ---------------------------------------------------------------------------
export async function callbackMP(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

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

    // 🔑 Validar el state
    let id_usuario;
    try {
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      id_usuario = decoded?.id_usuario;
    } catch (e) {
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

    // 🔄 Intercambiar code -> tokens
    const data = await mpTokenRequest({
      grant_type: "authorization_code",
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      code,
      redirect_uri: process.env.MP_REDIRECT_URI,
    });

    // Guardar en DB
    const mp_user_id = data.user_id ? String(data.user_id) : null;
    const mp_access_token = data.access_token || null;
    const mp_refresh_token = data.refresh_token || null;
    const mp_token_scopes = data.scope || null;
    const expires_in = Number(data.expires_in || 0);
    const mp_token_expira = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    await pool.query(
      `UPDATE usuarios
       SET cuenta_pago=$1, mp_user_id=$2, mp_access_token=$3,
           mp_refresh_token=$4, mp_token_scopes=$5, mp_token_expira=$6
       WHERE id_usuario=$7`,
      ["mercadopago", mp_user_id, mp_access_token, mp_refresh_token, mp_token_scopes, mp_token_expira, id_usuario]
    );

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
          { status: "error", source: "mercadopago", reason: "exception" },
          "${process.env.FRONTEND_URL}"
        );
        window.close();
      </script>
    `);
  }
}

// ---------------------------------------------------------------------------
// POST /api/mp/desvincular  (limpia campos en `usuarios`)
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
// POST /api/mp/refresh  (usa refresh_token para renovar access_token)
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
