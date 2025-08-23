// src/App.jsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header/Header';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const isPrincipal = location.pathname === '/principal';

  return (
    <>
      <Header>
        {isPrincipal && (
          <>
            <input
              type="text"
              className="buscador"
              placeholder="🔍 Buscar diseños 3D..."
            />
            <div className="acciones">
              <button className="boton-principal" onClick={() => navigate('/login')}>
                Iniciar sesión
              </button>
              <button className="boton-principal" onClick={() => navigate('/register')}>
                Crear cuenta
              </button>
            </div>
          </>
        )}
      </Header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
