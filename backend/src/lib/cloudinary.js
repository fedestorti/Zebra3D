import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// 🔑 Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 📦 Storage para imágenes
const storageImagenes = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'Proyecto3D/imagenes',
    allowed_formats: ['jpg', 'png']
  }
});

// 📦 Storage para archivos 3D
const storageArchivos3D = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'Proyecto3D/archivos3d',
    allowed_formats: ['stl', 'obj']
  }
});

export { cloudinary, storageImagenes, storageArchivos3D };
