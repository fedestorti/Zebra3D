// backend/src/middlewares/verificarToken.js
import jwt from "jsonwebtoken";
import pool from "../db.js";

export async function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    let decoded = null;

    // 1. Token en Authorization
    if (bearer) {
      decoded = jwt.verify(bearer, process.env.JWT_SECRET);
    }

    // 2. Token en cookie access_token
    if (!decoded && req.cookies?.access_token) {
      decoded = jwt.verify(req.cookies.access_token, process.env.JWT_SECRET);
    }

    // 3. Refresh token: renovar access si expira
    if (!decoded && req.cookies?.refresh_token) {
      const refreshDecoded = jwt.verify(req.cookies.refresh_token, process.env.JWT_SECRET);

      // emitir un nuevo access_token (cookie de sesión, sin maxAge)
      const newAccess = jwt.sign(
        { id_usuario: refreshDecoded.id_usuario, apodo: refreshDecoded.apodo },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.cookie("access_token", newAccess, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      decoded = refreshDecoded;
    }

    // 4. Validación básica
    if (!decoded?.id_usuario) {
      return res.status(401).json({ mensaje: "Token inválido" });
    }

    // 5. CSRF check solo en métodos peligrosos
    const csrfMethods = ["POST", "PUT", "DELETE", "PATCH"];
    if (csrfMethods.includes(req.method)) {
      const headerToken = req.headers["x-csrf-token"];
      const cookieToken = req.cookies?.csrf_token;
      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return res.status(403).json({ mensaje: "CSRF token inválido" });
      }
    }

    // 6. Resolver apodo si no vino en el JWT
    let { id_usuario, apodo } = decoded;
    if (!apodo) {
      const r = await pool.query(
        "SELECT apodo FROM usuarios WHERE id_usuario = $1",
        [id_usuario]
      );
      apodo = r.rowCount ? r.rows[0].apodo : null;
    }

    // 7. Guardar en request
    req.user = { id_usuario, apodo };
    req.usuario = req.user; // alias por compatibilidad

    next();
  } catch (err) {
    console.error("❌ Error en verificarToken:", err.message);
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}
