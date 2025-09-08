// src/middlewares/uploadDisenoPUT.js
import multer from "multer";

// Multer en memoria (no se guarda en disco)
const storage = multer.memoryStorage();

const upload = multer({ storage });

export const uploadDisenoPUT = upload.fields([
  { name: "archivo_3d", maxCount: 1 },
  { name: "imagenes", maxCount: 5 }
]);