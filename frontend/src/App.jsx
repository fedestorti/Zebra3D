// src/App.jsx
import { Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';

function App() {
  const location = useLocation();
  const hideFooter = location.pathname === '/terminos';

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto', // Header | Main | Footer
      }}
    >
      <Header />

      {/* clave: que el main NO haga overflow del viewport */}
      <main style={{ minHeight: 0, overflow: 'hidden' }}>
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
