import { useState } from 'react';
import API from '../../api';
import './Register.css';

export default function RegisterForm() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    contraseña: '',
    confirmarContraseña: ''
  });
  const [mensaje, setMensaje] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorConfirmacion, setErrorConfirmacion] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === 'contraseña') {
      validarContraseña(value);
      if (form.confirmarContraseña) {
        validarCoincidencia(value, form.confirmarContraseña);
      }
    }

    if (name === 'confirmarContraseña') {
      validarCoincidencia(form.contraseña, value);
    }
  };

  const validarContraseña = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!regex.test(password)) {
      setErrorPassword('❌ Debe tener 8 caracteres, una mayúscula, minúscula, número y símbolo');
    } else {
      setErrorPassword('');
    }
  };

  const validarCoincidencia = (pass1, pass2) => {
    if (pass1 !== pass2) {
      setErrorConfirmacion('❌ Las contraseñas no coinciden');
    } else {
      setErrorConfirmacion('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (errorPassword || errorConfirmacion) {
      setMensaje('⚠️ Revisá los errores en el formulario.');
      return;
    }

    try {
      const { confirmarContraseña, ...usuario } = form; // No enviamos "confirmarContraseña"
      const res = await API.post('/auth/register', usuario);
      setMensaje(res.data.message || '✅ Usuario registrado con éxito');
      setForm({ nombre: '', apellido: '', email: '', contraseña: '', confirmarContraseña: '' });
    } catch (error) {
      console.error(error);
      setMensaje(error.response?.data?.error || '❌ Error al registrar usuario');
    }
  };

  return (
    <div className="register-container">
      <h2 className="register-title">Inscripción</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
          required
        />
  
        <input
          type="text"
          name="apellido"
          placeholder="Apellido"
          value={form.apellido}
          onChange={handleChange}
          required
        />
  
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
          className={errorPassword ? 'input-error' : ''}
        />
        {errorPassword && (
          <p className="register-error fade-in">{errorPassword}</p>
        )}
  
        <input
          type="password"
          name="confirmarContraseña"
          placeholder="Confirmar contraseña"
          value={form.confirmarContraseña}
          onChange={handleChange}
          required
          className={errorConfirmacion ? 'input-error' : ''}
        />
        {errorConfirmacion && (
          <p className="register-error fade-in">{errorConfirmacion}</p>
        )}
  
        <button
          className="Confirma"
          type="submit"
          disabled={!!errorPassword || !!errorConfirmacion}
        >
          Inscripción
        </button>
      </form>
  
      {mensaje && <p className="register-message fade-in">{mensaje}</p>}
    </div>
  );
  
  
}
