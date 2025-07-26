// src/pages/Login/Login.jsx
import LoginForm from './LoginForm.jsx';
import './Login.css'; // Asegurate de crear este archivo si querés estilos

export default function Login() {
  return (
    <div className="login-container">
      <h2 className="login-title">Inicio de Sesión</h2>
      <LoginForm />
    </div>
  );
}
