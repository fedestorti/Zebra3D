import pool from '../db.js';

export const crearDiseno = async (req, res) => {
  try {
    console.log('📥 Paso 2: Entrando a crearDiseno...');
    console.log('🧾 req.body:', req.body);
    console.log('🖼 req.files:', req.files);
    console.log('👤 Usuario autenticado:', req.usuario);

    // 1) Extrae el array y el primer elemento de 'archivo_3d'
    const archivos3D = req.files['archivo_3d'] || [];
    const archivo3D  = archivos3D[0];
    if (!archivo3D) {
      return res.status(400).json({ error: 'Debe subir un archivo 3D' });
    }

    // 2) Extrae las imágenes como array
    const imagenesArr = req.files['imagenes'] || [];

    console.log('📦 Archivo 3D recibido:', archivo3D.originalname, '→', archivo3D.path);
    console.log('🖼 Cantidad de imágenes:', imagenesArr.length);

    // 3) Mapea las URLs de imágenes
    const urlsImagenes = imagenesArr.map(img => img.path);
    const urlArchivo3D = archivo3D.path;

    // 4) Inserta en la tabla disenos
    const { titulo, descripcion, precio, categoria, etiqueta, parametros_fabricacion } = req.body;
    const precioFinal = precio === '' ? null : parseFloat(precio);
    const id_usuario = req.usuario.id_usuario;

    const result = await pool.query(
      `INSERT INTO disenos (
         titulo, descripcion, archivo_url, precio, categoria,
         etiqueta, parametros_fabricacion, id_usuario
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_diseno`,
      [titulo, descripcion, urlArchivo3D, precioFinal, categoria, etiqueta, parametros_fabricacion, id_usuario]
    );
    const id_diseno = result.rows[0].id_diseno;
    console.log('✅ Diseño insertado con ID:', id_diseno);

    // 5) Inserta las imágenes asociadas
    for (const img of imagenesArr) {
      await pool.query(
        `INSERT INTO imagenes_diseno (id_diseno, url_imagenes) VALUES ($1,$2)`,
        [id_diseno, img.path]
      );
      console.log('🖼 Imagen registrada en DB:', img.path);
    }

    // 6) Responde OK
    res.status(201).json({
      mensaje: '🎉 Diseño creado correctamente',
      id_diseno,
      imagenes_subidas: imagenesArr.length
    });
  } catch (error) {
    console.error('❌ Error al crear diseño:', error);
    res.status(500).json({ error: 'Error al crear diseño' });
  }
};


export const obtenerDisenosConImagenes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id_diseno,
        d.titulo,
        d.descripcion,
        d.precio,
        d.categoria,
        d.etiqueta,
        d.parametros_fabricacion,
        d.archivo_url,
        d.id_usuario,
        d.fecha_subida,
        COALESCE(
          json_agg(i.url_imagenes) FILTER (WHERE i.url_imagenes IS NOT NULL),
          '[]'
        ) AS imagenes
      FROM disenos d
      LEFT JOIN imagenes_diseno i ON d.id_diseno = i.id_diseno
      GROUP BY d.id_diseno
      ORDER BY d.fecha_subida DESC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener diseños:', error);
    res.status(500).json({ error: 'Error al obtener diseños' });
  }
};
