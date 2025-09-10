// frontend/src/components/AgregarDisenosButton/AgregarDisenosButton.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export default function AgregarDisenosButton({ className }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (!usuario) return navigate('/login');
    setLoading(true);
    try {
      const { data } = await API.get('/auth/me'); // { vinculado: boolean }
      navigate(data?.vinculado ? '/disenos' : '/vincular-mp');
    } catch {
      // token vencido o cualquier otro drama → que vincule
      navigate('/vincular-mp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className={className} onClick={onClick} disabled={loading}>
      {loading ? 'Verificando…' : 'Agregar Diseños'}
    </button>
  );
}
