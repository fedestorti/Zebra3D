// src/middlewares/usuarios.middleware.js
import pool from '../db.js';

export const agregarApodo = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT apodo FROM usuarios WHERE id_usuario=$1',
      [req.usuario.id_usuario]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    req.usuario.apodo = result.rows[0].apodo; // ✅ aquí tenemos el apodo
    next();
  } catch (err) {
    next(err);
  }
};
