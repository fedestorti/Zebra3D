import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../db.js";
import { IS_PROD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "../config.js";

// Cookies: una sola fuente de verdad
const COOKIE_ACCESS = {
  httpOnly: true,      // access solo por cookie
  sameSite: "lax",
  secure: IS_PROD,
  path: "/",           // mismo path para set/clear
};
const COOKIE_REFRESH = {
  httpOnly: true,
  sameSite: "lax",
  secure: IS_PROD,
  path: "/",
};
const COOKIE_CSRF = {
  httpOnly: false,     // visible para JS
  sameSite: "lax",
  secure: IS_PROD,
  path: "/",
};

function signAccess(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: "120m" });
}
function signRefresh(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

// =========================
// Registro
// =========================
export async function register(req, res) {
  const { apodo, nombre, apellido, email, contrasena, pais } = req.body;
  if (!apodo || !nombre || !apellido || !email || !contrasena || !pais) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "Email no válido" });

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  if (!passwordRegex.test(contrasena)) {
    return res.status(400).json({ error: "Contraseña no cumple requisitos" });
  }

  try {
    const existing = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE apodo = $1 OR email = $2`,
      [apodo, email]
    );
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: "El apodo o email ya están registrados" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(contrasena, salt);

    const avatar_url =
      req.file?.path ||
      "https://res.cloudinary.com/dortoxt8j/image/upload/v1756229764/LogoDefault/Logo/Logo.png.png";

    const result = await pool.query(
      `INSERT INTO usuarios (apodo, nombre, apellido, email, contrasena, avatar_url, pais)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id_usuario`,
      [apodo, nombre, apellido, email, hashed, avatar_url, pais]
    );

    return res.status(201).json({
      message: "✅ Usuario registrado con éxito",
      id: result.rows[0].id_usuario,
    });
  } catch (err) {
    console.error("❌ Error al registrar usuario:", err);
    return res.status(500).json({ error: "Error al registrar usuario" });
  }
}

// =========================
// Login (setea cookies de sesión + csrf)
// =========================
export async function login(req, res) {
  const { email, contrasena } = req.body;

  try {
    const q = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [email]);
    if (!q.rowCount) return res.status(401).json({ mensaje: "Email no registrado" });

    const u = q.rows[0];
    const ok = await bcrypt.compare(contrasena, u.contrasena);
    if (!ok) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const access  = signAccess({ id_usuario: u.id_usuario });
    const refresh = signRefresh({ id_usuario: u.id_usuario });

    const csrf = crypto.randomBytes(32).toString("hex");

    res.cookie("access_token", access, COOKIE_ACCESS);
    res.cookie("refresh_token", refresh, COOKIE_REFRESH);
    res.cookie("csrf_token", csrf, COOKIE_CSRF);

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ [LOGIN]", err);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

// =========================
export async function refresh(req, res) {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    let payload;
    try {
      payload = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: "Refresh inválido" });
    }

    const access = signAccess({ id_usuario: payload.id_usuario });
    res.cookie("access_token", access, COOKIE_ACCESS);
    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ [REFRESH]", err);
    return res.status(500).json({ error: "No se pudo refrescar el token" });
  }
}

// =========================
// Logout (borra cookies en TODOS los paths comunes)
// =========================
export async function logout(_req, res) {
  const baseHttpOnly = { httpOnly: true, sameSite: "lax", secure: IS_PROD };
  const baseJs = { sameSite: "lax", secure: IS_PROD }; // para csrf_token
  const paths = ["/", "/api", "/api/auth"];
  const expired = { expires: new Date(0) };

  for (const p of paths) {
    res.clearCookie("access_token", { ...baseHttpOnly, path: p });
    res.cookie("access_token", "", { ...baseHttpOnly, path: p, ...expired });

    res.clearCookie("refresh_token", { ...baseHttpOnly, path: p });
    res.cookie("refresh_token", "", { ...baseHttpOnly, path: p, ...expired });
  }

  res.clearCookie("csrf_token", { ...baseJs, path: "/" });
  res.cookie("csrf_token", "", { ...baseJs, path: "/", ...expired });

  return res.status(204).end();
}

// =========================
// Perfil básico y extendido
// =========================
export async function obtenerPerfil(req, res) {
  try {
    const { id_usuario } = req.user || {};
    if (!id_usuario) return res.status(401).json({ mensaje: "No autenticado" });

    const q = await pool.query(
      `SELECT id_usuario, apodo, avatar_url, email
         FROM usuarios
        WHERE id_usuario = $1`,
      [id_usuario]
    );
    if (!q.rowCount) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    return res.json(q.rows[0]);
  } catch (err) {
    console.error("obtenerPerfil", err);
    return res.status(500).json({ mensaje: "Error del servidor" });
  }
}

export async function getMyProfile(req, res) {
  try {
    const { id_usuario } = req.user || {};
    if (!id_usuario) return res.status(401).json({ error: "No autenticado" });

    const q = await pool.query(
      `SELECT id_usuario, apodo, email, avatar_url,
              cuenta_pago, mp_user_id, mp_public_key, mp_token_expira
         FROM usuarios
        WHERE id_usuario = $1`,
      [id_usuario]
    );
    if (!q.rowCount) return res.status(404).json({ error: "Usuario no encontrado" });

    const u = q.rows[0];
    const vinculado = Boolean(u.mp_user_id || u.cuenta_pago);

    return res.json({
      id_usuario: u.id_usuario,
      apodo: u.apodo,
      email: u.email,
      avatar_url: u.avatar_url,
      vinculado,
      mp_public_key: u.mp_public_key ?? null,
      mp_token_expira: u.mp_token_expira ?? null,
    });
  } catch (err) {
    console.error("getMyProfile", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export { COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_CSRF };
