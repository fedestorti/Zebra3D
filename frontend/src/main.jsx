// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// src
import './index.css';
import App from './App.jsx';

// components
import RutaProtegida from './components/RutaProtegida/RutaProtegida.jsx';

// pages
import Register from './pages/Register/Register.jsx';
import Login from './pages/Login/Login.jsx';
import PagePrincipalForm from './pages/PagePrincipal/PagePrincipalForm.jsx';
import Perfil from './pages/Perfil/Perfil.jsx';
import DisenosForm from './pages/Disenos/DisenosForm.jsx';
import DisenoDetalle from './pages/DisenoDetalle/DisenoDetalle.jsx';
import Tusdisenos from './pages/Tusdisenos/TusdisenosForm.jsx';
import ServicioImpresion from './pages/ServicioImpresion/ServicioImpresionForm.jsx';
import CarritoPage from './pages/Carrito/CarritoPage.jsx';
import CheckoutResult from './pages/Checkout/CheckoutResult.jsx';
import RequireMP from './components/RutaProtegida/RequireMP.jsx';
import VincularMP from './pages/VincularMP/VincularMP.jsx';

// context
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// 📌 Rutas públicas
const publicRoutes = [
  { index: true, element: <PagePrincipalForm key={Date.now()} /> },
  { path: 'principal', element: <PagePrincipalForm key={Date.now()} /> },
  { path: 'register', element: <Register /> },
  { path: 'login', element: <Login /> },
  { path: 'disenos/:id', element: <DisenoDetalle key={Date.now()} /> },
  { path: 'perfil/:apodo', element: <Perfil /> },
  { path: 'servicio-impresion', element: <ServicioImpresion /> },

  // ❗ Rutas que usa MercadoPago para redireccionar
  { path: 'pago/ok', element: <CheckoutResult /> },
  { path: 'pago/error', element: <CheckoutResult /> },
  { path: 'pago/pendiente', element: <CheckoutResult /> }
];

// 🔐 Rutas privadas (requieren sesión activa)
const privateRoutes = [
  { path: 'perfil/:apodo', element: <Perfil /> },
  {
    path: 'disenos',
    element: (
      <RequireMP>
        <DisenosForm />
      </RequireMP>
    )
  },
  { path: 'tus-disenos', element: <Tusdisenos /> },
  { path: 'carrito', element: <CarritoPage /> },         // ✅ ahora es privada
  { path: 'vincular-mp', element: <VincularMP /> }       // ✅ también es privada
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
        children: privateRoutes,
      },
    ],
  },
]);

// ✅ Render limpio
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);
