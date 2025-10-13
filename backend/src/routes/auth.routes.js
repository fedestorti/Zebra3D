// backend/src/routes/auth.routes.js
import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { uploadImagen } from "../lib/multer.js";
import { verificarToken } from "../middlewares/validarToken.js";
import { verificarUsuario } from "../middlewares/validarRegistro.js";
import { sendCsrfToken, verifyCsrf } from "../middlewares/csrf.js";

const router = Router();

router.get("/csrf", sendCsrfToken);

router.post("/register", verifyCsrf, verificarUsuario, uploadImagen, auth.register);
router.post("/login",    verifyCsrf, auth.login);
router.post("/refresh",  verifyCsrf, auth.refresh);

router.get("/perfil", verificarToken, auth.obtenerPerfil);
router.get("/me",     verificarToken, auth.getMyProfile);

// Logout: solo CSRF. No pidas verificarToken acá.
router.post("/logout", verifyCsrf, auth.logout);

export default router;

