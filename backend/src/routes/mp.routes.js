// src/routes/mp.routes.js
import { Router } from "express";
import { verificarToken } from "../middlewares/validarToken.js";
import {
  iniciarVinculacionURL,
  callbackMP,
  desvincularMP,
  refrescarTokenMP,
  crearPreferenceTest,
} from "../controllers/mp.controller.js";

const router = Router();

// 🔗 Flujo de vinculación
router.get("/vincular-url", verificarToken, iniciarVinculacionURL);
router.get("/callback", callbackMP);

// 🔧 Mantenimiento de vínculo
router.post("/desvincular", verificarToken, desvincularMP);
router.post("/refresh", verificarToken, refrescarTokenMP);

// 🧪 Crear preferencia de prueba
router.post("/test-preference", verificarToken, crearPreferenceTest);

export default router;
