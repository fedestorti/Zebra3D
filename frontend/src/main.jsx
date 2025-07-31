import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
//src
import './index.css';
import App from './App.jsx';
//components
import RutaProtegida from './components/RutaProtegida/RutaProtegida.jsx';
//pages
import Register from './pages/Register/Register.jsx';
import Login from './pages/Login/Login.jsx';
import PagePrincipalForm from './pages/PagePrincipal/PagePrincipalForm.jsx';
import Perfil from './pages/Perfil/PerfilForm.jsx';
import DisenosForm from './pages/Disenos/DisenosForm.jsx';
//context
import { AuthProvider } from './context/AuthContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <PagePrincipalForm /> },
      { path: 'principal', element: <PagePrincipalForm /> },
      { path: 'register', element: <Register /> },
      { path: 'login', element: <Login /> },

      // 🔐 Rutas protegidas
      {
        element: <RutaProtegida />,
        children: [
          { path: 'perfil', element: <Perfil /> },
          { path: 'disenos', element: <DisenosForm /> }
          // Agregá más aquí:
          // { path: 'mensajes', element: <Mensajes /> },
          // { path: 'descargas', element: <Descargas /> },
          // etc.
        ]
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true }}
      />
    </AuthProvider>
  </React.StrictMode>
);
