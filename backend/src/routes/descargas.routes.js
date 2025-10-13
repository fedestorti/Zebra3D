// backend/src/routes/descargas.routes.js
import { Router } from "express";
import { sendCsrfToken, verifyCsrf } from "../middlewares/csrf.js";
import {
  listarDescargas,
  crearLinkDescarga,
} from "../controllers/descargas.controller.js";

const router = Router();

/**
 * Nota: estas rutas usan Authorization: Bearer.
 * No mezclar CSRF acá.
 */

// Lista ítems comprados por el usuario logueado
router.get("/", verifyCsrf, listarDescargas);

// Devuelve un link firmado corto para BAJAR un ítem comprado
router.post("/:id_item/link", verifyCsrf, crearLinkDescarga);

export default router;
