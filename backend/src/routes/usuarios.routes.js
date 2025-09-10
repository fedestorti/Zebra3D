// routes/usuarios.routes.js
import { Router } from 'express';
import {
  obtenerPerfilPorApodo,
  obtenerDisenosPorApodo,
  contarSeguidores,
  promedioResenas,
  estadoSeguirPorApodo,
  seguirUsuarioPorApodo,
  dejarDeSeguirUsuarioPorApodo,
  crearResena,
  updateBio,
  updateAvatar
} from '../controllers/usuarios.controller.js';
import { verificarToken } from '../middlewares/validarToken.js';

import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

const router = Router();

// 🔹 RUTAS PÚBLICAS
router.get('/:apodo/perfil', obtenerPerfilPorApodo);
router.get('/:apodo/disenos', obtenerDisenosPorApodo);
router.get('/:apodo/seguidores/count', contarSeguidores);
router.get('/:apodo/resenas/average', promedioResenas);

// 🔒 RUTAS PRIVADAS (requieren token)
router.get('/:apodo/seguidores/status', verificarToken, estadoSeguirPorApodo);
router.post('/:apodo/seguidores', verificarToken, seguirUsuarioPorApodo);
router.post('/:apodo/resenas', verificarToken, crearResena);
router.delete('/:apodo/seguidores', verificarToken, dejarDeSeguirUsuarioPorApodo);

// 🔒 NUEVAS RUTAS PARA EDITAR PERFIL
// Storage para Cloudinary (avatar)
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `usuarios/${req.user.apodo}/avatar`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    use_filename: true,
    unique_filename: false,
    overwrite: true
  })
});
const upload = multer({ storage: storageAvatar });

// Actualizar biografía
router.patch('/me', verificarToken, updateBio);

// Subir avatar
router.post('/me/avatar', verificarToken, upload.single('avatar'), updateAvatar);

export default router;
