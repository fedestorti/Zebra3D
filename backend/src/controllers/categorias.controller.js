// backend/src/controllers/categorias.controller.js
import pool from '../db.js';

// GET /api/categorias?include_inactive=true|false
export const getCategorias = async (req, res) => {
  try {
    const { include_inactive } = req.query;
    const onlyActive = include_inactive !== 'true';

    const { rows } = await pool.query(
      `
      SELECT id_categoria, nombre, slug, activa, created_at
      FROM categorias
      ${onlyActive ? 'WHERE activa = TRUE' : ''}
      ORDER BY nombre ASC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo categorías:', err);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
};

// (Opcional) GET /api/categorias/:id
export const getCategoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id_categoria, nombre, slug, activa, created_at
       FROM categorias
       WHERE id_categoria = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo categoría:', err);
    res.status(500).json({ error: 'Error obteniendo categoría' });
  }
};
