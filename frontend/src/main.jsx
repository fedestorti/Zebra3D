// src/main.jsx
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
import Perfil from './pages/Perfil/Perfil.jsx';
import DisenosForm from './pages/Disenos/DisenosForm.jsx';
import DisenoDetalle from './pages/DisenoDetalle/DisenoDetalle.jsx';
import ServicioImpresion from './pages/ServicioImpresion/ServicioImpresionForm.jsx';
//context
import { AuthProvider } from './context/AuthContext';

// 📌 Rutas públicas
const publicRoutes = [
  { index: true, element: <PagePrincipalForm key={Date.now()} /> },
  { path: 'principal', element: <PagePrincipalForm key={Date.now()} /> },
  { path: 'register', element: <Register /> },
  { path: 'login', element: <Login /> },
  { path: 'disenos/:id', element: <DisenoDetalle key={Date.now()} /> },
  { path: 'perfil/:apodo', element: <Perfil /> },
  { path: 'servicio-impresion', element: <ServicioImpresion /> }
];

// 🔐 Rutas privadas
const privateRoutes = [
  { path: 'perfil/:apodo', element: <Perfil /> },
  { path: 'disenos', element: <DisenosForm /> }
  // { path: 'mensajes', element: <Mensajes /> },
  // { path: 'descargas', element: <Descargas /> },
];

// 📌 Router principal
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      ...publicRoutes,
      {
        element: <RutaProtegida />,
        children: privateRoutes
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
