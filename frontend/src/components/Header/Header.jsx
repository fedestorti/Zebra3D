// frontend/src/components/Header/Header.jsx
import './Header.css';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [mostrarMenu, setMostrarMenu] = useState(false);

  const toggleMenu = () => setMostrarMenu(!mostrarMenu);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMostrarMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="encabezado">
      <div className="lado-izquierdo">
  <img
    src="/Fotos/Logo/logoZebra.png"
    alt="Logo Zebra3D"
    className="Logoinicial"
    onClick={() => {
    navigate('/principal'); // va a la ruta
    navigate(0); // fuerza recarga (como F5)
    }}
    style={{ cursor: 'pointer' }}
  />
</div>

      <div className="contenido-header">
        {usuario ? (
          <div className="usuario-dropdown" ref={menuRef}>
            <div className="usuario-mini" onClick={toggleMenu} style={{ cursor: 'pointer' }}>
              {usuario.avatar_url && (
                <img 
                  src={usuario.avatar_url}
                  alt="Avatar"
                  style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '50%'
                  }}
                />
              )}
              <span className="flecha-abajo">▼</span>
            </div>

            {mostrarMenu && (
              <div className="menu-desplegable">
                <span>{usuario.apodo}</span>
                <button onClick={() => navigate('/perfil')}>Ver perfil</button>
                <button onClick={() => navigate('/mensajes')}>Mensajes</button>
                <hr />
                <button onClick={() => navigate('/disenos')}>Diseños</button>
                <button onClick={() => navigate('/descargas')}>Descargas</button>
                <button onClick={() => navigate('/ventas')}>Ventas</button>
                <button onClick={() => navigate('/comunidad')}>Comunidad</button>
                <button onClick={() => navigate('/favoritos')}>Favoritos</button>
                <button onClick={() => navigate('/ajustes')}>Ajustes</button>
                <hr />
                <button onClick={() => {logout(); window.location.href = '/';}} className="btn-salir"> Cerrar sesión </button>
              </div>
            )}
          </div>
        ) : (
          <div className="acciones">
            <button onClick={() => navigate('/login')} className="boton-principal">
              Iniciar sesión
            </button>
            <button onClick={() => navigate('/register')} className="boton-principal">
              Registrarse
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
