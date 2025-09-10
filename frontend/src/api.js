// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true, // incluye cookies (access/refresh/csrf)
});

// -------------------- utils --------------------
function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Si no hay csrf_token, lo pedimos una vez (opcional)
export async function ensureCsrf() {
  if (!getCookie("csrf_token")) {
    try {
      await API.get("/auth/csrf"); // el backend setea la cookie csrf_token (httpOnly:false)
    } catch {
      // silencio: si falla acá, la siguiente request fallará con 403 y sabrás dónde mirar
    }
  }
}

// -------------------- request interceptor --------------------
API.interceptors.request.use((config) => {
  // CSRF
  const csrf = getCookie("csrf_token");
  if (csrf) {
    // tu middleware lee req.headers["x-csrf-token"]
    config.headers["x-csrf-token"] = csrf;
  } else {
    // si no hay csrf, podés opcionalmente pedirlo en caliente
    // ojo con loops si lo hacés acá; por eso lo dejamos en ensureCsrf()
  }

  // JWT opcional (solo si realmente lo usás además de cookies)
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

// -------------------- response interceptor (auto-refresh) --------------------
let refreshing = null;

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Si no hay respuesta o ya reintentamos, no hagas locuras
    if (!error.response || original?._retry) {
      return Promise.reject(error);
    }

    // 403 por CSRF suele venir con cookie ausente o header mal
    if (error.response.status === 403) {
      // probamos obtener csrf y reintentar UNA vez
      try {
        await ensureCsrf();
        original._retry = true;
        return API(original);
      } catch {
        return Promise.reject(error);
      }
    }

    // 401: intentamos refresh (si backend usa refresh_token en cookie)
    if (error.response.status === 401) {
      try {
        if (!refreshing) {
          refreshing = API.post("/auth/refresh").finally(() => {
            refreshing = null;
          });
        }
        await refreshing;

        // tras refrescar, aseguramos csrf por si cambió
        await ensureCsrf();

        original._retry = true;
        return API(original);
      } catch {
        // si el refresh falla, limpiamos y a login
        localStorage.removeItem("token");
        // opcional: redirigir
        // window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default API;

// ✅ helper seguro: devuelve perfil o null si no hay sesión
export async function obtenerPerfilUsuario() {
  try {
    const res = await API.get("/auth/me");
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) return null;
    throw err;
  }
}
