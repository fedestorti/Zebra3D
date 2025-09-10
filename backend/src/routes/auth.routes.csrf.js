// backend/src/routes/auth.routes.csrf.js
import { Router } from "express";
import {
  register,
  login,
  obtenerPerfil,
  getMyProfile,
  // logout
} from "../controllers/auth.controller.js";
import { uploadImagen } from "../lib/multer.js";
import { verificarToken } from "../middlewares/validarToken.js";
import { verificarUsuario } from "../middlewares/validarRegistro.js";
import { sendCsrfCookie, verifyCsrf } from "../middlewares/csrf.js";

const router = Router();

// El front pega un GET a /api/auth/csrf al cargar para obtener la cookie CSRF
router.get("/csrf", sendCsrfCookie, (_req, res) => res.json({ ok: true }));

router.post("/register", verifyCsrf, verificarUsuario, uploadImagen, register);
router.post("/login", verifyCsrf, login);

// router.post("/logout", verifyCsrf, verificarToken, logout);

router.get("/perfil", verificarToken, obtenerPerfil);
router.get("/me", verificarToken, getMyProfile);

export default router;
