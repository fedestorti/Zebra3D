//disenos.routes.js
import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { uploadDiseno }      from '../middlewares/uploadDiseno.js';
import { crearDiseno, getDisenos,getDisenoById } from '../controllers/disenos.controller.js';
import { agregarApodo } from '../middlewares/usuarios.middleware.js';

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

export default router;
