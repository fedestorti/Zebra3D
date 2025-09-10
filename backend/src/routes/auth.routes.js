// backend/src/routes/auth.routes.js
import { Router } from "express";
import * as auth from '../controllers/auth.controller.js';
import { uploadImagen } from "../lib/multer.js";
import { verificarToken } from "../middlewares/validarToken.js";
import { verificarUsuario } from "../middlewares/validarRegistro.js";

const router = Router();

/**
 * Registro (con avatar opcional).
 * Middlewares:
 *  - verificarUsuario: valida payload del alta
 *  - uploadImagen: sube avatar si viene archivo
 */
router.post("/register", verificarUsuario, uploadImagen, auth.register);
/** * Login: devuelve JWT en el body { token }*/
router.post("/login", auth.login);
/** * Perfil básico (compat): usa verificarToken que setea req.user*/
router.get("/perfil", verificarToken, auth.obtenerPerfil);
/*** Perfil extendido: incluye flag de vinculación MP, etc. */
router.get("/me", verificarToken, auth.getMyProfile);

// Si implementás logout basado en cookies/refresh, habilitalo:
// router.post("/logout", verificarToken, logout);
router.post('/logout', (req, res) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ ok: true });
});
export default router;
