import pool from "../db.js";
import { cloudinary } from "../lib/cloudinary.js";

const MAX_DESCARGAS = Number(process.env.MAX_DESCARGAS_POR_ITEM || 20);
const LINK_TTL = Number(process.env.LINK_EXPIRA_SEGUNDOS || 300); // 5 min

export async function listarDescargas(req, res) {
  try {
    const userId = req.usuario.id_usuario;

    const { rows } = await pool.query(`
      SELECT ci.id_item,
             ci.titulo_cache AS titulo,
             ci.precio_unitario AS precio,
             ci.portada_url,
             c.fecha_compra,
             c.estado
      FROM compra_items ci
      JOIN compras c ON c.id_compra = ci.id_compra
      WHERE c.id_usuario = $1
        AND c.estado = 'paid'
      ORDER BY c.fecha_compra DESC, ci.id_item DESC
      LIMIT 200
    `, [userId]);

    res.json(rows);
  } catch (err) {
    console.error("[listarDescargas]", err);
    res.status(500).json({ error: "Error al listar descargas" });
  }
}

export async function crearLinkDescarga(req, res) {
  try {
    const userId = req.usuario.id_usuario;
    const { id_item } = req.params;

    // Validar que el item le pertenezca y esté pago
    const { rows } = await pool.query(`
      SELECT ci.id_item, ci.archivo_public_id, ci.archivo_formato,
             c.id_usuario, c.estado
      FROM compra_items ci
      JOIN compras c ON c.id_compra = ci.id_compra
      WHERE ci.id_item = $1
      LIMIT 1
    `, [id_item]);

    const item = rows[0];
    if (!item) return res.status(404).json({ error: "No existe el ítem" });
    if (item.id_usuario !== userId) return res.status(403).json({ error: "No autorizado" });
    if (item.estado !== "paid") return res.status(400).json({ error: "Compra no aprobada" });

    // Chequear límite de descargas
    const { rows: r2 } = await pool.query(
      "SELECT COUNT(*)::int as n FROM descargas WHERE id_item = $1",
      [id_item]
    );
    if (r2[0].n >= MAX_DESCARGAS) {
      return res.status(429).json({ error: "Límite de descargas alcanzado" });
    }

    // Registrar intento de descarga
    await pool.query(`
      INSERT INTO descargas (id_item, ip, user_agent)
      VALUES ($1, $2, $3)
    `, [id_item, req.ip, req.get("user-agent") || null]);

    // Generar URL privada con expiración corta
    // Nota: assets deben estar subidos con access_mode=authenticated y resource_type=raw
    const expiresAt = Math.floor(Date.now() / 1000) + LINK_TTL;
    const url = cloudinary.utils.private_download_url(
      item.archivo_public_id,
      item.archivo_formato,
      {
        resource_type: "raw",
        expires_at: expiresAt,
        attachment: true // fuerza descarga
      }
    );

    return res.json({ url, expiresAt });
  } catch (err) {
    console.error("[crearLinkDescarga]", err);
    res.status(500).json({ error: "No se pudo generar el link de descarga" });
  }
}
