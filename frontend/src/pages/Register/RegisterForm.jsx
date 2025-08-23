import { useState, useRef, useEffect } from 'react';
import API from '../../api';
import './Register.css';
import BotonZebra from '../../components/BotonZebra/BotonZebra';
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../../../public/Fotos/AVatarDefault.png';


export default function RegisterForm() {
  const navigate = useNavigate();
  const captchaRef = useRef(null);
  const fileInputRef = useRef(null);
  // -------------------- Estado para mostrar contraseña --------------------
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);

  // Ocultar header al montar
  useEffect(() => {
    const header = document.querySelector('.encabezado');
    if (header) header.style.display = 'none';
    return () => { if (header) header.style.display = ''; };
  }, []);

  // -------------------- Estado del formulario --------------------
  const [form, setForm] = useState({
    apodo: '',
    nombre: '',
    apellido: '',
    email: '',
    contraseña: '',
    confirmarContraseña: '',
    avatar: null,
    pais: ''
  });

  const [mensaje, setMensaje] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorConfirmacion, setErrorConfirmacion] = useState('');
  const [emailValido, setEmailValido] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [captchaValido, setCaptchaValido] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // -------------------- Handlers --------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === 'contraseña') {
      validarContraseña(value);
      if (form.confirmarContraseña) validarCoincidencia(value, form.confirmarContraseña);
    }

    if (name === 'confirmarContraseña') {
      validarCoincidencia(form.contraseña, value);
    }

    if (name === 'email') validarEmail(value);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, avatar: file });
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const resetFormulario = () => {
    setForm({ apodo:'', nombre:'', apellido:'', email:'', contraseña:'', confirmarContraseña:'', avatar:null, pais:'' });
    setErrorPassword('');
    setErrorConfirmacion('');
    setEmailValido(true);
    setAvatarPreview(null);
    setCaptchaValido(false);
    captchaRef.current?.reset();
  };

  // -------------------- Validaciones --------------------
  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValido(regex.test(email));
  };

  const validarContraseña = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!-/:-@[-`{-~]).{8,}$/;
    setErrorPassword(!regex.test(password) ? '❌ Debe tener 8 caracteres, una mayúscula, minúscula, número y símbolo' : '');
  };

  const validarCoincidencia = (pass1, pass2) => {
    setErrorConfirmacion(pass1 !== pass2 ? '❌ Las contraseñas no coinciden' : '');
  };

  // -------------------- Submit --------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    // Validaciones básicas
    if (!form.apodo.trim() || !form.nombre.trim() || !form.apellido.trim() || !form.email.trim() || !form.contraseña.trim() || !form.confirmarContraseña.trim()) {
      setMensaje("⚠️ Completá todos los campos obligatorios.");
      return;
    }

    if (errorPassword || errorConfirmacion || !emailValido) {
      setMensaje("⚠️ Revisá los errores en el formulario.");
      return;
    }

    if (!captchaValido) {
      setMensaje("⚠️ Tenés que completar el reCAPTCHA.");
      return;
    }


    setEnviando(true);

    try {
      const { confirmarContraseña, avatar, contraseña, ...resto } = form;
      const usuario = { ...resto, contrasena: contraseña }; // renombrar para backend

      const formData = new FormData();
      Object.keys(usuario).forEach(key => formData.append(key, usuario[key]));
      formData.append('avatar', avatar);

      const res = await API.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      resetFormulario();
      setMensaje(res.data.message || '✅ Usuario registrado con éxito');
      setEnviando(false);
      setTimeout(() => navigate('/login'), 1300);

    } catch (error) {
      console.error('🔴 Error completo:', error.response?.data);
      const mensajeError = error.response?.data?.error;
      setMensaje(mensajeError || '❌ Error al registrar usuario');
      setEnviando(false);
    }
  };

  // -------------------- JSX --------------------
  return (
    <div className="register-container">
      <button className="flecha-volver" onClick={() => navigate('/principal')} aria-label="Volver">❮</button>
      <h2 className="register-title">Inscripción</h2>

      <form onSubmit={handleSubmit} className="register-form">
        {/* Avatar */}

        <div className="avatar-preview-wrapper">
  <div
    className="avatar-preview-circle"
    onClick={() => fileInputRef.current.click()}
    title="Cambiar avatar"
    style={{
      backgroundImage: avatarPreview
        ? `url(${avatarPreview})`
        : `url(${defaultAvatar})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  >
    {!avatarPreview && <span className="avatar-placeholder">📷</span>}
  </div>
  <input
    type="file"
    name="avatar"
    accept="image/*"
    ref={fileInputRef}
    style={{ display: 'none' }}
    onChange={handleAvatarChange}
  />
</div>


        {/* Inputs */}
        <input type="text" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} required/>
        <input type="text" name="apellido" placeholder="Apellido" value={form.apellido} onChange={handleChange} required/>
        <input type="text" name="apodo" placeholder="Apodo" value={form.apodo} onChange={handleChange} required/>
        <input type="text" name="pais" placeholder="País" value={form.pais} onChange={handleChange}/>
        <input type="email" name="email" placeholder="Correo electrónico" value={form.email} onChange={handleChange} required className={emailValido ? '' : 'input-error'}/>
        {!emailValido && <p className="register-error fade-in">❌ Email inválido</p>}
          <div className="password-wrapper"> 
            <input type={mostrarPassword ? 'text' : 'password'} name="contraseña" placeholder="Contraseña" value={form.contraseña} onChange={handleChange} required className={errorPassword ? 'input-error' : ''}/>
           <button type="button" className="show-password-btn" onClick={() => setMostrarPassword(!mostrarPassword)} title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} > {mostrarPassword ? '🔒' : '🔓'}  </button>
          </div>
        {errorPassword && <p className="register-error fade-in">{errorPassword}</p>}
          <div className="password-wrapper">
            <input type={mostrarConfirmPassword ? 'text' : 'password'} name="confirmarContraseña" placeholder="Confirmar contraseña" value={form.confirmarContraseña} onChange={handleChange} required className={errorConfirmacion ? 'input-error' : ''}/>
            <button type="button" className="show-password-btn" onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)} title={mostrarConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"} > {mostrarConfirmPassword ? '🔒' : '🔓'} </button>
          </div>
        {errorConfirmacion && <p className="register-error fade-in">{errorConfirmacion}</p>}

        {/* reCAPTCHA */}
        <div className="recaptcha-container">
          <ReCAPTCHA sitekey="6LcUII8rAAAAAJ3BXW9sbG0ZIqD4pEFgaVj8v5kN" onChange={() => setCaptchaValido(true)} ref={captchaRef}/>
        </div>

        {/* Mensaje */}
        {mensaje && <p className="register-message fade-in">{mensaje}</p>}

        <BotonZebra texto="Inscripción" enviando={enviando} style={{ width: '100%' }}/>
      </form>
    </div>
  );
}
