// middlewares/uploadDiseno.js
import multer from 'multer';
import { cloudinary } from '../lib/cloudinary.js';

// Multer en memoria: los archivos quedan en req.files como buffer
const storage = multer.memoryStorage();

export const uploadDiseno = multer({ storage }).fields([
  { name: 'archivo_3d', maxCount: 1 },
  { name: 'imagenes', maxCount: 5 }
]);

/**
 * Sube un archivo a Cloudinary de forma segura y con logs.
 * @param {Buffer} fileBuffer - El buffer del archivo.
 * @param {string} tipo - "image", "raw", o "auto" (Cloudinary detecta el tipo).
 * @param {string} carpeta - Carpeta en Cloudinary donde se guardará.
 * @param {string|null} publicId - Nombre específico del archivo.
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const subirArchivoCloudinary = (fileBuffer, tipo = 'auto', carpeta = '', publicId = null) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      console.warn('❌ Buffer vacío o nulo, no se puede subir archivo');
      return reject(new Error('Buffer vacío'));
    }

    const params = { resource_type: tipo };
    if (carpeta) params.folder = carpeta;
    if (publicId) params.public_id = publicId;

    console.log('➡️ Subiendo archivo a Cloudinary:', { tipo, carpeta, publicId, bufferLength: fileBuffer.length });

    const stream = cloudinary.uploader.upload_stream(params, (error, result) => {
      if (error) {
        console.error('❌ Error al subir a Cloudinary:', error.message);
        return reject(error);
      }
      console.log('✅ Archivo subido correctamente:', { url: result.secure_url, public_id: result.public_id });
      resolve({ url: result.secure_url, public_id: result.public_id });
    });

    stream.end(fileBuffer);
  });
};
