//src/lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storageImagenes = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars', // o 'imagenes'
    allowed_formats: ['jpg', 'png', 'jpeg']
  }
});

const storageArchivos3D = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'archivos3d',
    allowed_formats: ['stl', 'obj', 'zip']
  }
});

// 👇 Esta línea es crucial
export { cloudinary, storageImagenes, storageArchivos3D };

