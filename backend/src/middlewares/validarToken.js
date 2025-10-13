// backend/src/middlewares/validarToken.js
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config.js";

export function verificarToken(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const token = bearer || req.cookies?.access_token || null;

    if (!token) return res.status(401).json({ mensaje: "No autenticado" });

    const payload = jwt.verify(token, JWT_ACCESS_SECRET);

    req.user = { id_usuario: payload.id_usuario };
    req.usuario = req.user;
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}
