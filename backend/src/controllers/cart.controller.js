// controllers/cart.controller.js
import pool from "../db.js";

/* Util: asegura carrito 1:1 y devuelve id */
async function ensureCart(id_usuario) {
  const { rows } = await pool.query(
    `INSERT INTO carritos (id_usuario)
     VALUES ($1)
     ON CONFLICT (id_usuario)
     DO UPDATE SET actualizado_en = NOW()
     RETURNING id_carrito, id_usuario, creado_en, actualizado_en`,
    [id_usuario]
  );
  return rows[0];
}

/* GET /api/cart */
export const getOrCreateCart = async (req, res) => {
  try {
    const id_usuario = req?.user?.id_usuario;
    if (!id_usuario) return res.status(401).json({ error: "Token inválido o faltante" });

    const cart = await ensureCart(id_usuario);

    const itemsQuery = `
      SELECT
        ci.id_item, ci.id_diseno, ci.qty,
        d.titulo, d.precio, d.id_usuario AS id_creador,
        u.apodo AS apodo_creador,
        (
          SELECT i.url_imagenes
          FROM imagenes_diseno i
          WHERE i.id_diseno = d.id_diseno
          ORDER BY i.orden ASC, i.id_imagen ASC
          LIMIT 1
        ) AS portada_url
      FROM carrito_items ci
      JOIN disenos d ON d.id_diseno = ci.id_diseno
      JOIN usuarios u ON u.id_usuario = d.id_usuario
      WHERE ci.id_carrito = $1
      ORDER BY ci.id_item DESC
    `;
    const { rows: items } = await pool.query(itemsQuery, [cart.id_carrito]);

    res.json({ ...cart, items });
  } catch (err) {
    console.error("🔥 getOrCreateCart:", err);
    res.status(500).json({ error: "Error interno al obtener el carrito" });
  }
};

/* POST /api/cart/items  { id_diseno, qty? } */
export const addItem = async (req, res) => {
  try {
    const id_usuario = req?.user?.id_usuario;
    if (!id_usuario) return res.status(401).json({ error: "Token inválido o faltante" });

    let { id_diseno, qty = 1 } = req.body || {};
    id_diseno = Number(id_diseno);
    qty = Number(qty);

    if (!Number.isInteger(id_diseno) || id_diseno <= 0) {
      return res.status(400).json({ error: "id_diseno inválido" });
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: "qty inválida" });
    }

    // no permitir comprar tu propio diseño
    const q1 = await pool.query(
      `SELECT id_usuario AS id_creador FROM disenos WHERE id_diseno = $1`,
      [id_diseno]
    );
    if (!q1.rowCount) return res.status(404).json({ error: "Diseño no existe" });
    if (q1.rows[0].id_creador === id_usuario) {
      return res.status(400).json({ error: "No podés comprar tu propio diseño" });
    }

    const cart = await ensureCart(id_usuario);

    // si el ítem ya está, mantené qty = 1; si no está, insertá 1
    await pool.query(
      `INSERT INTO carrito_items (id_carrito, id_diseno, qty)
       VALUES ($1, $2, 1)
       ON CONFLICT (id_carrito, id_diseno)
       DO UPDATE SET qty = 1`,
      [cart.id_carrito, id_diseno]
    );

    // devolvé carrito actualizado
    return getOrCreateCart(req, res);
  } catch (err) {
    console.error("🔥 addItem:", err);
    res.status(500).json({ error: "Error al agregar al carrito" });
  }
};

/* DELETE /api/cart/items/:id_diseno */
export const removeItem = async (req, res) => {
  try {
    const id_usuario = req?.user?.id_usuario;
    if (!id_usuario) return res.status(401).json({ error: "Token inválido o faltante" });

    const id_diseno = Number(req.params.id_diseno);
    if (!Number.isInteger(id_diseno) || id_diseno <= 0) {
      return res.status(400).json({ error: "id_diseno inválido" });
    }

    const { rows } = await pool.query(
      `SELECT id_carrito FROM carritos WHERE id_usuario=$1`,
      [id_usuario]
    );
    const id_carrito = rows[0]?.id_carrito;
    if (!id_carrito) return res.json({ ok: true });

    await pool.query(
      `DELETE FROM carrito_items WHERE id_carrito=$1 AND id_diseno=$2`,
      [id_carrito, id_diseno]
    );

    return getOrCreateCart(req, res);
  } catch (err) {
    console.error("🔥 removeItem:", err);
    res.status(500).json({ error: "Error al eliminar ítem" });
  }
};

/* DELETE /api/cart */
export const clearCart = async (req, res) => {
  try {
    const id_usuario = req?.user?.id_usuario;
    if (!id_usuario) return res.status(401).json({ error: "Token inválido o faltante" });

    const { rows } = await pool.query(
      `SELECT id_carrito FROM carritos WHERE id_usuario=$1`,
      [id_usuario]
    );
    const id_carrito = rows[0]?.id_carrito;
    if (!id_carrito) return res.json({ ok: true });

    await pool.query(`DELETE FROM carrito_items WHERE id_carrito=$1`, [id_carrito]);

    return getOrCreateCart(req, res);
  } catch (err) {
    console.error("🔥 clearCart:", err);
    res.status(500).json({ error: "Error al vaciar carrito" });
  }
};
