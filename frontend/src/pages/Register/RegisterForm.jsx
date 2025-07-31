import { useState, useRef, useEffect } from 'react';
import API from '../../api';
import './Register.css';
import BotonZebra from '../../components/BotonZebra/BotonZebra';
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from 'react-router-dom';


export default function RegisterForm() {

  useEffect(() => {
    const header = document.querySelector('.encabezado'); // clase del <header>
    if (header) header.style.display = 'none';
  
    return () => {
      if (header) header.style.display = '';
    };
  }, []);

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
  const resetFormulario = () => {
    setForm({
      apodo: '',
      nombre: '',
      apellido: '',
      email: '',
      contraseña: '',
      confirmarContraseña: '',
      avatar: null,
      pais: ''
    });
  
    setErrorPassword('');
    setErrorConfirmacion('');
    setEmailValido(true);
    setAvatarPreview(null);
    setCaptchaValido(false);
    setIntentoEnvio(false);
  
    // Resetear el CAPTCHA visualmente
    captchaRef.current?.reset();
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
const [avatarPreview, setAvatarPreview] = useState(null); // vista previa
const fileInputRef = useRef(null);
const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  setMensaje('');

  // 🧪 Validaciones básicas
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

  if (!captchaValido) {
    setMensaje("⚠️ Tenés que completar el reCAPTCHA.");
    return;
  }

  if (!form.avatar) {
    setMensaje("⚠️ Tenés que seleccionar una imagen de avatar.");
    return;
  }

  setIntentoEnvio(true);
  setEnviando(true);

  try {
    const { confirmarContraseña, avatar, contraseña, ...resto } = form;

    // 🔁 Renombramos contraseña → contrasena
    const usuario = {
      ...resto,
      contrasena: contraseña
    };

    const formData = new FormData();
    for (const key in usuario) {
      formData.append(key, usuario[key]);
    }
    formData.append('avatar', avatar); // ✅ Campo correcto para Multer

    // 📡 Enviar solicitud
    const res = await API.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // 🧹 Limpiar formulario
    setForm({
      nombre: '',
      apellido: '',
      email: '',
      contraseña: '',
      confirmarContraseña: '',
      avatar: null
    });
    
    setAvatarPreview(null);
    resetFormulario();

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
      <button className="flecha-volver" onClick={() => navigate('/principal')} aria-label="Volver">
       ❮
      </button>
      <h2 className="register-title">Inscripción</h2>
      <form onSubmit={handleSubmit} className="register-form">

    <div className="avatar-preview-wrapper">
        <div
          className="avatar-preview-circle"
          onClick={() => fileInputRef.current.click()}
          title="Cambiar avatar"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="avatar-img" />
            ) : (
            <span className="avatar-placeholder">📷</span>
          )}
        </div>

        <input
          type="file"
          name="avatar"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              setForm({ ...form, avatar: file });
              setAvatarPreview(URL.createObjectURL(file));
            }
          }}
        />
    </div>
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
