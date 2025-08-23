// middlewares/uploadDiseno.js
import multer from 'multer';
import { cloudinary } from '../lib/cloudinary.js';

// Multer en memoria: los archivos quedan en req.files como buffer, no se suben automáticamente
const storage = multer.memoryStorage();

export const uploadDiseno = multer({ storage }).fields([
  { name: 'archivo_3d', maxCount: 1 },
  { name: 'imagenes', maxCount: 5 }
]);

// Helper para subir archivos a Cloudinary
export const subirArchivoCloudinary = (fileBuffer, tipo = 'image', carpeta = '', publicId = null) => {
  return new Promise((resolve, reject) => {
    const params = { resource_type: tipo };
    if (carpeta) params.folder = carpeta;
    if (publicId) params.public_id = publicId;

    const stream = cloudinary.uploader.upload_stream(params, (error, result) => {
      if (error) reject(error);
      else resolve(result.secure_url);
    });

    stream.end(fileBuffer);
  });
};
