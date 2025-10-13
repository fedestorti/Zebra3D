// src/lib/downloads.js
import { cloudinary } from "./cloudinary.js";

export function crearLinkPrivado({ publicId, format, ttlSeg = 300, nombre = "archivo" }) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeg;
  const url = cloudinary.utils.private_download_url(
    publicId,     // ej: "usuarios/fede/disenos/mi_cosa/archivos_3d/mi_cosa_3dfile"
    format,       // "stl", "obj", etc
    {
      resource_type: "raw",
      expires_at: expiresAt,
      attachment: `${nombre}.${format}`, // fuerza descarga con nombre lindo
    }
  );
  return { url, expiresAt };
}
