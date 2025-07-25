import express from 'express';
import { subirDiseno } from '../controllers/disenos.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { uploadImagen, uploadArchivo3D } from '../lib/multer.js';

const router = express.Router();

// 👇 Ruta para subir un diseño
router.post(
  '/',
  verificarToken,
  uploadImagen.single('imagen_portada'),  // 📸 Sube portada a Cloudinary
  uploadArchivo3D.single('archivo_3d'),  // 📦 Sube archivo 3D a Cloudinary
  subirDiseno
);

export default router;
