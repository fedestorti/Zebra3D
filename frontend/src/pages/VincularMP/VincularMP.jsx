// frontend/src/pages/VincularMP/VincularMP.jsx
import API from '../../api';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './VincularMP.css';

export default function VincularMP() {
  const navigate = useNavigate();

  const handleVincular = async () => {
    try {
      const { data } = await API.get('/mp/vincular-url');
      if (data?.url) {
        // 👉 Abrir en popup
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
    const handler = (event) => {
      if (event.origin !== "http://localhost:5173") return; // seguridad
      if (event.data?.source === "mercadopago") {
        if (event.data.status === "ok") {
          alert("✅ Tu cuenta de Mercado Pago fue vinculada con éxito");
          navigate('/principal'); // o refrescar perfil
        } else {
          alert("❌ Error al vincular MP: " + (event.data.reason || "desconocido"));
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigate]);

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
