import { useState, useRef } from 'react';
import API from '../../api';
import './Register.css';
import BotonZebra from '../../components/BotonZebra/BotonZebra';
import ReCAPTCHA from "react-google-recaptcha";

export default function RegisterForm() {

//-----------------------------------------------------------
const [form, setForm] = useState({
  apodo: '',
  nombre: '',
  apellido: '',
  email: '',
  contraseña: '',
  confirmarContraseña: '',
  avatar_url: '',
  pais: ''
});


  const [mensaje, setMensaje] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorConfirmacion, setErrorConfirmacion] = useState('');
  const [emailValido, setEmailValido] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [captchaValido, setCaptchaValido] = useState(false);
  const captchaRef = useRef(null);

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

    if (name === 'email') {
      validarEmail(value);
    }
  };

//-----------------------------------------------------------
  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValido(regex.test(email));
  };

//-----------------------------------------------------------
  const validarContraseña = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!regex.test(password)) {
      setErrorPassword('❌ Debe tener 8 caracteres, una mayúscula, minúscula, número y símbolo');
    } else {
      setErrorPassword('');
    }
  };

//-----------------------------------------------------------
  const validarCoincidencia = (pass1, pass2) => {
    if (pass1 !== pass2) {
      setErrorConfirmacion('❌ Las contraseñas no coinciden');
    } else {
      setErrorConfirmacion('');
    }
  };
  
//-----------------------------------------------------------
const [intentoEnvio, setIntentoEnvio] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();

    setMensaje('');

    if (
      !form.nombre.trim() ||
      !form.apellido.trim() ||
      !form.email.trim() ||
      !form.contraseña.trim() ||
      !form.confirmarContraseña.trim()
    ) {
      setMensaje("⚠️ Completá todos los campos obligatorios.");
      return;
    }

    if (errorPassword || errorConfirmacion || !emailValido) {
      setMensaje("⚠️ Revisá los errores en el formulario.");
      return;
    }

    setIntentoEnvio(true);

    if (!captchaValido) {
      setMensaje("⚠️ Tenés que completar el reCAPTCHA.");
      return;
    }

    setEnviando(true);

    try {
      const { confirmarContraseña, ...usuario } = form;
      const res = await API.post('/auth/register', usuario);

      setForm({
        nombre: '',
        apellido: '',
        email: '',
        contraseña: '',
        confirmarContraseña: ''
      });

      setTimeout(() => {
        setMensaje(res.data.message || '✅ Usuario registrado con éxito');
        setEnviando(false);
      }, 2500);
    } catch (error) {
      console.error('🔴 Error completo:', error.response?.data);

      const mensajeError = error.response?.data?.error;
      const texto = mensajeError === 'El email ya está registrado'
        ? '❌ Este correo ya está registrado. Probá con otro.'
        : mensajeError || '❌ Error al registrar usuario';

      setTimeout(() => {
        setMensaje(texto);
        setEnviando(false);
      }, 2500);
    }
  };

//-----------------------------------------------------------  
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
          type="text"
          name="apodo"
          placeholder="Apodo"
          value={form.apodo}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="avatar_url"
          placeholder="URL del avatar (opcional)"
          value={form.avatar_url}
          onChange={handleChange}
        />
        <input
          type="text"
          name="pais"
          placeholder="País"
          value={form.pais}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={handleChange}
          required
          className={emailValido ? '' : 'input-error'}
        />
        {!emailValido && (
          <p className="register-error fade-in">❌ Email inválido</p>
        )}
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

        <div className="recaptcha-container">
          <ReCAPTCHA
            sitekey="6LcUII8rAAAAAJ3BXW9sbG0ZIqD4pEFgaVj8v5kN"
            onChange={(value) => {
              console.log("✅ reCAPTCHA completado:", value);
              setCaptchaValido(true);
            }}
            ref={captchaRef}
          />
          </div>

            {mensaje && <p className="register-message fade-in">{mensaje}</p>}
        

        <BotonZebra
          texto="Inscripción"
          enviando={enviando}
          style={{ width: '100%' }}
        />
      </form>

      
    </div>
  );
}
