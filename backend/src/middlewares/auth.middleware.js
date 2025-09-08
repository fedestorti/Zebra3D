//auth.middleware.js
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "❌ No se proporcionó token" });
  }
  const token = authHeader.slice(7);

  // Debug temporal
  const parts = token.split(".");
  if (parts.length !== 3) {
    console.error("🟥 Token mal formado (partes):", parts.length);
    return res.status(401).json({ error: "❌ Token inválido o mal formado" });
  }
  const decodedLoose = jwt.decode(token, { complete: true });
  if (!decodedLoose) {
    console.error("🟥 jwt.decode devolvió null (base64 roto)");
    return res.status(401).json({ error: "❌ Token inválido o mal formado" });
  }
  // Fin debug

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id_usuario) {
      console.error("🟥 Token sin id_usuario en payload:", decoded);
      return res.status(401).json({ error: "❌ Token inválido o mal formado" });
    }
    req.user = decoded;
    next();
  } catch (e) {
    console.error("🟥 jwt.verify error:", e.message);
    return res.status(401).json({ error: "❌ Token inválido o mal formado" });
  }
};
