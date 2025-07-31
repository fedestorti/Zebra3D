// src/components/RutaProtegida/RutaProtegida.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RutaProtegida() {
  const { usuario, loading } = useAuth();

  if (loading) {
    return <div className="cargando">Cargando...</div>; // o un spinner
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
