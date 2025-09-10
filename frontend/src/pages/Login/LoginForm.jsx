import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import BotonZebra from '../../components/BotonZebra/BotonZebra';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', contrasena: '' });
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('ocultar-acciones-header');
    return () => {
      document.body.classList.remove('ocultar-acciones-header');
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setEnviando(true);

    try {
      // ✅ Usamos el login del AuthContext (NO hagas el POST acá otra vez)
      await login(form.email, form.contrasena);

      setEnviando(false);
      navigate('/');
    } catch (error) {
      const msg =
        error?.response?.data?.mensaje ||
        error?.response?.data?.error ||
        '❌ Email o contraseña incorrecta';
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
        autoComplete="email"
      />

      <div className="password-container">
        <input
          type={mostrarContrasena ? 'text' : 'password'}
          name="contrasena"
          placeholder="Contraseña"
          value={form.contrasena}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />
        <button
          type="button"
          className="mostrar-contrasena-btn"
          onClick={() => setMostrarContrasena((v) => !v)}
          aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {mostrarContrasena ? '🙈' : '👁️'}
        </button>
      </div>

      <BotonZebra
        texto={enviando ? 'Iniciando...' : 'Iniciar Sesión'}
        type="submit"
        enviando={enviando}
        disabled={enviando}
      />

      {mensaje && <p className="login-message fade-in">{mensaje}</p>}

      <p>----------------- O -------------------</p>

      <button
        type="button"
        className="boton-registrarse"
        onClick={() => navigate('/register')}
      >
        Registrarse
      </button>
    </form>
  );
}
