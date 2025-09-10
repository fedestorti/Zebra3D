// backend/src/middlewares/verificarToken.js
import jwt from "jsonwebtoken";

export async function verificarToken(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    let decoded = null;

    // Verificamos token desde Authorization
    if (bearer) {
      decoded = jwt.verify(bearer, process.env.JWT_SECRET);
    }

    // Verificamos token desde access_token cookie
    if (!decoded && req.cookies?.access_token) {
      decoded = jwt.verify(req.cookies.access_token, process.env.JWT_SECRET);
    }

    // Si no hay access, intentamos refresh
    if (!decoded && req.cookies?.refresh_token) {
      const refreshDecoded = jwt.verify(req.cookies.refresh_token, process.env.JWT_SECRET);
      const newAccess = jwt.sign({ id_usuario: refreshDecoded.id_usuario }, process.env.JWT_SECRET, { expiresIn: "15m" });
      res.cookie("access_token", newAccess, { httpOnly: true, sameSite: "lax", secure: false });
      decoded = refreshDecoded;
    }

    if (!decoded?.id_usuario) {
      return res.status(401).json({ mensaje: "Token inválido" });
    }

    // 🚨 Verificar CSRF en métodos peligrosos
    const csrfMethods = ["POST", "PUT", "DELETE", "PATCH"];
    if (csrfMethods.includes(req.method)) {
      const headerToken = req.headers["x-csrf-token"];
      const cookieToken = req.cookies?.csrf_token;

      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return res.status(403).json({ mensaje: "CSRF token inválido" });
      }
    }

    req.user = { id_usuario: decoded.id_usuario };
    req.usuario = req.user;
    next();
  } catch (err) {
    console.error("❌ Error en verificarToken:", err.message);
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}
