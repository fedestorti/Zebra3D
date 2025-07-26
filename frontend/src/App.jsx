// src/App.jsx
import { Outlet } from 'react-router-dom';
import Header from './components/Header/Header';

function App() {
  return (
    <>
      <Header />
      <main>
        <Outlet /> {/* 👈 Este renderiza las rutas hijas: Login y Register */}
      </main>
    </>
  );
}

export default App;
