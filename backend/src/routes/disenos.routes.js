import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { uploadDiseno }      from '../middlewares/uploadDiseno.js';
import { crearDiseno, obtenerDisenosConImagenes } from '../controllers/disenos.controller.js';

const router = Router();

// GET /api/disenos
router.get('/', obtenerDisenosConImagenes);

// POST /api/disenos
router.post(
  '/',
  verificarToken,
  (req, res, next) => {
    console.log('📥 Paso 1: Token verificado. Usuario:', req.usuario);
    next();
  },
  uploadDiseno,
  (req, res, next) => {
    console.log('📥 Paso 2: Archivos procesados por Multer');
    console.log('🖼️ req.files:', req.files);
    console.log('📎 req.body:', req.body);
    next();
  },
  crearDiseno
);

export default router;
