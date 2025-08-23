//backend/src/routes/auth.routes.js
import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { uploadImagen } from '../lib/multer.js';
import { verificarToken } from '../middlewares/validarToken.js';
import { obtenerPerfil } from '../controllers/auth.controller.js';
import { verificarUsuario } from '../middlewares/validarRegistro.js';
const router = Router();

// Registro con avatar
router.post('/register', verificarUsuario, uploadImagen, authController.register)

// Login
router.post('/login', authController.login);

// Perfil
router.get('/perfil', verificarToken, obtenerPerfil);

export default router;

