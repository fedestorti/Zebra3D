// src/middlewares/validarRegistro.js
import pool from '../db.js'; // tu pool de PostgreSQL

export const verificarUsuario = async (req, res, next) => {
  const { apodo, email } = req.body;
  try {
    const { rows: apodos } = await pool.query('SELECT 1 FROM usuarios WHERE apodo = $1', [apodo]);
    if (apodos.length > 0) return res.status(400).json({ error: 'El apodo ya existe' });

    const { rows: emails } = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
    if (emails.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

    next(); // todo ok, puede subir la foto
  } catch (err) {
    console.error('Error al verificar usuario:', err);
    return res.status(500).json({ error: 'Error al verificar apodo/email' });
  }
};
