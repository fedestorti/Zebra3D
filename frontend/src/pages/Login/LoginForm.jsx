import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import BotonZebra from '../../components/BotonZebra/BotonZebra';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', contrasena: '' });
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 🆕 Agrega clase al body solo en login
  useEffect(() => {
    document.body.classList.add('ocultar-acciones-header');
    return () => {
      document.body.classList.remove('ocultar-acciones-header');
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setEnviando(true);

    try {
      const res = await API.post('/auth/login', form);
      const { token } = res.data;

      login(token);

      setTimeout(() => {
        setEnviando(false);
        navigate('/');
      }, 1500);
    } catch (error) {
      const msg = error.response?.data?.error || '❌ Email o Contraseña incorrecta';
      setMensaje(msg);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
      />

      <input
        type="password"
        name="contrasena"
        placeholder="Contraseña"
        value={form.contrasena}
        onChange={handleChange}
        required
      />

      <BotonZebra
        texto={enviando ? 'Iniciando...' : 'Iniciar Sesión'}
        type="submit"
        enviando={enviando}
        disabled={enviando}
      />

      {mensaje && <p className="login-message fade-in">{mensaje}</p>}
    </form>
  );
}
