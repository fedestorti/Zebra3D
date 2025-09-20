//disenos.controller.js
import pool from '../db.js';
import { subirArchivoCloudinary, uploadDiseno } from '../middlewares/uploadDiseno.js';
import { cloudinary } from '../lib/cloudinary.js';


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
const imagenesData = [];
for (const file of req.files.imagenes) {
  const { url, public_id } = await subirArchivoCloudinary(
    file.buffer,
    'image',
    `${carpetaBase}/imagenes`,
    file.originalname.split('.')[0]
  );
  imagenesData.push({ url, public_id });
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
    for (const [i, img] of imagenesData.entries()) {
  const orden = i === portadaIndex ? 0 : i >= portadaIndex ? i : i + 1;
  await pool.query(
    `INSERT INTO imagenes_diseno (id_diseno, url_imagenes, public_id, orden)
     VALUES ($1, $2, $3, $4)`,
    [id_diseno, img.url, img.public_id, orden]
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
    const search = (req.query.search || '').trim();
    const catParam = req.query.cat;                 // p.ej. ?cat=12
    const cslug    = (req.query.cslug || '').trim(); // p.ej. ?cslug=figuras

    const where = [];
    const params = [];
    let idx = 1;

    if (search) {
      where.push(`LOWER(d.titulo) LIKE LOWER($${idx++})`);
      params.push(`%${search}%`);
    }

    // Resolver categoría a ID (acepta id, slug o nombre)
    if (catParam || cslug) {
      let catId = null;

      if (catParam && /^\d+$/.test(String(catParam))) {
        catId = Number(catParam);
      } else if (cslug) {
        const r = await pool.query(
          `SELECT id_categoria
             FROM categorias
            WHERE slug = $1 OR LOWER(nombre) = LOWER($1)
            LIMIT 1`,
          [cslug]
        );
        if (r.rowCount) catId = r.rows[0].id_categoria;
      }

      if (catId) {
        where.push(`d.categoria = $${idx++}`);
        params.push(catId);
      }
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT
        d.id_diseno,
        d.titulo,
        u.apodo AS creador,
        d.precio,                         -- NUMÉRICO (no string)
        d.categoria,                      -- id de categoría
        COALESCE(c.nombre, '') AS categoria_nombre,
        COALESCE(c.slug,   '') AS categoria_slug,
        COALESCE(
          json_agg(i.url_imagenes ORDER BY i.orden)
            FILTER (WHERE i.url_imagenes IS NOT NULL),
          '[]'
        ) AS imagenes
      FROM disenos d
      JOIN usuarios u         ON u.id_usuario = d.id_usuario
      LEFT JOIN categorias c  ON c.id_categoria = d.categoria
      LEFT JOIN imagenes_diseno i ON i.id_diseno = d.id_diseno
      ${whereSQL}
      GROUP BY d.id_diseno, u.apodo, c.nombre, c.slug
      ORDER BY d.fecha_subida DESC
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo diseños:', err);
    res.status(500).json({ error: 'Error al obtener diseños' });
  }
};

// ==================== OBTENER UN DISEÑO POR ID ====================
export const getDisenoById = async (req, res) => {
  const { id } = req.params;
  try {
    // Diseño + datos de categoría
    const disenoQuery = `
      SELECT 
        d.id_diseno,
        d.titulo,
        d.descripcion,
        d.archivo_url,
        d.precio,
        d.fecha_subida,
        d.categoria           AS categoria_id,      -- ID (FK)
        COALESCE(c.nombre, '') AS categoria_nombre, -- nombre legible
        COALESCE(c.slug,   '') AS categoria_slug,   -- slug
        d.etiqueta,
        d.parametros_fabricacion,
        u.apodo AS creador
      FROM disenos d
      JOIN usuarios u        ON d.id_usuario = u.id_usuario
      LEFT JOIN categorias c ON c.id_categoria = d.categoria
      WHERE d.id_diseno = $1
      LIMIT 1
    `;
    const disenoResult = await pool.query(disenoQuery, [id]);
    if (disenoResult.rows.length === 0) {
      return res.status(404).json({ error: "Diseño no encontrado" });
    }

    // Imágenes del diseño
    const imagenesQuery = `
      SELECT id_imagen, url_imagenes, orden
      FROM imagenes_diseno
      WHERE id_diseno = $1
      ORDER BY orden ASC, id_imagen ASC
    `;
    const imagenesResult = await pool.query(imagenesQuery, [id]);

    const row = disenoResult.rows[0];

    // Respuesta: compat + datos ricos de categoría
    res.json({
      id_diseno: row.id_diseno,
      titulo: row.titulo,
      descripcion: row.descripcion,
      archivo_url: row.archivo_url,
      precio: row.precio,
      fecha_subida: row.fecha_subida,
      categoria: row.categoria_id, // compat: sigue siendo el ID numérico
      categoria_nombre: row.categoria_nombre,
      categoria_slug: row.categoria_slug,
      etiqueta: row.etiqueta,
      parametros_fabricacion: row.parametros_fabricacion,
      creador: row.creador,
      imagenes: imagenesResult.rows.map(img => ({
        id_imagen: img.id_imagen,
        url: img.url_imagenes,
        orden: img.orden,
        portada: img.orden === 0
      }))
    });

  } catch (err) {
    console.error("Error obteniendo diseño:", err);
    res.status(500).json({ error: "Error al obtener el diseño" });
  }
};


// ==================== OBTENER DISEÑOS DE UN USUARIO ====================
export const getDisenosUsuario = async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const query = `
      SELECT d.id_diseno,
             d.titulo,
             d.descripcion,
             d.archivo_url,
             d.precio,
             COALESCE(
               json_agg(i.url_imagenes ORDER BY i.orden)
               FILTER (WHERE i.url_imagenes IS NOT NULL),
               '{}'
             ) AS imagenes
      FROM disenos d
      LEFT JOIN imagenes_diseno i ON d.id_diseno = i.id_diseno
      WHERE d.id_usuario = $1
      GROUP BY d.id_diseno
      ORDER BY d.fecha_subida DESC
    `;
    const result = await pool.query(query, [id_usuario]);

    // 💥 Esta línea es clave: devolvemos un array directo
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error obteniendo diseños del usuario:", err);
    res.status(500).json({ error: "Error al obtener diseños del usuario" });
  }
};

