import multer from 'multer';
import { storageImagenes, storageArchivos3D } from './cloudinary.js';

// 🎨 Multer para imagen de portada
export const uploadImagen = multer({ storage: storageImagenes });

// 📦 Multer para archivo 3D
export const uploadArchivo3D = multer({ storage: storageArchivos3D });

// 📂 Multer combinado para ambos campos
export const uploadAmbos = multer().fields([
  { name: 'imagen_portada', maxCount: 1 },
  { name: 'archivo_3d', maxCount: 1 }
]);
