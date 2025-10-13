import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// src
import './index.css';
import App from './App.jsx';

// components
import RutaProtegida from './components/RutaProtegida/RutaProtegida.jsx';
import ScrollToTop from './components/ScrollToTop/ScrollToTop.jsx';
import RequireMP from './components/RutaProtegida/RequireMP.jsx';

// pages (asegurate que estos paths EXISTAN y tengan export default)
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
import VincularMP from './pages/VincularMP/VincularMP.jsx';
import Terminos from './pages/Terminos/Terminos.jsx';
import MensajesPage from './pages/Mensajes/MensajesPage.jsx';

// 👉 si tu archivo real se llama "Descargas.jsx", usá esa ruta.
// import DescargasPage from './pages/Descargas/Descargas.jsx';
import DescargasPage from './pages/Descargas/DescargasForm.jsx';

// context
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ChatProvider from './context/ChatContext.jsx';

// api
import { ensureCsrf } from './api';

// asegurar CSRF apenas carga la app (solo necesario si usás cookies en algún flujo)
ensureCsrf();

function Root() {
  return (
    <>
      <ScrollToTop />
      <App />
    </>
  );
}

// Públicas (perfil público debe estar sólo acá, no dupliques)
const publicRoutes = [
  { index: true, element: <PagePrincipalForm key={Date.now()} /> },
  { path: 'principal', element: <PagePrincipalForm key={Date.now()} /> },
  { path: 'register', element: <Register /> },
  { path: 'login', element: <Login /> },
  { path: 'disenos/:id', element: <DisenoDetalle key={Date.now()} /> },
  { path: 'perfil/:apodo', element: <Perfil /> },
  { path: 'servicio-impresion', element: <ServicioImpresion /> },
  { path: 'terminos', element: <Terminos /> },
  { path: 'pago/ok', element: <CheckoutResult /> },
  { path: 'pago/error', element: <CheckoutResult /> },
  { path: 'pago/pendiente', element: <CheckoutResult /> },
];

// Privadas
const privateRoutes = [
  // suba/edición de diseños: requiere MP
  { path: 'disenos', element: (<RequireMP><DisenosForm /></RequireMP>) },

  // tus diseños
  { path: 'tus-disenos', element: <Tusdisenos /> },

  // carrito, vinculación, mensajes
  { path: 'carrito', element: <CarritoPage /> },
  { path: 'vincular-mp', element: <VincularMP /> },
  { path: 'mensajes', element: <MensajesPage /> },

  // 👉 NUEVO: descargas (solo requiere sesión, NO MP)
  { path: 'descargas', element: <DescargasPage /> },
];

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      ...publicRoutes,
      { element: <RutaProtegida />, children: privateRoutes },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <ChatProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </ChatProvider>
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);
