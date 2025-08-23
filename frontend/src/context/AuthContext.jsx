// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { obtenerPerfilUsuario } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true); // 👈 nuevo

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false); // ✅ no hay token → dejar de cargar
      return;
    }

    obtenerPerfilUsuario()
      .then(user => {
        setUsuario(user);
        setLoading(false); // ✅ cargado
      })
      .catch(err => {
        localStorage.removeItem('token');
        setUsuario(null);
        setLoading(false); // ✅ error → también termina
      });
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    obtenerPerfilUsuario()
      .then(user => setUsuario(user))
      .catch(() => setUsuario(null));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
