// frontend/src/components/Header/Header.jsx
import './Header.css';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { usuario, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  const toggleDropdown = () => setMostrarMenu(!mostrarMenu);
  const toggleMenuMobile = () => setMenuAbierto((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMostrarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cantidadItems = cart.items.reduce((acc, item) => acc + item.qty, 0);

  const handleSubmitBusqueda = (e) => {
    e.preventDefault();
    if (busqueda.trim() !== '') {
      navigate(`/principal?search=${encodeURIComponent(busqueda.trim())}`);
    }
  };

  return (
    <header className="encabezado">
      {/* Botón hamburguesa SOLO en mobile */}
      <button className="btn-hamburguesa" onClick={toggleMenuMobile}>
        ☰
      </button>

      <div className="lado-izquierdo">
        <img
          src="/Fotos/Logo/logoZebra.png"
          alt="Logo Zebra3D"
          className="Logoinicial"
          onClick={() => {
            navigate('/principal');
            navigate(0);
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <form className="buscador-header" onSubmit={handleSubmitBusqueda}>
        <input
          type="text"
          placeholder="🔍 Buscar diseños 3D..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </form>

      {/* Contenido que se pliega en mobile */}
      <div className={`contenido-header ${menuAbierto ? 'abierto' : ''}`}>
        {usuario && (
          <button onClick={() => navigate('/carrito')} className="btn-carrito">
            🛒
            {cantidadItems > 0 && <span className="cart-badge">{cantidadItems}</span>}
          </button>
        )}

        {usuario ? (
          <div className="usuario-dropdown" ref={menuRef}>
            <div className="usuario-mini" onClick={toggleDropdown} style={{ cursor: 'pointer' }}>
              {usuario.avatar_url && (
                <img
                  src={usuario.avatar_url}
                  alt="Avatar"
                  style={{ width: '35px', height: '35px', borderRadius: '50%' }}
                />
              )}
              <span className={`flecha-abajo ${mostrarMenu ? 'rotada' : ''}`}>▼</span>
            </div>

            {mostrarMenu && (
              <div className="menu-desplegable">
                <span>{usuario.apodo}</span>
                <button onClick={() => navigate(`/perfil/${usuario.apodo}`)}>
  Ver perfil
</button>
                <button onClick={() => navigate('/mensajes')}>Mensajes</button>
                <hr />
                <button onClick={() => navigate('/disenos')}>Agregar Diseños</button>
                <button onClick={() => navigate('/tus-disenos')}>Tus diseños</button>
                <button onClick={() => navigate('/descargas')}>Descargas</button>
                <button onClick={() => navigate('/ventas')}>Ventas</button>
                <button onClick={() => navigate('/comunidad')}>Comunidad</button>
                <button onClick={() => navigate('/favoritos')}>Favoritos</button>
                <button onClick={() => navigate('/ajustes')}>Ajustes</button>
                <hr />
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/';
                  }}
                  className="btn-salir"
                >
                  Cerrar sesión
                </button>
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
