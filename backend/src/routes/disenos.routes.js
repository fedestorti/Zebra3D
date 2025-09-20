// backend/src/routes/disenos.routes.js
import { Router } from 'express';
import { verificarToken } from '../middlewares/validarToken.js';
import { uploadDiseno } from '../middlewares/uploadDiseno.js';
import { uploadDisenoPUT } from '../middlewares/uploadDisenoPUT.js';
import { requireMPLinked } from '../middlewares/requireMPLinked.js';
import { agregarApodo } from '../middlewares/usuarios.middleware.js';

import {
  crearDiseno,
  getDisenos,
  getDisenoById,
  getDisenosUsuario,
  eliminarDiseno,
  eliminarImagenDiseno,
  seleccionarPortada,
  updateDiseno,
  getMasDelAutor
} from '../controllers/disenos.controller.js';

const router = Router();

/**
 * IMPORTANTE:
 * - Orden de rutas: primero las más específicas (ej: /usuario/:id_usuario) antes de "/:id"
 * - Crear diseño exige: token + MP vinculado
 */

// Listado general
router.get('/', getDisenos);
router.get('/:id/autor', getMasDelAutor);
// Diseños de un usuario (debe ir antes que "/:id" para no colisionar)
router.get('/usuario/:id_usuario', verificarToken, getDisenosUsuario);

// Detalle por ID
router.get('/:id', getDisenoById);

// Crear diseño (blindado)
router.post(
  '/',
  verificarToken,       // requiere sesión
  requireMPLinked,      // exige MP vinculado
  agregarApodo,         // agrega apodo a req si lo usás en el controller
  uploadDiseno,         // multer para imágenes/archivos
  crearDiseno
);

// Actualizar diseño
router.put(
  '/:id',
  verificarToken,
  // requireMPLinked,    // opcional: si querés exigir MP también para editar
  uploadDisenoPUT,       // usa el middleware específico para PUT
  updateDiseno
);

// Eliminar diseño
router.delete('/:id', verificarToken, eliminarDiseno);

// Borrar imagen individual
router.delete('/imagen/:id_imagen', verificarToken, eliminarImagenDiseno);

// Seleccionar portada
router.put('/imagen/:id_imagen/portada', verificarToken, seleccionarPortada);

export default router;
