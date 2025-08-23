// src/lib/multerDisenos.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from './cloudinary.js';

// Para el archivo 3D del diseño
const storageDiseno3D = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const tituloSeguro = req.body.titulo.replace(/\s+/g, '_');
    return {
      folder: `usuarios/${req.usuario.apodo}/disenos/diseno`,
      public_id: tituloSeguro,
      resource_type: 'auto', // necesario para stl/obj
      overwrite: true
    };
  }
});

// Para las imágenes del diseño
const storageDisenoImagenes = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const tituloSeguro = req.body.titulo.replace(/\s+/g, '_');
    const indice = file.originalname.split('.')[0]; // opcional, para no pisarse
    return {
      folder: `usuarios/${req.usuario.apodo}/disenos/imagenes`,
      public_id: `${tituloSeguro}_${indice}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      overwrite: true
    };
  }
});

// Multer
export const uploadDiseno = multer({
  storage: multer.diskStorage({}) // placeholder, se reemplaza con array de campos
}).fields([
  { name: 'archivo_3d', maxCount: 1 },
  { name: 'imagenes', maxCount: 5 }
]);
