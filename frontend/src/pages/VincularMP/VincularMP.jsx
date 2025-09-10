import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import API from '../../api';
import './VincularMP.css';

export default function VincularMP() {
  const navigate = useNavigate();
  const { refreshUsuario } = useAuth(); // <- importante

  const handleVincular = async () => {
    try {
      const { data } = await API.get('/mp/vincular-url', { withCredentials: true });
      if (data?.url) {
        window.open(data.url, "mpPopup", "width=600,height=700");
      } else {
        alert('No se pudo generar la URL de vinculación');
      }
    } catch (err) {
      console.error('Error al vincular MP:', err);
      alert('Sesión inválida o expirada, volvé a iniciar sesión.');
      navigate('/login');
    }
  };

  useEffect(() => {
    const handler = async (event) => {
      if (event.origin !== "http://localhost:5173") return;
      if (event.data?.source === "mercadopago") {
        if (event.data.status === "ok") {
          alert("✅ Tu cuenta de Mercado Pago fue vinculada con éxito");

          try {
            await refreshUsuario(); // <- actualizás los datos del usuario en contexto
          } catch (e) {
            console.warn("No se pudo refrescar el usuario");
          }

          navigate('/principal');
        } else {
          alert("❌ Error al vincular MP: " + (event.data.reason || "desconocido"));
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigate, refreshUsuario]);

  return (
    <div className="vincular-mp-page">
      <div className="vincular-card">
        <h1>🔗 Vinculá tu cuenta de Mercado Pago</h1>
        <p>Conectá tu cuenta para recibir pagos de tus ventas.</p>
        <button className="btn-vincular" onClick={handleVincular}>
          Conectar con Mercado Pago
        </button>
        <button className="btn-volver" onClick={() => navigate('/principal')}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
