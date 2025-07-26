import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

import App from './App.jsx';
import Register from './pages/Register/Register.jsx';
import Login from './pages/Login/Login.jsx';

// 💡 Definí las rutas
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { path: 'register', element: <Register /> },
        { path: 'login', element: <Login /> }
      ]
    }
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }
  }
);

// 🚀 Render principal
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
