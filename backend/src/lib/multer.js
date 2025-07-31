import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

// 📁 Avatares
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

export const uploadImagen = multer({ storage: storageAvatar }).single('avatar');
