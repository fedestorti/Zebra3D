//backend/src/routes/auth.routes.js
import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { uploadImagen } from '../lib/multer.js';
import { verificarToken } from '../middlewares/validarToken.js';
import { obtenerPerfil } from '../controllers/auth.controller.js';


const router = Router();

router.post('/register', uploadImagen, authController.register)
router.post('/login', authController.login); // descomentar cuando esté definido
router.get('/perfil', verificarToken, obtenerPerfil);


export default router;
