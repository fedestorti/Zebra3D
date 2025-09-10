// src/middlewares/csrf.js
import crypto from "crypto";

export function sendCsrfCookie(_req, res, next) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie("csrf_token", token, {
    httpOnly: false,                 // debe ser legible por JS
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  next();
}

export function verifyCsrf(req, res, next) {
  const cookie = req.cookies?.csrf_token;
  const header = req.headers["x-csrf-token"];
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ error: "CSRF token inválido" });
  }
  next();
}
