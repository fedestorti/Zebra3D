// src/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { cloudinary } from "../lib/cloudinary.js";
import crypto from "crypto";
// =========================
// Helpers JWT + Cookies
// =========================
const isProd = process.env.NODE_ENV === "production";

const COOKIE_BASE = {
  httpOnly: true,     // no accesible desde JS
  secure: isProd,     // true solo en HTTPS (prod)
  sameSite: "lax",    // reduce CSRF sin romper OAuth
  path: "/",
};

// frontend/src/api.js
import axios from "axios";

// 👇 la clave: habilitar envío de cookies
const API = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true, // acepta/manda cookies cross-site
});

// Helper para leer cookies (CSRF token por ej.)
function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="))
    ?.split("=")[1];
}

// Interceptor global
API.interceptors.request.use((config) => {
  // CSRF token: se setea desde backend en cookie HttpOnly + Secure
  const csrf = getCookie("csrf_token");
  if (csrf) config.headers["X-CSRF-Token"] = csrf;

  // Access token: si lo guardás en memoria o localStorage
  const token = localStorage.getItem("token") || window.__ACCESS_TOKEN__;
  if (token) config.headers["Authorization"] = `Bearer ${token}`;

  return config;
});

export default API;

// Ejemplo de helper
export async function obtenerPerfilUsuario() {
  const res = await API.get("/auth/me");
  return res.data;
}


function signAccess(payload) {
  // Token corto para llamadas del front
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
}

function signRefresh(payload) {
  // Token largo en cookie HttpOnly
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
    // ¿apodo o email ya existen?
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

    // Hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Avatar
    const avatar_url = req.file
      ? req.file.path
      : "https://res.cloudinary.com/dortoxt8j/image/upload/v1756229764/LogoDefault/Logo/Logo.png.png";

    // Insert
    const result = await pool.query(
      `INSERT INTO usuarios (apodo, nombre, apellido, email, contrasena, avatar_url, pais)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_usuario`,
      [apodo, nombre, apellido, email, hashedPassword, avatar_url, pais]
    );

    // Carpeta Cloudinary
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
// Login (access + refresh cookie)
// =========================
// -----------------------------------------------------------------------------
// Login con cookies httpOnly (access 15m, refresh 30d)
// -----------------------------------------------------------------------------
export const login = async (req, res) => {
  const { email, contrasena } = req.body;
  console.log('📨 [LOGIN] body:', { email, contrasena: contrasena ? '***' : '(vacía)' });

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      console.log('🟥 [LOGIN] email no registrado');
      return res.status(401).json({ mensaje: 'Email no registrado' });
    }

    const u = result.rows[0];
    const ok = await bcrypt.compare(contrasena, u.contrasena);
    if (!ok) {
      console.log('🟥 [LOGIN] contraseña incorrecta');
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Tokens
    const accessToken = jwt.sign({ id_usuario: u.id_usuario }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id_usuario: u.id_usuario }, process.env.JWT_SECRET, { expiresIn: '30d' });

    // ✅ CSRF token
    const csrfToken = crypto.randomBytes(32).toString("hex");

    // Cookies
    const sameSiteOpt = 'lax';
    const baseCookie = { httpOnly: true, sameSite: sameSiteOpt, secure: false, path: '/' };

    res.cookie('access_token', accessToken, baseCookie);
    res.cookie('refresh_token', refreshToken, { ...baseCookie, maxAge: 30 * 24 * 60 * 60 * 1000 });

    // ✅ Cookie visible por JS para CSRF (no es httpOnly)
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      sameSite: sameSiteOpt,
      secure: false, // ⚠️ true solo en producción con HTTPS
      path: '/',
    });

    console.log('✅ [LOGIN] Set-Cookie access_token + refresh_token + csrf_token emitidos');
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ [LOGIN] error:', error.message);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};


// =========================
// Refresh access token desde cookie
// =========================
export const refreshAccessToken = async (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) return res.status(401).json({ error: "Sin refresh token" });

    let decoded;
    try {
      decoded = jwt.verify(rt, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: "Refresh inválido o expirado" });
    }

    const access = signAccess({ id_usuario: decoded.id_usuario });
    return res.json({ token: access });
  } catch (err) {
    console.error("refreshAccessToken", err);
    return res.status(500).json({ error: "No se pudo refrescar el token" });
  }
};

// =========================
// Logout (borra cookie de refresh)
// =========================
export const logout = async (_req, res) => {
  try {
    // Limpiar todas las cookies relevantes
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    res.clearCookie("csrf_token", { path: "/" });

    return res.status(204).end(); // Sin contenido (logout exitoso)
  } catch (err) {
    console.error("❌ Error en logout:", err.message);
    return res.status(500).json({ error: "No se pudo cerrar sesión" });
  }
};

// =========================
// Perfil básico (/auth/perfil)
// =========================
export const obtenerPerfil = async (req, res) => {
  try {
    // soporta middlewares que pongan req.user o req.usuario
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
