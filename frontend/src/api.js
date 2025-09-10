// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true, // incluye cookies en cada request
});

// 🔐 Función para obtener una cookie por nombre
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

// ⛑️ Interceptor para agregar el token CSRF si existe
API.interceptors.request.use((config) => {
  const csrf = getCookie("csrf_token");
  if (csrf) {
    config.headers["X-CSRF-Token"] = csrf;
  }

  // Agregá también el token JWT si lo estás usando desde localStorage
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;

// ✅ Función segura para obtener el perfil del usuario sin romper si no hay sesión
export async function obtenerPerfilUsuario() {
  try {
    const res = await API.get("/auth/me");
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      return null;
    }
    throw err;
  }
}