// ==================== ELIMINAR DISEÑO ====================
export const eliminarDiseno = async (req, res) => {
  const { id } = req.params;

  try {
    // 1️⃣ Obtener diseño y usuario
    const disenoRes = await pool.query(
      `SELECT titulo, id_usuario FROM disenos WHERE id_diseno = $1`,
      [id]
    );

    if (disenoRes.rowCount === 0) {
      return res.status(404).json({ error: "Diseño no encontrado" });
    }

    const diseno = disenoRes.rows[0];

    // 2️⃣ Obtener apodo del usuario
    const usuarioRes = await pool.query(
      `SELECT apodo FROM usuarios WHERE id_usuario = $1`,
      [diseno.id_usuario]
    );

    const apodo = usuarioRes.rows[0].apodo;

    // 3️⃣ Construir path de carpeta en Cloudinary
    const folderPath = `usuarios/${apodo}/disenos/${diseno.titulo.replace(/\s+/g,'_')}`;
    console.log('🔹 Carpeta de Cloudinary a borrar:', folderPath);

    // 4️⃣ Borrar todos los recursos de tipo image y raw en la carpeta principal
    await cloudinary.api.delete_resources_by_prefix(`${folderPath}/`, { resource_type: 'image' });
    await cloudinary.api.delete_resources_by_prefix(`${folderPath}/`, { resource_type: 'raw' });
    console.log('✅ Todos los recursos dentro de la carpeta y subcarpetas borrados');

    // 5️⃣ Borrar subcarpetas si existieran
    const subcarpetas = ['diseno', 'imagenes'];
    for (const sub of subcarpetas) {
      const subFolderPath = `${folderPath}/${sub}`;
      try {
        await cloudinary.api.delete_resources_by_prefix(`${subFolderPath}/`, { resource_type: 'image' });
        await cloudinary.api.delete_resources_by_prefix(`${subFolderPath}/`, { resource_type: 'raw' });
        await cloudinary.api.delete_folder(subFolderPath);
        console.log(`✅ Subcarpeta eliminada: ${sub}`);
      } catch {
        // Si no existe o ya estaba vacía, no hace nada
      }
    }

    // 6️⃣ Borrar carpeta principal
    try {
      await cloudinary.api.delete_folder(folderPath);
      console.log('✅ Carpeta principal eliminada');
    } catch {
      console.log('⚠️ Carpeta principal ya está vacía o no existe');
    }

    // 7️⃣ Borrar imágenes de la base
    await pool.query(`DELETE FROM imagenes_diseno WHERE id_diseno = $1`, [id]);

    // 8️⃣ Borrar diseño de la base
    await pool.query(`DELETE FROM disenos WHERE id_diseno = $1`, [id]);

    res.json({ message: "Diseño eliminado con éxito" });
  } catch (error) {
    console.error("Error al eliminar diseño:", error);
    res.status(500).json({ error: "Error al eliminar el diseño" });
  }
};

