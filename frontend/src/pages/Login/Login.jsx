// src/pages/Login/LoginForm.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BotonZebra from '../../components/BotonZebra/BotonZebra';
import './Login.css';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', contrasena: '' });
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('ocultar-acciones-header');
    return () => document.body.classList.remove('ocultar-acciones-header');
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
      await login(form.email, form.contrasena);
      navigate('/');
    } catch (error) {
      const msg =
        error?.response?.data?.mensaje ||
        error?.response?.data?.error ||
        '❌ Email o contraseña incorrecta';
      setMensaje(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="login-card">
        <h1 className="login-title">Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label className="field">
            <span className="field-label">Contraseña</span>
            <div className="password-container">
              <input
                type={mostrarContrasena ? 'text' : 'password'}
                name="contrasena"
                placeholder="Tu contraseña"
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
          </label>

          <BotonZebra
            texto={enviando ? 'Iniciando…' : 'Iniciar Sesión'}
            type="submit"
            enviando={enviando}
            disabled={enviando}
          />

          {mensaje && (
            <p className="login-message" role="alert" aria-live="polite">
              {mensaje}
            </p>
          )}

          <div className="divider" aria-hidden="true">
            <span>o</span>
          </div>

          <button
            type="button"
            className="boton-registrarse"
            onClick={() => navigate('/register')}
          >
            Crear cuenta
          </button>
        </form>
      </div>
    </div>
  );
}
