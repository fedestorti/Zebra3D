// backend/src/config.js
import "dotenv/config";

export const PORT = process.env.PORT || 4000;
export const IS_PROD = process.env.NODE_ENV === "production";

export const WEB_URL = process.env.WEB_URL || "http://localhost:5173";

// JWT: usa SIEMPRE estos nombres
export const JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "dev_access_secret";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";

// Podés dejar otros envs aquí si los necesitás:
export const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";
export const MP_CLIENT_ID = process.env.MP_CLIENT_ID || "";
export const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET || "";
export const MP_REDIRECT_URI = process.env.MP_REDIRECT_URI || "";

// Aviso si faltan envs de MP (opcional)
if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !MP_REDIRECT_URI) {
  console.error("❌ MP env faltantes:", {
    MP_CLIENT_ID: !!MP_CLIENT_ID,
    MP_CLIENT_SECRET: !!MP_CLIENT_SECRET,
    MP_REDIRECT_URI: !!MP_REDIRECT_URI,
  });
}
