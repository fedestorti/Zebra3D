// backend/src/controllers/mensajes.controller.js
import pool from "../db.js";
import { io } from "../lib/socket.js"; // ⬅️ ahora podemos emitir

/** Utilidad: asegura que req.user exista y trae {id_usuario, apodo} */
function getAuthUser(req) {
  const u = req.user || req.usuario;
  if (!u?.id_usuario) {
    const err = new Error("No autenticado");
    err.status = 401;
    throw err;
  }
  return u;
}

/** Crea o devuelve una conversación 1:1 entre yo y b */
export async function ensureThread(req, res) {
  const { id_usuario } = getAuthUser(req);
  const { b } = req.body;
  if (!b || Number.isNaN(Number(b))) {
    return res.status(400).json({ error: "Parámetro 'b' inválido" });
  }

  try {
    const q = await pool.query(
      `
      SELECT c.id_conversacion
      FROM conversaciones c
      JOIN conversacion_participantes p1 ON p1.id_conversacion = c.id_conversacion AND p1.id_usuario = $1
      JOIN conversacion_participantes p2 ON p2.id_conversacion = c.id_conversacion AND p2.id_usuario = $2
      LIMIT 1
      `,
      [id_usuario, Number(b)]
    );

    let id_conversacion;
    const existed = !!q.rowCount;

    if (existed) {
      id_conversacion = q.rows[0].id_conversacion;
    } else {
      const insC = await pool.query(
        `INSERT INTO conversaciones DEFAULT VALUES RETURNING id_conversacion`
      );
      id_conversacion = insC.rows[0].id_conversacion;

      await pool.query(
        `INSERT INTO conversacion_participantes (id_conversacion, id_usuario, ultimo_leido_id)
         VALUES ($1,$2,NULL), ($1,$3,NULL)`,
        [id_conversacion, id_usuario, Number(b)]
      );
    }

    // unir sockets actuales de A y B al room del hilo
    io.in(`user:${id_usuario}`).socketsJoin(`conv:${id_conversacion}`);
    io.in(`user:${Number(b)}`).socketsJoin(`conv:${id_conversacion}`);

    if (!existed) {
      io.to(`user:${id_usuario}`).emit("thread:new", { id_conversacion });
      io.to(`user:${Number(b)}`).emit("thread:new", { id_conversacion });
    }

    return res.json({ id_conversacion });
  } catch (e) {
    console.error("ensureThread", e);
    return res.status(500).json({ error: "No se pudo asegurar la conversación" });
  }
}

/** Enviar mensaje a una conversación 1:1 */
export async function sendMessage(req, res) {
  const { id_usuario } = getAuthUser(req);
  const { conversacionId, contenido } = req.body;

  if (!conversacionId || !contenido?.trim()) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  try {
    // validar pertenencia
    const p = await pool.query(
      `SELECT 1 FROM conversacion_participantes WHERE id_conversacion = $1 AND id_usuario = $2`,
      [Number(conversacionId), id_usuario]
    );
    if (!p.rowCount) return res.status(403).json({ error: "No sos participante" });

    const ins = await pool.query(
      `INSERT INTO mensajes (id_conversacion, id_remitente, cuerpo)
       VALUES ($1, $2, $3)
       RETURNING id_mensaje, id_conversacion, id_remitente, cuerpo, creado_en, editado_en, borrado`,
      [Number(conversacionId), id_usuario, contenido.trim()]
    );

    const m = ins.rows[0];

    // emitir a quienes estén en ese room (A y/o B si lo tienen abierto)
    io?.to(`conv:${conversacionId}`).emit("message:new", { mensaje: m });

    // poke a participantes (para refrescar lista/contadores sin cambiar foco)
    const otros = await pool.query(
      `SELECT id_usuario
         FROM conversacion_participantes
        WHERE id_conversacion = $1 AND id_usuario <> $2`,
      [Number(conversacionId), id_usuario]
    );
    otros.rows.forEach(r => {
      io?.to(`user:${r.id_usuario}`).emit("thread:poke", { id_conversacion: conversacionId });
    });

    // responder al emisor (el front hace de-dupe por id_mensaje)
    return res.status(201).json({ mensaje: { ...m, es_mio: true } });
  } catch (e) {
    console.error("sendMessage", e);
    return res.status(500).json({ error: "No se pudo enviar el mensaje" });
  }
}

