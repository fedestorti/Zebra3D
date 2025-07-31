//frontend/src/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api', // Cambia si tu backend usa otro puerto
});

export default API;

export async function obtenerPerfilUsuario() {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Token no encontrado');

    const res = await API.get('/auth/perfil', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return res.data;
  } catch (error) {
    console.error('❌ Error al obtener el perfil del usuario:', error);
    throw error;
  }
}