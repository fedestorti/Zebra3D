// middlewares/uploadDiseno.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    console.log(`☁️ Procesando: ${file.fieldname} → ${file.originalname}`);
    if (file.fieldname === 'archivo_3d') {
      return {
        folder: 'archivos_3d',
        resource_type: 'raw'
        // <— removimos allowed_formats
      };
    }
    if (file.fieldname === 'imagenes') {
      return {
        folder: 'imagenes_diseno'
        // <— removimos allowed_formats
      };
    }
    return { folder: 'otros' };
  }
});

export const uploadDiseno = multer({ storage }).fields([
  { name: 'archivo_3d', maxCount: 1 },
  { name: 'imagenes',   maxCount: 5 }
]);
