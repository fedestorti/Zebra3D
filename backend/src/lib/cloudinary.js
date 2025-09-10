// src/lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 📁 Avatares por usuario (mantiene nombre original, pero evita sobrescritura)
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `usuarios/${req.body.apodo}/avatar`,
    allowed_formats: ['jpg', 'jpeg', 'png'],
    use_filename: true,
    unique_filename: true,    // ✅ Agrega hash para evitar conflictos
    overwrite: false          // ❌ No sobrescribe si existe
  })
});

// 📁 Archivos 3D de diseños (puede sobrescribir si subís el mismo diseño)
const storageDiseno3D = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const slug = req.body.slug || req.body.titulo?.replace(/\s+/g, '_') || 'sin_nombre';
    return {
      folder: `usuarios/${req.usuario?.apodo}/disenos/${slug}/archivos_3d`,
      public_id: `${slug}_3dfile`,
      resource_type: 'auto',
      overwrite: true         // ✅ OK si querés reemplazar el archivo STL
    };
  }
});

// 📁 Imágenes de diseños (una por una, con nombre único)
const storageDisenoImagenes = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const slug = req.body.slug || req.body.titulo?.replace(/\s+/g, '_') || 'sin_nombre';
    const baseName = file.originalname.split('.')[0];
    return {
      folder: `usuarios/${req.usuario?.apodo}/disenos/${slug}/imagenes`,
      public_id: `${slug}_${baseName}_${Date.now()}`, // ✅ único por timestamp
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      use_filename: false,
      unique_filename: false,
      overwrite: false        // ❌ No se pisa con otra imagen
    };
  }
});

export { cloudinary, storageAvatar, storageDiseno3D, storageDisenoImagenes };
