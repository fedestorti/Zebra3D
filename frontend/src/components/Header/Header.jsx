// frontend/src/components/Header/Header.jsx
import './Header.css';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import CategoryBar from '../CategoryBar/CategoryBar';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { usuario, logout, loading } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  const toggleDropdown = () => setMostrarMenu((v) => !v);
  const toggleMenuMobile = () => setMenuAbierto((v) => !v);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMostrarMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cantidadItems = cart.items.reduce((acc, item) => acc + item.qty, 0);

  const handleSubmitBusqueda = (e) => {
    e.preventDefault();
    const q = busqueda.trim();
    if (q) navigate(`/principal?search=${encodeURIComponent(q)}`);
  };

  if (loading) {
    return (
      <header className="encabezado">
        <div className="lado-izquierdo">
          <img
            src="/Fotos/Logo/logoZebra.png"
            alt="Logo Zebra3D"
            className="Logoinicial"
            style={{ cursor: 'pointer' }}
          />
        </div>
        <form className="buscador-header" role="search" aria-label="Buscar"></form>
        <div className="lado-derecho"></div>
      </header>
    );
  }

  return (
    <header className="encabezado">
      {/* Izquierda: logo */}
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

      {/* Centro: buscador */}
      <form className="buscador-header" role="search" onSubmit={handleSubmitBusqueda}>
        <input
          type="search"
          placeholder="🔍 Buscar diseños 3D..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar diseños 3D"
          autoComplete="off"
          inputMode="search"
        />
      </form>

      {/* Derecha: acciones + menú usuario */}
      <div className="lado-derecho">
        {/* Botón hamburguesa solo visible en mobile */}
        <button
          className="btn-hamburguesa"
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          onClick={toggleMenuMobile}
        >
          ☰
        </button>

        <div className={`contenido-header ${menuAbierto ? 'abierto' : ''}`}>
          {usuario && (
            <button onClick={() => navigate('/carrito')} className="btn-carrito" aria-label="Carrito">
              <img src="/Fotos/Carrito.png" alt="" className="icono-carrito" />
              {cantidadItems > 0 && <span className="cart-badge">{cantidadItems}</span>}
            </button>
          )}

          {usuario ? (
            <div className="usuario-dropdown" ref={menuRef}>
              <div className="usuario-mini" onClick={toggleDropdown} role="button" aria-haspopup="menu" aria-expanded={mostrarMenu}>
                {usuario.avatar_url && (
                  <img
                    src={usuario.avatar_url}
                    alt="Avatar"
                    className="avatar-mini"
                  />
                )}
                <span className={`flecha-abajo ${mostrarMenu ? 'rotada' : ''}`}>▼</span>
              </div>

              {mostrarMenu && (
                <div className="menu-desplegable" role="menu">
                  <span className="apodo">{usuario.apodo}</span>
                  <button onClick={() => navigate(`/perfil/${usuario.apodo}`)}>Ver perfil</button>
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
              <button onClick={() => navigate('/login')} className="boton-principal">Iniciar sesión</button>
              <button onClick={() => navigate('/register')} className="boton-principal">Registrarse</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
