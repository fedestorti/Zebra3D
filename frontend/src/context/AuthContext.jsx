import { createContext, useContext, useEffect, useState } from "react";
import API, { obtenerPerfilUsuario } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await obtenerPerfilUsuario();
        setUsuario(u);
      } catch (err) {
        if (err?.response?.status !== 401) {
          console.error("❌ Error inesperado al obtener perfil:", err);
        }
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, contrasena) => {
    try {
      

      const res = await API.post("/auth/login", { email, contrasena });


      const token = res.data?.token;
      if (token) {
        localStorage.setItem("token", token); // opcional si usás también por header
      } 

      const u = await obtenerPerfilUsuario();
      setUsuario(u);
    } catch (error) {
      console.error("❌ Error en login:", error.response?.data || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.warn("⚠️ Error al cerrar sesión:", err.message);
    }
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
