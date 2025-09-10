import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { cloudinary } from "../lib/cloudinary.js";
import crypto from "crypto";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  path: "/",
  // 👉 sin expires / maxAge => cookie de sesión (se borra al cerrar el navegador)
};

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
}
function signRefresh(payload) {
  // El JWT puede durar 30d, pero la cookie es de sesión (solo vive mientras el browser esté abierto)
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// =========================
// Registro
// =========================
export const register = async (req, res) => {
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
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: "image" });
      }
      return res.status(400).json({ error: "El apodo o email ya están registrados" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    const avatar_url = req.file
      ? req.file.path
      : "https://res.cloudinary.com/dortoxt8j/image/upload/v1756229764/LogoDefault/Logo/Logo.png.png";

    const result = await pool.query(
      `INSERT INTO usuarios (apodo, nombre, apellido, email, contrasena, avatar_url, pais)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_usuario`,
      [apodo, nombre, apellido, email, hashedPassword, avatar_url, pais]
    );

    await cloudinary.api.create_folder(`usuarios/${apodo}/disenos`);

    return res.status(201).json({
      message: "✅ Usuario registrado con éxito",
      id: result.rows[0].id_usuario,
    });
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    return res.status(500).json({ error: "Error al registrar usuario" });
  }
};

// =========================
// Login (cookies de sesión)
// =========================
export const login = async (req, res) => {
  const { email, contrasena } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ mensaje: 'Email no registrado' });

    const u = result.rows[0];
    const ok = await bcrypt.compare(contrasena, u.contrasena);
    if (!ok) return res.status(401).json({ mensaje: 'Contraseña incorrecta' });

    const accessToken = signAccess({ id_usuario: u.id_usuario });
    const refreshToken = signRefresh({ id_usuario: u.id_usuario });

    // CSRF visible para JS
    const csrfToken = crypto.randomBytes(32).toString("hex");

    // Cookies de sesión (sin maxAge/expires)
    res.cookie('access_token', accessToken, COOKIE_BASE);
    res.cookie('refresh_token', refreshToken, COOKIE_BASE);
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: isProd,
      path: "/",
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ [LOGIN] error:', error.message);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// =========================
// Refresh access token (usa cookie refresh)
// =========================
export const refreshAccessToken = async (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) return res.status(401).json({ error: "Sin refresh token" });

    let decoded;
    try {
      decoded = jwt.verify(rt, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Refresh inválido o expirado" });
    }

    const newAccess = signAccess({ id_usuario: decoded.id_usuario });
    // Devolvé y también podés re-setear la cookie de access para comodidad
    res.cookie('access_token', newAccess, COOKIE_BASE);
    return res.json({ ok: true });
  } catch (err) {
    console.error("refreshAccessToken", err);
    return res.status(500).json({ error: "No se pudo refrescar el token" });
  }
};

// =========================
// Logout
// =========================
export const logout = async (_req, res) => {
  const clearOpts = { path: "/", sameSite: "lax", secure: isProd };
  res.clearCookie("access_token", clearOpts);
  res.clearCookie("refresh_token", clearOpts);
  res.clearCookie("csrf_token", clearOpts);
  return res.status(204).end();
};

// =========================
// Perfil básico (/auth/perfil)
// =========================
export const obtenerPerfil = async (req, res) => {
  try {
    const authUser = req.user || req.usuario || {};
    const { id_usuario } = authUser;
    if (!id_usuario) return res.status(401).json({ mensaje: "No autenticado" });

    const q = await pool.query(
      `SELECT id_usuario, apodo, avatar_url, email
         FROM usuarios
        WHERE id_usuario = $1`,
      [id_usuario]
    );
    if (!q.rowCount) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    return res.json(q.rows[0]);
  } catch (error) {
    console.error("obtenerPerfil", error);
    return res.status(500).json({ mensaje: "Error del servidor" });
  }
};

// =========================
// Perfil extendido (/auth/me)
// =========================
export const getMyProfile = async (req, res) => {
  try {
    const authUser = req.user || req.usuario || {};
    const { id_usuario } = authUser;
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
};
