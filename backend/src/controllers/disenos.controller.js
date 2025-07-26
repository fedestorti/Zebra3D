import pool from '../db.js';

// Subir diseño con archivos
export const subirDiseno = async (req, res) => {
  try {
    const { titulo, descripcion, precio } = req.body;

    console.log('📥 Datos recibidos:', req.body);
    console.log('📸 Imagen portada:', req.file?.path);
    console.log('📦 Archivo 3D:', req.file?.path);

    const imagen_portada = req.file?.path; // URL Cloudinary portada
    const archivo_3d = req.file?.path;     // URL Cloudinary archivo

    const result = await pool.query(
      `INSERT INTO disenos (titulo, descripcion, precio, imagen_portada, archivo_3d, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [titulo, descripcion, precio, imagen_portada, archivo_3d, req.user.id_usuario]
    );

    res.status(201).json({
      message: '✅ Diseño subido correctamente',
      diseño: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error al subir diseño:', error);
    res.status(500).json({ error: 'Error al subir diseño' });
  }
};

