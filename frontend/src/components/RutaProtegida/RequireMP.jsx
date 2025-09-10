import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function RequireMP({ children }) {
  const { usuario } = useAuth();
  const [ok, setOk] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!usuario) {
        setOk(false);
        return;
      }
      try {
        const { data } = await API.get('/auth/me');
        if (alive) setOk(Boolean(data?.vinculado));
      } catch {
        if (alive) setOk(false);
      }
    })();
    return () => { alive = false; };
  }, [usuario]);

  if (ok === null) return null; // todavía verificando

  return ok ? children : <Navigate to="/vincular-mp" replace />;
}
