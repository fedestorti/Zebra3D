// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true,
});

// -------------------- utils --------------------
function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function hasCookie(name) {
  return document.cookie.split("; ").some(p => p.startsWith(name + "="));
}

export async function ensureCsrf() {
  if (!getCookie("csrf_token")) {
    try { await API.get("/auth/csrf"); } catch {}
  }
}

// -------------------- request interceptor --------------------
API.interceptors.request.use((config) => {
  const csrf = getCookie("csrf_token");
  if (csrf) config.headers["X-CSRF-Token"] = csrf;

  // Si alguna vez usaste bearer opcional:
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  else delete config.headers.Authorization;

  return config;
});

// -------------------- response interceptor --------------------
let refreshing = null;
const NO_RETRY_URLS = ["/auth/logout"]; // nunca intentes refresh para estas

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // No reintentar en rutas bloqueadas
    if (original?.url && NO_RETRY_URLS.some(u => original.url.includes(u))) {
      return Promise.reject(error);
    }
    // Sin response o ya reintentado: afuera
    if (!error.response || original?._retry) {
      return Promise.reject(error);
    }

    // 403 → conseguí CSRF y reintento UNA vez
    if (error.response.status === 403) {
      try {
        await ensureCsrf();
        original._retry = true;
        return API(original);
      } catch {
        return Promise.reject(error);
      }
    }

    // 401 → solo intento refresh si HAY cookie refresh_token
    if (error.response.status === 401) {
      if (!hasCookie("refresh_token")) {
        // usuario no logueado todavía; no sigas spameando /refresh
        return Promise.reject(error);
      }
      try {
        if (!refreshing) {
          await ensureCsrf(); // si /refresh está protegido por CSRF
          refreshing = API.post("/auth/refresh").finally(() => {
            refreshing = null;
          });
        }
        await refreshing;
        original._retry = true;
        return API(original);
      } catch {
        localStorage.removeItem("token");
        delete API.defaults.headers.common["Authorization"];
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default API;

// ✅ helper: devuelve perfil o null sin spam
export async function obtenerPerfilUsuario() {
  try {
    const res = await API.get("/auth/me");
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) return null;
    throw err;
  }
}

export async function fetchDescargas() {
  const { data } = await API.get("/descargas");
  return data;
}

// Genera link firmado de corta duración para un item
export async function pedirLinkDescarga(id_item) {
  const { data } = await API.post(`/descargas/${id_item}/link`);
  return data; // { url, expiresAt }
}