// src/lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 📁 Avatares por usuario, mantiene nombre original
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `usuarios/${req.body.apodo}/avatar`, // carpeta por usuario
    allowed_formats: ['jpg', 'jpeg', 'png'],
    use_filename: true,       // conserva nombre original
    unique_filename: false,   // no agrega caracteres extra
    overwrite: true           // sobrescribe si existe
  })
});

// 📁 Archivos 3D de diseños
const storageDiseno3D = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    console.log('👀 Apodo para carpeta 3D:', req.usuario?.apodo); // <- log agregado
    return {
      folder: `usuarios/${req.usuario?.apodo}/disenos/diseno`,
      public_id: req.body.titulo.replace(/\s+/g, '_'),
      resource_type: 'auto',
      overwrite: true
    };
  }
});

// 📁 Imágenes de diseños
const storageDisenoImagenes = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    console.log('👀 Apodo para carpeta imágenes:', req.usuario?.apodo); // <- log agregado
    return {
      folder: `usuarios/${req.usuario?.apodo}/disenos/imagenes`,
      public_id: `${req.body.titulo.replace(/\s+/g, '_')}_${file.originalname.split('.')[0]}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      overwrite: true
    };
  }
});

export { cloudinary, storageAvatar, storageDiseno3D, storageDisenoImagenes };

