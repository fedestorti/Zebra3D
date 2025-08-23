import pool from '../db.js';
import { subirArchivoCloudinary, uploadDiseno } from '../middlewares/uploadDiseno.js';


// ==================== CREAR DISEÑO ====================
export const crearDiseno = async (req, res) => {
  try {
    const { titulo, descripcion, precio, portada } = req.body;
    const id_usuario = req.usuario.id_usuario;

    // 1️⃣ Validaciones de campos
    if (!titulo || !descripcion || !precio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (!req.files?.archivo_3d) {
      return res.status(400).json({ error: 'Debes subir un archivo 3D' });
    }

    if (!req.files?.imagenes || req.files.imagenes.length === 0) {
      return res.status(400).json({ error: 'Debes subir al menos una imagen' });
    }

    // 2️⃣ Validar que no exista un diseño con el mismo título para el usuario
    const existe = await pool.query(
      `SELECT 1 FROM disenos WHERE id_usuario=$1 AND titulo=$2`,
      [id_usuario, titulo]
    );

    if (existe.rowCount > 0) {
      return res.status(400).json({ error: 'Ya tenés un diseño con ese título' });
    }

    // ✅ Hasta acá, todo validado, ahora sí podemos subir archivos

    const tituloSeguro = titulo.trim().replace(/\s+/g, '_');
    const carpetaBase = `usuarios/${req.usuario.apodo}/disenos/${tituloSeguro}`;

    // 3️⃣ Subir archivo 3D
    const archivo3DUrl = await subirArchivoCloudinary(
      req.files.archivo_3d[0].buffer,
      'raw',
      `${carpetaBase}/diseno`,
      req.files.archivo_3d[0].originalname.split('.')[0]
    );

    // 4️⃣ Subir imágenes
    const imagenesUrls = [];
    for (const file of req.files.imagenes) {
      const url = await subirArchivoCloudinary(
        file.buffer,
        'image',
        `${carpetaBase}/imagenes`,
        file.originalname.split('.')[0]
      );
      imagenesUrls.push(url);
    }

    // 5️⃣ Insertar diseño en la base
    const result = await pool.query(
      `INSERT INTO disenos 
       (titulo, descripcion, archivo_url, precio, id_usuario)
       VALUES ($1,$2,$3,$4,$5) RETURNING id_diseno`,
      [titulo, descripcion, archivo3DUrl, precio, id_usuario]
    );

    const id_diseno = result.rows[0].id_diseno;

    // 6️⃣ Guardar imágenes respetando el orden (0 = portada)
    const portadaIndex = parseInt(portada) || 0;
    for (const [i, url] of imagenesUrls.entries()) {
      const orden = i === portadaIndex ? 0 : i >= portadaIndex ? i : i + 1;
      await pool.query(
        `INSERT INTO imagenes_diseno (id_diseno, url_imagenes, orden)
         VALUES ($1, $2, $3)`,
        [id_diseno, url, orden]
      );
    }

    res.status(201).json({ mensaje: 'Diseño creado correctamente', id_diseno });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear diseño' });
  }
};

// ==================== OBTENER TODOS LOS DISEÑOS ====================
export const getDisenos = async (req, res) => {
  try {
    const search = req.query.search || "";
    const query = `
      SELECT d.id_diseno,
             d.titulo,
             u.apodo AS creador,
             CASE WHEN d.precio = 0 THEN 'Gratis' ELSE CONCAT('$', d.precio) END AS precio,
             COALESCE(
               json_agg(i.url_imagenes ORDER BY i.orden) 
               FILTER (WHERE i.url_imagenes IS NOT NULL),
               '{}'
             ) AS imagenes
      FROM disenos d
      JOIN usuarios u ON d.id_usuario = u.id_usuario
      LEFT JOIN imagenes_diseno i ON d.id_diseno = i.id_diseno
      WHERE LOWER(d.titulo) LIKE LOWER($1)
      GROUP BY d.id_diseno, u.apodo, d.precio
      ORDER BY d.fecha_subida DESC
    `;
    const result = await pool.query(query, [`%${search}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo diseños:", err);
    res.status(500).json({ error: "Error al obtener diseños" });
  }
};

// ==================== OBTENER UN DISEÑO POR ID ====================
export const getDisenoById = async (req, res) => {
  const { id } = req.params;
  try {
    const disenoQuery = `
      SELECT d.id_diseno, d.titulo, d.descripcion, d.archivo_url, 
             d.precio, d.fecha_subida, d.categoria, d.etiqueta, d.parametros_fabricacion,
             u.apodo AS creador
      FROM disenos d
      JOIN usuarios u ON d.id_usuario = u.id_usuario
      WHERE d.id_diseno = $1
    `;
    const disenoResult = await pool.query(disenoQuery, [id]);
    if (disenoResult.rows.length === 0) {
      return res.status(404).json({ error: "Diseño no encontrado" });
    }

    const imagenesQuery = `
      SELECT url_imagenes, orden
      FROM imagenes_diseno
      WHERE id_diseno = $1
      ORDER BY orden ASC
    `;
    const imagenesResult = await pool.query(imagenesQuery, [id]);

    res.json({
      ...disenoResult.rows[0],
      imagenes: imagenesResult.rows.map(img => img.url_imagenes)
    });
  } catch (err) {
    console.error("Error obteniendo diseño:", err);
    res.status(500).json({ error: "Error al obtener el diseño" });
  }
};
