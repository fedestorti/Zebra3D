// src/routes/mp.routes.js
import { Router } from "express";
import { verificarToken } from "../middlewares/validarToken.js";
import {
  iniciarVinculacionURL,
  iniciarVinculacion,   // opcional si querés el 302 desde backend
  callbackMP,
  desvincularMP,
  refrescarTokenMP,
} from "../controllers/mp.controller.js";

const router = Router();

// Flujo de vinculación
router.get("/vincular-url", verificarToken, iniciarVinculacionURL);
router.get("/vincular", verificarToken, iniciarVinculacion); // opcional
router.get("/callback", callbackMP);

// Mantenimiento de vínculo
router.post("/desvincular", verificarToken, desvincularMP);
router.post("/refresh", verificarToken, refrescarTokenMP);

export default router;
