import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🪪 Authorization Header:', authHeader); // 👀 Log clave

  if (!authHeader) {
    return res.status(401).json({ error: '❌ No se proporcionó token' });
  }

  const token = authHeader.split(' ')[1]; // Quita "Bearer"
  console.log('🔑 Token extraído:', token); // 👀 Log clave

  if (!token) {
    return res.status(401).json({ error: '❌ Token faltante en Authorization' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // 👤 Agrega los datos del usuario al request
    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error);
    return res.status(401).json({ error: '❌ Token inválido o mal formado' });
  }
};