// ==================== ACTUALIZAR DISEÑO ====================
export const updateDiseno = async (req, res) => {
  const { id } = req.params;
  const {
    titulo,
    descripcion,
    precio,
    categoria,                     // puede venir id (número), slug o nombre
    etiqueta,
    parametros_fabricacion,
    portadaSeleccionada,
    imagenesEliminar
  } = req.body;

  const archivo = req.files?.archivo_3d?.[0];
  const imagenes = req.files?.imagenes || [];

  try {
    // 1) Diseño actual
    const disenoActual = (await pool.query(
      `SELECT * FROM disenos WHERE id_diseno = $1`,
      [id]
    )).rows[0];
    if (!disenoActual) return res.status(404).json({ error: "Diseño no encontrado" });

    // 2) Usuario (para paths de Cloudinary)
    const usuarioDB = (await pool.query(
      "SELECT apodo FROM usuarios WHERE id_usuario = $1",
      [req.usuario.id_usuario]
    )).rows[0];
    if (!usuarioDB) return res.status(404).json({ error: "Usuario no encontrado" });
    const apodo = usuarioDB.apodo;

    // 3) Carpeta base
    const carpetaBase = `usuarios/${apodo}/disenos/${(titulo || disenoActual.titulo)}`;

    // 4) Archivo 3D (si hay)
    let archivo_url = disenoActual.archivo_url || null;
    if (archivo) {
      if (archivo_url) {
        try {
          const publicId = archivo_url.split('/').slice(-1)[0].split('.')[0];
          await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        } catch (err) {
          console.warn("No se pudo borrar el archivo 3D viejo:", err.message);
        }
      }
      const resultArchivo = await subirArchivoCloudinary(
        archivo.buffer,
        "raw",
        `${carpetaBase}/diseno`,
        archivo.originalname.split('.')[0].replace(/\s+/g, '_')
      );
      archivo_url = resultArchivo.url;
    }

    // 4.5) Resolver ID de categoría (si vino algo en 'categoria')
    // La columna disenos.categoria es INTEGER (FK a categorias.id_categoria)
    let categoriaId = disenoActual.categoria; // por defecto queda como estaba
    if (categoria !== undefined) {
      // Permitir limpiar la categoría
      if (categoria === null || categoria === '') {
        categoriaId = null;
      } else {
        // Si es número: validar existencia
        if (/^\d+$/.test(String(categoria))) {
          const r = await pool.query(
            `SELECT id_categoria FROM categorias WHERE id_categoria = $1 AND activa = TRUE`,
            [Number(categoria)]
          );
          if (r.rowCount === 0) {
            return res.status(400).json({ error: "Categoría (id) inexistente o inactiva" });
          }
          categoriaId = r.rows[0].id_categoria;
        } else {
          // Si es texto: buscar por slug o nombre (case-insensitive)
          const r = await pool.query(
            `SELECT id_categoria
               FROM categorias
              WHERE (slug = $1 OR LOWER(nombre) = LOWER($2))
                AND activa = TRUE
              LIMIT 1`,
            [String(categoria), String(categoria)]
          );
          if (r.rowCount === 0) {
            return res.status(400).json({ error: "Categoría (slug/nombre) inexistente o inactiva" });
          }
          categoriaId = r.rows[0].id_categoria;
        }
      }
    }

    // 5) Actualizar campos del diseño
    const updateFields = [
      "titulo = $1",
      "descripcion = $2",
      "precio = $3",
      "categoria = $4",          // << ahora siempre va un ID o NULL
      "etiqueta = $5",
      "parametros_fabricacion = $6",
      "archivo_url = $7"
    ];

    const params = [
      titulo ?? disenoActual.titulo,
      descripcion ?? disenoActual.descripcion,
      (precio ?? disenoActual.precio),
      categoriaId,                                    // <-- ID resuelto
      etiqueta ?? disenoActual.etiqueta,
      parametros_fabricacion ?? disenoActual.parametros_fabricacion,
      archivo_url,
      id
    ];

    const query = `UPDATE disenos SET ${updateFields.join(", ")} WHERE id_diseno = $8 RETURNING *;`;
    const updatedDiseno = (await pool.query(query, params)).rows[0];

    // 6) Eliminar imágenes marcadas
    if (imagenesEliminar) {
      let idsEliminar;
      try { idsEliminar = JSON.parse(imagenesEliminar); } catch { idsEliminar = []; }
      if (Array.isArray(idsEliminar) && idsEliminar.length) {
        for (const idImg of idsEliminar) {
          const imgRow = (await pool.query(
            `SELECT public_id FROM imagenes_diseno WHERE id_imagen = $1`,
            [idImg]
          )).rows[0];
          if (imgRow) {
            try { await cloudinary.uploader.destroy(imgRow.public_id, { resource_type: "image" }); } catch {}
            await pool.query(`DELETE FROM imagenes_diseno WHERE id_imagen = $1`, [idImg]);
          }
        }
      }
    }

    // 7) Subir nuevas imágenes
    for (const img of imagenes) {
      const nombreBase = img.originalname.split('.')[0]
        .replace(/\s+/g, '_').replace(/\./g, '-').replace(/[^a-zA-Z0-9-_]/g, '');

      try {
        const { url, public_id } = await subirArchivoCloudinary(
          img.buffer, 'image', `${carpetaBase}/imagenes`, nombreBase
        );
        if (!url || !public_id) throw new Error("Archivo no subido correctamente");

        // En PUT, si querés que alguna de las NUEVAS sea portada deberías
        // marcarla luego de guardar y conocer su id_imagen. Por ahora 1.
        await pool.query(
          `INSERT INTO imagenes_diseno (id_diseno, url_imagenes, public_id, orden)
           VALUES ($1, $2, $3, 1)`,
          [id, url, public_id]
        );
      } catch (err) {
        console.error("❌ Error al subir imagen:", img.originalname, err.message);
      }
    }

    // 8) Marcar portada si corresponde (solo sobre existentes)
    if (portadaSeleccionada) {
      await pool.query(
        `UPDATE imagenes_diseno
            SET orden = CASE WHEN id_imagen = $1 THEN 0 ELSE 1 END
          WHERE id_diseno = $2`,
        [portadaSeleccionada, id]
      );
    }

    // 9) Volver imágenes actualizadas
    const imagenesDiseno = (await pool.query(
      `SELECT id_imagen, url_imagenes AS url, orden
         FROM imagenes_diseno
        WHERE id_diseno = $1
        ORDER BY orden ASC, id_imagen ASC`,
      [id]
    )).rows;

    // (Opcional) enriquecer con info de la categoría
    let categoriaInfo = null;
    if (updatedDiseno.categoria) {
      const rCat = await pool.query(
        `SELECT id_categoria, nombre, slug FROM categorias WHERE id_categoria = $1`,
        [updatedDiseno.categoria]
      );
      categoriaInfo = rCat.rows[0] || null;
    }

    res.json({
      ...updatedDiseno,
      categoria_info: categoriaInfo,   // útil para el front
      imagenes: imagenesDiseno
    });

  } catch (err) {
    console.error("❌ Error al actualizar diseño:", err);
    res.status(500).json({ error: "Error al actualizar diseño" });
  }
};






