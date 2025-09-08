//disenos.routes.js
import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { uploadDiseno }      from '../middlewares/uploadDiseno.js';
import { crearDiseno, getDisenos,getDisenoById
,getDisenosUsuario, eliminarDiseno, eliminarImagenDiseno, seleccionarPortada,updateDiseno } from '../controllers/disenos.controller.js';
import { agregarApodo } from '../middlewares/usuarios.middleware.js';
import { uploadDisenoPUT } from '../middlewares/uploadDisenoPUT.js';
const router = Router();

// GET /api/disenos
router.get('/', getDisenos,getDisenoById);
router.get("/:id", getDisenoById);
// POST /api/disenos
router.post(
  '/',
  verificarToken,
  agregarApodo,
  uploadDiseno,
  crearDiseno
);
router.get('/usuario/:id_usuario', verificarToken, getDisenosUsuario);
router.put(
  "/:id",
  verificarToken,   // primero verificar token y poner req.usuario
  uploadDiseno,     // luego multer para procesar archivos
  updateDiseno
);
router.delete('/:id', verificarToken, eliminarDiseno);
// Borrar imagen individual
router.delete("/imagen/:id_imagen",verificarToken, eliminarImagenDiseno);
// Seleccionar portada
router.put("/imagen/:id_imagen/portada",verificarToken, seleccionarPortada);

export default router;
