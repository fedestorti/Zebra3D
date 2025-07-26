import { useState } from 'react';
import API from '../../api'; // Asegurate que apunta bien a tu axios

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', contraseña: '' });
  const [mensaje, setMensaje] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    try {
      const res = await API.post('/auth/login', form);

      const { token, usuario } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      setMensaje('✅ Sesión iniciada correctamente');

      // Redirigir o navegar según tu app
      window.location.href = '/public/MenuPrincipal/index.html'; // cambiá si usás rutas con React Router
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
      const msg = error.response?.data?.error || '❌ Error al iniciar sesión';
      setMensaje(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <input
        type="email"
        name="email"
        placeholder="Correo electrónico"
        value={form.email}
        onChange={handleChange}
        required
      />

      <input
        type="password"
        name="contraseña"
        placeholder="Contraseña"
        value={form.contraseña}
        onChange={handleChange}
        required
      />

      <button type="submit" className="login-button">
        Iniciar Sesión
      </button>

      {mensaje && <p className="login-message fade-in">{mensaje}</p>}
    </form>
  );
}
