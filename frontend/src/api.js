//frontend/src/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Interceptor que agrega el token automáticamente a todas las solicitudes
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default API;

// Ejemplo de función específica
export async function obtenerPerfilUsuario() {
  try {
    const res = await API.get('/auth/perfil'); // interceptor agrega token
    return res.data;
  } catch (error) {
    console.error('❌ Error al obtener el perfil del usuario:', error);
    throw error;
  }
}
