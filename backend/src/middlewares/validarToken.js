import jwt from 'jsonwebtoken';

export function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ mensaje: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1]; // "Bearer abc123" → "abc123"

    if (!token) {
      return res.status(401).json({ mensaje: 'Token inválido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decoded; // 👈 esto es lo que necesitás para el perfil

    next();
  } catch (err) {
    console.error('❌ Error en verificarToken:', err.message);
    res.status(403).json({ mensaje: 'Token inválido o expirado' });
  }
}
