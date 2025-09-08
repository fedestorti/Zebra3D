// src/pages/Tusdisenos/TusdisenosForm.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TarjetaDiseno from '../../components/TarjetaDiseno/TarjetaDiseno';
import './TusdisenosForm.css';

export default function TusdisenosForm() {
  const { usuario, loading } = useAuth();
  const [disenos, setDisenos] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [modalDiseno, setModalDiseno] = useState(null);
  const token = localStorage.getItem('token');

  // Formulario y archivos
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio: 0,
    categoria: '',
    etiqueta: '',
    parametros_fabricacion: ''
  });
  const [archivoNuevo, setArchivoNuevo] = useState(null);       // archivo 3D
  const [imagenesNuevas, setImagenesNuevas] = useState([]);     // imágenes nuevas [{file, url}]
  const [imagenesEliminar, setImagenesEliminar] = useState([]); // IDs de imágenes a borrar
  const [portadaSeleccionada, setPortadaSeleccionada] = useState(null);

  // Cargar diseños del usuario
  useEffect(() => {
    if (!usuario) { setFetching(false); return; }
    setFetching(true);
    fetch(`http://localhost:4000/api/disenos/usuario/${usuario.id_usuario}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDisenos(data))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [usuario, token]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (modalDiseno) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [modalDiseno]);

  // Abrir modal de edición
  const openModal = async (id_diseno) => {
    try {
      const res = await fetch(`http://localhost:4000/api/disenos/${id_diseno}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const imagenes = Array.isArray(data.imagenes) ? data.imagenes : [];
      setModalDiseno({ ...data, imagenes });

      setForm({
        titulo: data.titulo || '',
        descripcion: data.descripcion || '',
        precio: data.precio ?? 0,
        categoria: data.categoria || '',
        etiqueta: data.etiqueta || '',
        parametros_fabricacion: data.parametros_fabricacion || ''
      });

      setArchivoNuevo(null);
      setImagenesNuevas([]);
      setImagenesEliminar([]);
      const portada = imagenes.find(img => img.orden === 0);
      setPortadaSeleccionada(portada?.id_imagen || null);
    } catch (err) {
      console.error('Error al abrir modal:', err);
    }
  };

  const closeModal = () => setModalDiseno(null);
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Manejo de archivo 3D
  const handleArchivoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed3D = ['stl', 'obj', 'zip'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed3D.includes(ext)) {
      alert('Solo se permiten archivos 3D (.stl, .obj, .zip)');
      return;
    }
    setArchivoNuevo(file);
  };

  // Manejo de imágenes nuevas
  const handleImagenesChange = e => {
    const files = Array.from(e.target.files || []);
    const allowedImg = ['jpg', 'jpeg', 'png', 'gif'];

    if (imagenesNuevas.length + files.length > 5) {
      alert('Solo puedes subir hasta 5 imágenes nuevas');
      return;
    }

    const validFiles = files.filter(f => allowedImg.includes(f.name.split('.').pop().toLowerCase()));
    if (validFiles.length !== files.length) alert('Algunas imágenes no son válidas y fueron ignoradas');

    const previews = validFiles.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setImagenesNuevas(prev => [...prev, ...previews]);
  };

  const handleEliminarImagenNueva = idx => {
    const nuevos = [...imagenesNuevas];
    URL.revokeObjectURL(nuevos[idx].url);
    nuevos.splice(idx, 1);
    setImagenesNuevas(nuevos);
  };

  // Marcar imágenes para eliminar
  const toggleEliminarImagen = (id_imagen) => {
    setImagenesEliminar(prev =>
      prev.includes(id_imagen) ? prev.filter(id => id !== id_imagen) : [...prev, id_imagen]
    );
  };

  // Seleccionar portada
  const handleSeleccionarPortada = (id_imagen) => setPortadaSeleccionada(id_imagen);

  // Guardar cambios
  const handleGuardar = async () => {
    if (!modalDiseno) return;
    try {
      const formData = new FormData();
      formData.append('titulo', form.titulo);
      formData.append('descripcion', form.descripcion);
      formData.append('precio', form.precio);
      formData.append('categoria', form.categoria);
      formData.append('etiqueta', form.etiqueta);
      formData.append('parametros_fabricacion', form.parametros_fabricacion);
      if (archivoNuevo) formData.append('archivo_3d', archivoNuevo);
      imagenesNuevas.forEach(img => formData.append('imagenes', img.file));
      formData.append('imagenesEliminar', JSON.stringify(imagenesEliminar));
      formData.append('portadaSeleccionada', portadaSeleccionada);

      const res = await fetch(`http://localhost:4000/api/disenos/${modalDiseno.id_diseno}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Error al actualizar');
      const data = await res.json();

      // Actualizar la lista local
      const index = disenos.findIndex(d => d.id_diseno === modalDiseno.id_diseno);
      setDisenos([
        ...disenos.slice(0, index),
        { ...disenos[index], ...form, archivo_url: data.archivo_url, imagenes: data.imagenes },
        ...disenos.slice(index + 1)
      ]);

      closeModal();
    } catch (err) {
      console.error(err);
      alert('Error al guardar cambios');
    }
  };

  // Eliminar diseño completo
  const handleEliminar = async (id_diseno) => {
    if (!window.confirm('¿Seguro que querés eliminar este diseño?')) return;
    try {
      await fetch(`http://localhost:4000/api/disenos/${id_diseno}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setDisenos(disenos.filter(d => d.id_diseno !== id_diseno));
      if (modalDiseno?.id_diseno === id_diseno) closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || fetching) return <p>Cargando tus diseños...</p>;
  if (!usuario) return <p>Debes iniciar sesión para ver tus diseños.</p>;
  if (disenos.length === 0) return <p>No tienes diseños publicados aún.</p>;

  return (
    <div className="tus-disenos-container">
      <h2>Mis Diseños</h2>

      <div className="tus-disenos-galeria">
        {disenos
          .slice()
          .sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida))
          .map(d => (
            <div key={d.id_diseno} className="tarjeta-wrapper">
              <TarjetaDiseno diseno={d} />
              <div className="tarjeta-botones">
                <button className="btn editar" onClick={() => openModal(d.id_diseno)}>Editar</button>
                <button className="btn eliminar" onClick={() => handleEliminar(d.id_diseno)}>Eliminar</button>
              </div>
            </div>
          ))}
      </div>

      {modalDiseno && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div
            className="modal-content modal-elevado"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onKeyDown={(e) => e.key === 'Escape' && closeModal()}
            tabIndex={-1}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 id="modal-title">Editar diseño</h3>
              <button className="icon-btn" onClick={closeModal} aria-label="Cerrar">✕</button>
            </div>

            {/* Body en grid */}
            <div className="modal-body">
              {/* Columna izquierda: formulario */}
              <div className="modal-col">
                <div className="input-group">
                  <label>Título</label>
                  <input name="titulo" value={form.titulo} onChange={handleChange} placeholder="Título" />
                </div>

                <div className="input-group">
                  <label>Descripción</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción" rows={4} />
                </div>

                <div className="grid-2">
                  <div className="input-group2">
                    <label>Precio</label>
                    <input type="number" name="precio" value={form.precio} onChange={handleChange} placeholder="Precio" />
                  </div>
                  <div className="input-group">
                    <label>Categoría</label>
                    <input name="categoria" value={form.categoria} onChange={handleChange} placeholder="Categoría" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Etiqueta</label>
                  <input name="etiqueta" value={form.etiqueta} onChange={handleChange} placeholder="Etiqueta" />
                </div>

                <div className="input-group">
                  <label>Parámetros de fabricación</label>
                  <textarea name="parametros_fabricacion" value={form.parametros_fabricacion} onChange={handleChange} placeholder="Parámetros de fabricación" rows={3} />
                </div>

                <div className="input-group">
                  <label>Archivo 3D</label>
                  <div className="chip-row">
                    {modalDiseno.archivo_url
                      ? <a className="chip chip-link" href={modalDiseno.archivo_url} target="_blank" rel="noreferrer">Descargar actual</a>
                      : <span className="chip">Sin archivo</span>}
                    {archivoNuevo && <span className="chip chip-ok">Nuevo: {archivoNuevo.name}</span>}
                  </div>

                  {/* Dropzone simple + input */}
                  <label className="dropzone">
                    <input type="file" onChange={handleArchivoChange} className="hidden-input" />
                    <span>Arrastrá y soltá el .stl/.obj/.zip o hacé clic</span>
                  </label>
                </div>
              </div>

              {/* Columna derecha: imágenes */}
              <div className="modal-col">
                <div className="input-group">
                  <label className='titulo2'>Imágenes actuales</label>
                  <div className="thumbs">
                    {modalDiseno.imagenes.map(img => {
                      const marcada = imagenesEliminar.includes(img.id_imagen);
                      const esPortada = portadaSeleccionada === img.id_imagen;
                      return (
                        <div key={img.id_imagen} className={`thumb ${marcada ? 'thumb-danger' : ''} ${esPortada ? 'thumb-star' : ''}`}>
                          <img src={img.url} alt="imagen diseño" />
                          <div className="thumb-actions">
                            <button
                              className={`mini-btn ${marcada ? 'mini-btn-ghost' : 'mini-btn-danger'}`}
                              onClick={() => toggleEliminarImagen(img.id_imagen)}
                              title={marcada ? 'Desmarcar' : 'Eliminar'}
                            >
                              {marcada ? '↩️' : '🗑'}
                            </button>
                            <button
                              className={`mini-btn ${esPortada ? 'mini-btn-star' : ''}`}
                              onClick={() => handleSeleccionarPortada(img.id_imagen)}
                              title="Marcar como portada"
                            >
                              {esPortada ? '⭐' : '☆'}
                            </button>
                          </div>
                          {esPortada && <span className="badge">Portada</span>}
                          {marcada && <span className="badge badge-danger">A borrar</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="input-group">
                  <label className='titulo2'>Nuevas imágenes</label>
                  <div className="thumbs">
                    {imagenesNuevas.map((img, idx) => (
                      <div key={idx} className="thumb">
                        <img src={img.url} alt="preview" />
                        <div className="thumb-actions">
                          <button className="mini-btn mini-btn-danger" onClick={() => handleEliminarImagenNueva(idx)} title="Quitar">❌</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="dropzone">
                    <input
                      type="file"
                      multiple
                      onChange={handleImagenesChange}
                      accept="image/png, image/jpeg, image/jpg, image/gif"
                      className="hidden-input"
                    />
                    <span>Arrastrá imágenes o hacé clic (hasta 5)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer fijo */}
            <div className="modal-footer">
              <button className="btn btn-primario" onClick={handleGuardar}>Guardar cambios</button>
              <button className="btn btn-secundario" onClick={closeModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
