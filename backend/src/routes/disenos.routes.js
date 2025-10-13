// backend/src/routes/disenos.routes.js
import { Router } from "express";
import { verificarToken } from "../middlewares/validarToken.js";
import { uploadDiseno } from "../middlewares/uploadDiseno.js";
import { uploadDisenoPUT } from "../middlewares/uploadDisenoPUT.js";
import { requireMPLinked } from "../middlewares/requireMPLinked.js";
import { agregarApodo } from "../middlewares/usuarios.middleware.js";

import {
  crearDiseno,
  getDisenos,
  getDisenoById,
  getDisenosUsuario,
  eliminarDiseno,
  eliminarImagenDiseno,
  seleccionarPortada,
  updateDiseno,
  getMasDelAutor,
} from "../controllers/disenos.controller.js";

const router = Router();

/**
 * Orden:
 * 1) Rutas más específicas
 * 2) Luego /:id
 */

// Listado general
router.get("/", getDisenos);

// Diseños de un usuario (antes que /:id)
router.get("/usuario/:id_usuario", verificarToken, getDisenosUsuario);

// Más del autor para un diseño puntual (antes que /:id)
router.get("/:id/autor", getMasDelAutor);

// Detalle por ID
router.get("/:id", getDisenoById);

// Crear diseño (sesión + MP vinculado + multer)
router.post(
  "/",
  verificarToken,
  requireMPLinked,
  agregarApodo,
  uploadDiseno,
  crearDiseno
);

// Actualizar diseño
router.put(
  "/:id",
  verificarToken,
  // requireMPLinked, // opcional si querés exigir MP también para editar
  uploadDisenoPUT,
  updateDiseno
);

// Eliminar diseño
router.delete("/:id", verificarToken, eliminarDiseno);

// Borrar imagen individual
router.delete("/imagen/:id_imagen", verificarToken, eliminarImagenDiseno);

// Seleccionar portada
router.put("/imagen/:id_imagen/portada", verificarToken, seleccionarPortada);

export default router;