/** Listar hilos del usuario actual con apodo del otro y no leídos */
export async function listThreads(req, res) {
  const u = req.user || req.usuario;
  if (!u || !u.id_usuario) return res.status(401).json({ error: "No autenticado" });
  const id_usuario = Number(u.id_usuario);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  try {
    const q = await pool.query(
      `
      WITH mis AS (
        SELECT c.id_conversacion
        FROM conversaciones c
        JOIN conversacion_participantes p ON p.id_conversacion = c.id_conversacion
        WHERE p.id_usuario = $1
      ),
      -- avatar del otro participante
      otros AS (
        SELECT
          cp.id_conversacion,
          usr.id_usuario  AS id_usuario_otro,
          usr.apodo       AS apodo_otro,
          usr.avatar_url  AS avatar_otro
        FROM conversacion_participantes cp
        JOIN usuarios usr ON usr.id_usuario = cp.id_usuario
        WHERE cp.id_conversacion IN (SELECT id_conversacion FROM mis)
          AND cp.id_usuario <> $1
      ),
      ultimo AS (
        SELECT
          m.id_conversacion,
          m.id_mensaje,
          m.cuerpo,
          m.creado_en,
          ROW_NUMBER() OVER (PARTITION BY m.id_conversacion ORDER BY m.creado_en DESC) AS rn
        FROM mensajes m
        WHERE m.id_conversacion IN (SELECT id_conversacion FROM mis)
      ),
      noleidos AS (
        SELECT m.id_conversacion, COUNT(*) AS no_leidos
        FROM mensajes m
        JOIN conversacion_participantes cp
          ON cp.id_conversacion = m.id_conversacion AND cp.id_usuario = $1
        WHERE m.id_remitente <> $1
          AND (cp.ultimo_leido_id IS NULL OR m.id_mensaje > cp.ultimo_leido_id)
        GROUP BY m.id_conversacion
      )
      SELECT 
        o.id_conversacion,
        o.id_usuario_otro,
        o.apodo_otro,
        o.avatar_otro,
        COALESCE(n.no_leidos, 0) AS no_leidos,
        u.cuerpo            AS ultimo_cuerpo,
        u.creado_en         AS ultimo_ts
      FROM otros o
      LEFT JOIN noleidos n ON n.id_conversacion = o.id_conversacion
      LEFT JOIN ultimo   u ON u.id_conversacion = o.id_conversacion AND u.rn = 1
      ORDER BY ultimo_ts DESC NULLS LAST
      LIMIT $2
      `,
      [id_usuario, limit]
    );

    return res.json(q.rows);
  } catch (e) {
    console.error("listThreads error:", e);
    return res.status(500).json({ error: "No se pudieron listar las conversaciones" });
  }
}

/** Listar mensajes de un hilo con es_mio calculado */
export async function listMessages(req, res) {
  const u = req.user || req.usuario;
  if (!u || !u.id_usuario) return res.status(401).json({ error: "No autenticado" });
  const id_usuario = Number(u.id_usuario);

  const conversacionId = Number(req.params.id);
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const cursor = req.query.cursor ? Number(req.query.cursor) : null; // id_mensaje tope superior (trae más antiguos)
  const mode = String(req.query.mode || "tail").toLowerCase();       // "tail" => últimos N

  if (!conversacionId) return res.status(400).json({ error: "Conversación inválida" });

  try {
    // validar participación
    const p = await pool.query(
      `SELECT 1 FROM conversacion_participantes WHERE id_conversacion = $1 AND id_usuario = $2`,
      [conversacionId, id_usuario]
    );
    if (!p.rowCount) return res.status(403).json({ error: "No sos participante" });

    let rows = [];

    if (mode === "tail" && !cursor) {
      // PRIMERA CARGA: últimos N (ORDER DESC + LIMIT) y luego invertimos para mostrar ascendente
      const q = await pool.query(
        `
        SELECT id_mensaje, id_conversacion, id_remitente,
               cuerpo, creado_en, editado_en, borrado
        FROM mensajes
        WHERE id_conversacion = $1
        ORDER BY id_mensaje DESC
        LIMIT $2
        `,
        [conversacionId, limit]
      );
      rows = q.rows.reverse();
    } else if (cursor) {
      // PAGINAR HACIA ARRIBA: más antiguos que cursor (id < cursor)
      const q = await pool.query(
        `
        SELECT id_mensaje, id_conversacion, id_remitente,
               cuerpo, creado_en, editado_en, borrado
        FROM mensajes
        WHERE id_conversacion = $1
          AND id_mensaje < $2
        ORDER BY id_mensaje DESC
        LIMIT $3
        `,
        [conversacionId, cursor, limit]
      );
      rows = q.rows.reverse();
    } else {
      // Fallback (no recomendado): primeros N en orden ascendente
      const q = await pool.query(
        `
        SELECT id_mensaje, id_conversacion, id_remitente,
               cuerpo, creado_en, editado_en, borrado
        FROM mensajes
        WHERE id_conversacion = $1
        ORDER BY id_mensaje ASC
        LIMIT $2
        `,
        [conversacionId, limit]
      );
      rows = q.rows;
    }

    const data = rows.map(r => ({
      ...r,
      es_mio: Number(r.id_remitente) === id_usuario,
    }));

    return res.json(data);
  } catch (e) {
    console.error("listMessages", e);
    return res.status(500).json({ error: "No se pudieron listar los mensajes" });
  }
}

/** Marcar leído hasta cierto id_mensaje */
export async function markRead(req, res) {
  const { id_usuario } = getAuthUser(req);
  const { conversacionId, hastaMensajeId } = req.body;

  if (!conversacionId || !hastaMensajeId) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  try {
    await pool.query(
      `
      UPDATE conversacion_participantes
         SET ultimo_leido_id = GREATEST(COALESCE(ultimo_leido_id,0), $3)
       WHERE id_conversacion = $1 AND id_usuario = $2
      `,
      [Number(conversacionId), id_usuario, Number(hastaMensajeId)]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("markRead", e);
    return res.status(500).json({ error: "No se pudo marcar leído" });
  }
}

/** Contador global de no leídos */
export async function unreadCount(req, res) {
  const { id_usuario } = getAuthUser(req);
  try {
    const q = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM mensajes m
      JOIN conversacion_participantes cp
        ON cp.id_conversacion = m.id_conversacion
       AND cp.id_usuario = $1
      WHERE m.id_remitente <> $1
        AND (cp.ultimo_leido_id IS NULL OR m.id_mensaje > cp.ultimo_leido_id)
      `,
      [id_usuario]
    );
    return res.json({ total: q.rows[0].total });
  } catch (e) {
    console.error("unreadCount", e);
    return res.status(500).json({ error: "No se pudo calcular no leídos" });
  }
}
