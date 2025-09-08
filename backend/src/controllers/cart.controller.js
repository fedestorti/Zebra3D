import pool from "../db.js";

// Obtener o crear el carrito del usuario
export const getOrCreateCart = async (req, res, next) => {
  try {
    const { id_usuario } = req.user;

    // Crear carrito si no existe
    const { rows } = await pool.query(
      `INSERT INTO carritos (id_usuario)
       VALUES ($1)
       ON CONFLICT (id_usuario) DO UPDATE SET actualizado_en = NOW()
       RETURNING id_carrito, id_usuario, creado_en, actualizado_en`,
      [id_usuario]
    );
    const cart = rows[0];

    // Obtener ítems del carrito + imagen de portada
    const items = await pool.query(
      `SELECT ci.id_item, ci.id_diseno, ci.qty,
              d.titulo, d.precio, d.id_usuario AS id_creador,
              (
                SELECT i.url_imagenes
                FROM imagenes_diseno i
                WHERE i.id_diseno = d.id_diseno
                ORDER BY i.orden ASC, i.id_imagen ASC
                LIMIT 1
              ) AS portada_url
       FROM carrito_items ci
       JOIN disenos d ON d.id_diseno = ci.id_diseno
       WHERE ci.id_carrito = $1
       ORDER BY ci.id_item DESC`,
      [cart.id_carrito]
    );

    res.json({ ...cart, items: items.rows });
  } catch (err) {
    next(err);
  }
};

// Agregar un ítem al carrito
export const addItem = async (req, res, next) => {
  try {
    const { id_usuario } = req.user;
    const { id_diseno, qty = 1 } = req.body;

    // No permitir comprar tu propio diseño
    const q1 = await pool.query(
      `SELECT id_usuario AS id_creador FROM disenos WHERE id_diseno=$1`,
      [id_diseno]
    );
    if (q1.rowCount === 0) return res.status(404).json({ error: "Diseño no existe" });
    if (q1.rows[0].id_creador === id_usuario) return res.status(400).json({ error: "No podés comprar tu propio diseño" });

    // Obtener o crear carrito
    const cart = await pool.query(
      `INSERT INTO carritos (id_usuario)
       VALUES ($1)
       ON CONFLICT (id_usuario) DO UPDATE SET actualizado_en = NOW()
       RETURNING id_carrito`,
      [id_usuario]
    );
    const id_carrito = cart.rows[0].id_carrito;

    // Insertar ítem o mantener qty en 1 (no duplicar)
    await pool.query(
      `INSERT INTO carrito_items (id_carrito, id_diseno, qty)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_carrito, id_diseno)
       DO UPDATE SET qty = 1`, // evitar duplicados, qty siempre 1
      [id_carrito, id_diseno, qty]
    );

    return getOrCreateCart(req, res, next);
  } catch (err) {
    next(err);
  }
};

// Eliminar un ítem del carrito
export const removeItem = async (req, res, next) => {
  try {
    const { id_usuario } = req.user;
    const { id_diseno } = req.params;

    const cart = await pool.query(
      `SELECT id_carrito FROM carritos WHERE id_usuario=$1`,
      [id_usuario]
    );
    if (cart.rowCount === 0) return res.json({ ok: true });

    await pool.query(
      `DELETE FROM carrito_items WHERE id_carrito=$1 AND id_diseno=$2`,
      [cart.rows[0].id_carrito, id_diseno]
    );

    return getOrCreateCart(req, res, next);
  } catch (err) {
    next(err);
  }
};

// Vaciar el carrito completo
export const clearCart = async (req, res, next) => {
  try {
    const { id_usuario } = req.user;

    const cart = await pool.query(
      `SELECT id_carrito FROM carritos WHERE id_usuario=$1`,
      [id_usuario]
    );
    if (cart.rowCount === 0) return res.json({ ok: true });

    await pool.query(
      `DELETE FROM carrito_items WHERE id_carrito=$1`,
      [cart.rows[0].id_carrito]
    );

    return getOrCreateCart(req, res, next);
  } catch (err) {
    next(err);
  }
};
