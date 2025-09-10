// src/App.jsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header/Header';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const isPrincipal = location.pathname === '/principal';
  const hideFooter = location.pathname === '/terminos';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header>
      </Header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {!hideFooter && (
        <footer
          style={{
            textAlign: 'center',
            padding: '20px',
            fontSize: '14px',
            color: '#888',
            backgroundColor: '#121212',
          }}
        >
          © 2025 Zebra3D ·{' '}
          <a href="/terminos" style={{ color: '#60a5fa', textDecoration: 'none' }}>
            Términos y Condiciones · Política de Privacidad
          </a>
        </footer>
      )}
    </div>
  );
}

export default App;
