// backend/src/middlewares/requireMPLinked.js
import pool from '../db.js';

export async function requireMPLinked(req, res, next) {
  try {
    const { id_usuario } = req.user; // set por tu verificarToken
    const q = await pool.query(
      `SELECT mp_user_id, cuenta_pago FROM usuarios WHERE id_usuario = $1`,
      [id_usuario]
    );
    if (!q.rowCount) return res.status(401).json({ error: 'Usuario inválido' });

    const { mp_user_id, cuenta_pago } = q.rows[0];
    if (!(mp_user_id || cuenta_pago)) {
      return res.status(403).json({ error: 'Debes vincular Mercado Pago para realizar esta acción' });
    }

    next();
  } catch (err) {
    console.error('requireMPLinked', err);
    res.status(500).json({ error: 'Error interno' });
  }
}
