//backend/src/middlewares/csrf.js
import crypto from "crypto";
import { IS_PROD } from "../config.js";

export function sendCsrfToken(_req, res) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie("csrf_token", token, {
    httpOnly: false,      // visible para JS
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
  });
  res.json({ ok: true, token });
}

export function verifyCsrf(req, res, next) {
  const c = req.cookies?.csrf_token;
  const h = req.get("X-CSRF-Token");
  if (!c || !h || c !== h) return res.status(403).json({ error: "CSRF token inválido" });
  next();
}
