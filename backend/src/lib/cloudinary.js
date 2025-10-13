// src/lib/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===== Avatares (públicos, nombre único) =====
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `usuarios/${req.body.apodo}/avatar`,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    resource_type: "image",
    access_mode: "public", // explícito
  }),
});

// ===== Archivos 3D (PRIVADOS y firmados) =====
// Requisitos: raw + authenticated, si no, NO se puede firmar para descarga.
const storageDiseno3D = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const slug = (req.body.slug || req.body.titulo || "sin_nombre")
      .toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, "");
    // Validar extensión de forma simple
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const permitidas = ["stl", "obj", "3mf", "zip"];
    if (!permitidas.includes(ext)) {
      throw new Error("Formato no permitido. Usa STL, OBJ, 3MF o ZIP.");
    }
    return {
      folder: `usuarios/${req.usuario?.apodo}/disenos/${slug}/archivos_3d`,
      public_id: `${slug}_3dfile`,
      resource_type: "raw",
      access_mode: "authenticated",
      use_filename: true,
      unique_filename: false,
      overwrite: true, // podés reemplazar el archivo
    };
  },
});

// ===== Imágenes de diseños (públicas, nombre único) =====
const storageDisenoImagenes = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const slug = (req.body.slug || req.body.titulo || "sin_nombre")
      .toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, "");
    const baseName = file.originalname.split(".")[0];
    return {
      folder: `usuarios/${req.usuario?.apodo}/disenos/${slug}/imagenes`,
      public_id: `${slug}_${baseName}_${Date.now()}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      use_filename: false,
      unique_filename: false,
      overwrite: false,
      resource_type: "image",
      access_mode: "public",
    };
  },
});

export { cloudinary, storageAvatar, storageDiseno3D, storageDisenoImagenes };
