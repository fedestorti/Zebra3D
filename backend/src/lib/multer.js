// src/lib/multer.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const nombreOriginal = file.originalname.replace(/\s+/g, '_');
    return {
      folder: `usuarios/${req.body.apodo}/avatar`,
      public_id: nombreOriginal.split('.').slice(0, -1).join('.'),
      format: file.mimetype.split('/')[1],
      overwrite: true
    };
  }
});

export const uploadImagen = multer({ storage: storageAvatar }).single('avatar');