// ==================== ELIMINAR IMAGEN INDIVIDUAL ====================
export const eliminarImagenDiseno = async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar el public_id en la DB
    const imagen = await pool.query(
      "SELECT public_id FROM imagenes_diseno WHERE id_imagen = $1",
      [id]
    );

    if (imagen.rows.length === 0) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    }

    const publicId = imagen.rows[0].public_id;

    // Borrarla de Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Borrarla de la base
    await pool.query("DELETE FROM imagenes_diseno WHERE id_imagen = $1", [id]);

    res.json({ message: "Imagen eliminada" });
  } catch (error) {
    console.error("Error eliminando imagen:", error);
    res.status(500).json({ message: "Error eliminando la imagen" });
  }
};


// ==================== ELEGIR PORTADA EN MODIFICACION ====================
export const seleccionarPortada = async (req, res) => {
  const { id_imagen } = req.params;

  try {
    const imagenRes = await pool.query(
      `SELECT id_diseno FROM imagenes_diseno WHERE id_imagen = $1`,
      [id_imagen]
    );
    if (imagenRes.rowCount === 0) return res.status(404).json({ error: "Imagen no encontrada" });

    const { id_diseno } = imagenRes.rows[0];

    // Poner todas las imágenes con orden > 0
    await pool.query(`UPDATE imagenes_diseno SET orden = orden + 1 WHERE id_diseno = $1`, [id_diseno]);

    // Marcar esta imagen como portada (orden = 0)
    await pool.query(`UPDATE imagenes_diseno SET orden = 0 WHERE id_imagen = $1`, [id_imagen]);

    const imagenesActualizadas = (await pool.query(
      `SELECT id_imagen, url_imagenes as url, orden FROM imagenes_diseno WHERE id_diseno = $1 ORDER BY orden ASC`,
      [id_diseno]
    )).rows;

    res.json({ message: "Portada actualizada", imagenes: imagenesActualizadas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar portada" });
  }
};

// ==================== MAS DISEÑOS DEL MISMO AUTOR ====================


export const getMasDelAutor = async (req, res) => {
  try {
    const disenoId = Number(req.params.id);
    const limit = Math.max(1, Math.min(10, Number(req.query.limit) || 4));
    if (!Number.isInteger(disenoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // autor del diseño actual
    const d = await pool.query(
      `SELECT d.id_usuario, u.apodo
         FROM disenos d
         JOIN usuarios u ON u.id_usuario = d.id_usuario
        WHERE d.id_diseno = $1`,
      [disenoId]
    );
    if (d.rowCount === 0) return res.status(404).json({ error: 'Diseño no encontrado' });

    const idUsuario = d.rows[0].id_usuario;
    const apodo = d.rows[0].apodo;

    const fetchBy = async ({ byUserId = true }) => {
      const where = byUserId
        ? `dis.id_usuario = $1 AND dis.id_diseno <> $2`
        : `u.apodo = $1 AND dis.id_diseno <> $2`;
      const params = byUserId ? [idUsuario, disenoId, limit] : [apodo, disenoId, limit];

      const q = `
        SELECT
          dis.id_diseno,
          dis.titulo,
          dis.precio,
          u.apodo AS creador,
          i1.url_imagenes AS portada_url
        FROM disenos dis
        JOIN usuarios u ON u.id_usuario = dis.id_usuario
        LEFT JOIN LATERAL (
          SELECT i.url_imagenes
            FROM imagenes_diseno i
           WHERE i.id_diseno = dis.id_diseno
           ORDER BY i.orden ASC
           LIMIT 1
        ) i1 ON TRUE
        WHERE ${where}
        ORDER BY dis.fecha_subida DESC
        LIMIT $3
      `;
      const r = await pool.query(q, params);
      return r.rows;
    };

    let rows = await fetchBy({ byUserId: true });
    if (rows.length === 0) rows = await fetchBy({ byUserId: false });

    res.json(rows);
  } catch (err) {
    console.error('Error getMasDelAutor:', err);
    res.status(500).json({ error: 'Error al obtener diseños del mismo autor' });
  }
};

