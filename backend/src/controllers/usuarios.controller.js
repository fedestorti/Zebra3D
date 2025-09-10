// controllers/usuarios.controller.js
import pool from '../db.js';

// 🌐 Rutas públicas

// 1️⃣ Obtener perfil por apodo
export const obtenerPerfilPorApodo = async (req, res) => {
  try {
    const { apodo } = req.params;
    const { rows } = await pool.query(
      `SELECT id_usuario, apodo, nombre, apellido, avatar_url, biografia, pais, es_premium
       FROM usuarios
       WHERE apodo = $1`,
      [apodo]
    );

    if (!rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error en obtenerPerfilPorApodo:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 2️⃣ Obtener diseños de un usuario
export const obtenerDisenosPorApodo = async (req, res) => {
  try {
    const { apodo } = req.params;
    const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE apodo = $1', [apodo]);
    if (!userRes.rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    const id_usuario = userRes.rows[0].id_usuario;

    const disenosRes = await pool.query(
      `SELECT d.id_diseno, d.titulo, d.precio, 
              COALESCE(ARRAY_AGG(i.url_imagenes ORDER BY i.orden) FILTER (WHERE i.url_imagenes IS NOT NULL), '{}') AS imagenes
       FROM disenos d
       LEFT JOIN imagenes_diseno i ON d.id_diseno = i.id_diseno
       WHERE d.id_usuario = $1
       GROUP BY d.id_diseno`,
      [id_usuario]
    );

    res.json(disenosRes.rows);
  } catch (err) {
    console.error('Error en obtenerDisenosPorApodo:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 3️⃣ Contar seguidores
export const contarSeguidores = async (req, res) => {
  try {
    const { apodo } = req.params;
    const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE apodo = $1', [apodo]);
    if (!userRes.rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    const id_usuario = userRes.rows[0].id_usuario;

    const countRes = await pool.query(
      'SELECT COUNT(*) AS count FROM seguidores WHERE id_seguido = $1',
      [id_usuario]
    );

    res.json({ count: parseInt(countRes.rows[0].count) });
  } catch (err) {
    console.error('Error en contarSeguidores:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 4️⃣ Promedio de reseñas
export const promedioResenas = async (req, res) => {
  try {
    const { apodo } = req.params;
    const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE apodo = $1', [apodo]);
    if (!userRes.rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    const id_usuario = userRes.rows[0].id_usuario;

    const avgRes = await pool.query(
      'SELECT AVG(calificacion) AS average FROM resenas WHERE id_calificado = $1',
      [id_usuario]
    );

    res.json({ average: parseFloat(avgRes.rows[0].average) || 0 });
  } catch (err) {
    console.error('Error en promedioResenas:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 🔒 Rutas privadas (requieren token)

// 5️⃣ Estado de seguimiento
export const estadoSeguirPorApodo = async (req, res) => {
  try {
    const { id_usuario: yo } = req.usuario;
    const { apodo } = req.params;

    const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE apodo = $1', [apodo]);
    if (!userRes.rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    const id_visitado = userRes.rows[0].id_usuario;

    const { rows } = await pool.query(
      'SELECT 1 FROM seguidores WHERE id_usuario = $1 AND id_seguido = $2',
      [yo, id_visitado]
    );

    res.json({ isFollowing: rows.length > 0 });
  } catch (err) {
    console.error('Error en estadoSeguirPorApodo:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 6️⃣ Seguir usuario
export const seguirUsuarioPorApodo = async (req, res) => {
  try {
    const { id_usuario: yo } = req.usuario;
    const { apodo } = req.params;

    const userRes = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE apodo = $1',
      [apodo]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const id_seguido = userRes.rows[0].id_usuario;

    // 🔹 Verificación: si es tu propio perfil
    if (yo === id_seguido) {
      return res
        .status(400)
        .json({ mensaje: 'No podés seguirte a vos mismo' });
    }

    await pool.query(
      `INSERT INTO seguidores (id_usuario, id_seguido) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [yo, id_seguido]
    );

    res.status(201).json({ mensaje: `Ahora sigues a ${apodo}` });
  } catch (err) {
    console.error('Error en seguirUsuarioPorApodo:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 7️⃣ Dejar de seguir usuario
export const dejarDeSeguirUsuarioPorApodo = async (req, res) => {
  try {
    const { id_usuario: yo } = req.usuario;
    const { apodo } = req.params;

    const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE apodo = $1', [apodo]);
    if (!userRes.rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    const id_seguido = userRes.rows[0].id_usuario;

    await pool.query(
      'DELETE FROM seguidores WHERE id_usuario = $1 AND id_seguido = $2',
      [yo, id_seguido]
    );

    res.json({ mensaje: `Dejaste de seguir a ${apodo}` });
  } catch (err) {
    console.error('Error en dejarDeSeguirUsuarioPorApodo:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// 8️⃣ Crear reseña
export const crearResena = async (req, res) => {
  try {
    const { id_usuario: yo } = req.usuario; // usuario logueado
    const { apodo } = req.params;
    let { calificacion } = req.body;

    // convertir a número y redondear a 1 decimal
    calificacion = parseFloat(calificacion);
    if (isNaN(calificacion) || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ mensaje: 'Calificación inválida (debe ser entre 1 y 5)' });
    }
    calificacion = Math.round(calificacion * 10) / 10;

    const userRes = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE apodo = $1',
      [apodo]
    );
    if (!userRes.rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const id_calificado = userRes.rows[0].id_usuario;
    if (id_calificado === yo) return res.status(400).json({ mensaje: 'No puedes calificarte a ti mismo' });

    await pool.query(
      `INSERT INTO resenas (id_usuario, id_calificado, calificacion)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_usuario, id_calificado)
       DO UPDATE SET calificacion = EXCLUDED.calificacion`,
      [yo, id_calificado, calificacion]
    );

    res.status(201).json({ mensaje: 'Reseña enviada' });
  } catch (err) {
    console.error('Error en crearResena:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor', detalle: err.message });
  }
};

// Cambiar bio del usuario autenticado
export const updateBio = async (req, res) => {
  try {
    const { biografia } = req.body;
    const { id_usuario } = req.user; // <- sacado del JWT
    const result = await pool.query(
      `UPDATE usuarios SET biografia=$1 WHERE id_usuario=$2 RETURNING biografia`,
      [biografia ?? '', id_usuario]
    );
    res.json({ biografia: result.rows[0].biografia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo actualizar la biografía" });
  }
};

// Cambiar avatar del usuario autenticado
export const updateAvatar = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const url = req.file?.path; // Cloudinary te devuelve la URL en file.path
    if (!url) return res.status(400).json({ error: "Archivo inválido" });

    await pool.query(
      `UPDATE usuarios SET avatar_url=$1 WHERE id_usuario=$2`,
      [url, id_usuario]
    );
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo actualizar el avatar" });
  }
};