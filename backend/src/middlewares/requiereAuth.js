// backend/src/middlewares/requiereAuth.js
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

export function requiereAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const cookieToken = req.cookies?.token;
    const token = bearer || cookieToken;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = { id_usuario: payload.id_usuario, apodo: payload.apodo };
    next();
  } catch (err) {
    console.error("requiereAuth error:", err?.message || err);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}
