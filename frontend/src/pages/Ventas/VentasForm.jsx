// frontend/src/pages/Principal/LoginForm.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../../api';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', contrasena: '' });
  const [mensaje, setMensaje] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    try {
      const res = await API.post('/auth/login', form);
      const { token } = res.data;

      login(token); // guarda el token y carga usuario globalmente
      setMensaje('✅ Sesión iniciada correctamente');
      navigate('/'); // redirige a página principal
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
      const msg = error.response?.data?.error || '❌ Error al iniciar sesión';
      setMensaje(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h1>Ventas</h1>
    </form>
  );
}
