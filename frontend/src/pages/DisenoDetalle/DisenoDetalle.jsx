// src/components/DisenoDetalle/DisenoDetalle.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import API from '../../api';
import './DisenoDetalle.css';

export default function DisenoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const { addItem } = useCart();

  const [diseno, setDiseno] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [imagenActiva, setImagenActiva] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAgregadoModal, setShowAgregadoModal] = useState(false);

  // Modal dueño
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form edición
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio: 0,
    categoria: '', // ID para PUT
    etiqueta: '',
    parametros_fabricacion: ''
  });
  const [archivoNuevo, setArchivoNuevo] = useState(null);

  // Imágenes
  const MAX_IMGS = 5;
  const [imagenesNuevas, setImagenesNuevas] = useState([]);    // [{file, url}]
  const [imagenesEliminar, setImagenesEliminar] = useState([]); // [id_imagen]
  const [portadaSeleccionada, setPortadaSeleccionada] = useState(null); // id_imagen

  // Más del autor
  const [masDelAutor, setMasDelAutor] = useState([]);

  // Cargar diseño
  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get(`/disenos/${id}`);
        data.imagenes = Array.isArray(data.imagenes) ? data.imagenes : [];
        setDiseno(data);

        setForm({
          titulo: data.titulo || '',
          descripcion: data.descripcion || '',
          precio: data.precio ?? 0,
          categoria: data.categoria ?? '',
          etiqueta: data.etiqueta || '',
          parametros_fabricacion: data.parametros_fabricacion || ''
        });

        const portada = data.imagenes.find(img => img.orden === 0);
        setPortadaSeleccionada(portada?.id_imagen || null);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el diseño');
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  // Cargar más diseños del mismo autor
  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get(`/disenos/${id}/autor?limit=6`);
        setMasDelAutor(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('No se pudo cargar más del autor', e);
        setMasDelAutor([]);
      }
    })();
  }, [id]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (ownerModalOpen) setOwnerModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, ownerModalOpen]);

  useEffect(() => {
    document.body.style.overflow = (modalOpen || ownerModalOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen, ownerModalOpen]);

  const isOwner = useMemo(() => {
    if (!usuario || !diseno) return false;
    return usuario.apodo === diseno.creador;
  }, [usuario, diseno]);

  const agregarAlCarrito = async () => {
    try {
      const id_diseno = diseno?.id_diseno;
      if (!id_diseno) return alert('Error: diseño inválido.');
      await addItem(id_diseno);
      setShowAgregadoModal(true);
      setTimeout(() => setShowAgregadoModal(false), 2500);
    } catch (err) {
      console.error(err);
      alert('Error al agregar al carrito');
    }
  };

  if (cargando) return <p className="cargando">Cargando diseño…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!diseno) return <p className="error">Diseño no encontrado</p>;

  const {
    titulo, creador, descripcion,
    categoria, categoria_nombre, categoria_slug,
    etiqueta, parametros_fabricacion,
    precio, imagenes
  } = diseno;

  const prevImagen = () => setImagenActiva(i => (i - 1 + imagenes.length) % imagenes.length);
  const nextImagen = () => setImagenActiva(i => (i + 1) % imagenes.length);

  // Helpers edición imágenes
  const existentesConservadas = () =>
    (diseno?.imagenes?.length || 0) - imagenesEliminar.length;

  const espacioRestante = () =>
    Math.max(0, MAX_IMGS - existentesConservadas() - imagenesNuevas.length);

  const handleOwnerOpen = () => setOwnerModalOpen(true);
  const handleOwnerClose = () => {
    imagenesNuevas.forEach(p => URL.revokeObjectURL(p.url));
    setImagenesNuevas([]);
    setArchivoNuevo(null);
    setImagenesEliminar([]);
    if (portadaSeleccionada && imagenesEliminar.includes(portadaSeleccionada)) {
      setPortadaSeleccionada(null);
    }
    setOwnerModalOpen(false);
  };

  const handleFormChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleArchivoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['stl', 'obj', 'zip'].includes(ext)) {
      alert('Solo se permiten .stl, .obj o .zip');
      return;
    }
    setArchivoNuevo(file);
  };

  const handleImagenesChange = e => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => /(\.jpg|\.jpeg|\.png|\.gif)$/i.test(f.name));
    if (valid.length !== files.length) alert('Algunas imágenes no son válidas y fueron ignoradas');

    const cupo = espacioRestante();
    if (cupo <= 0) {
      alert(`Máximo ${MAX_IMGS} imágenes en total.`);
      e.target.value = '';
      return;
    }
    const tomar = valid.slice(0, cupo);
    const previews = tomar.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setImagenesNuevas(prev => [...prev, ...previews]);
    e.target.value = '';
  };

  const handleEliminarImagenNueva = idx => {
    URL.revokeObjectURL(imagenesNuevas[idx].url);
    setImagenesNuevas(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleEliminarImagen = id_imagen => {
    setImagenesEliminar(prev => {
      const next = prev.includes(id_imagen)
        ? prev.filter(id => id !== id_imagen)
        : [...prev, id_imagen];
      if (next.includes(portadaSeleccionada)) setPortadaSeleccionada(null);
      return next;
    });
  };

  const handleSeleccionarPortada = id_imagen => {
    if (imagenesEliminar.includes(id_imagen)) return;
    setPortadaSeleccionada(id_imagen);
  };

  const handleGuardar = async () => {
    try {
      const totalFinal = existentesConservadas() + imagenesNuevas.length;
      if (totalFinal > MAX_IMGS) return alert(`Máximo ${MAX_IMGS} imágenes en total.`);

      setSaving(true);
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v ?? ''));
      if (archivoNuevo) formData.append('archivo_3d', archivoNuevo);
      imagenesNuevas.forEach(img => formData.append('imagenes', img.file));
      formData.append('imagenesEliminar', JSON.stringify(imagenesEliminar));
      if (portadaSeleccionada) formData.append('portadaSeleccionada', String(portadaSeleccionada));

      const { data } = await API.put(`/disenos/${diseno.id_diseno}`, formData);
      setDiseno(d => ({ ...d, ...data }));

      imagenesNuevas.forEach(p => URL.revokeObjectURL(p.url));
      setImagenesNuevas([]);
      setArchivoNuevo(null);
      setImagenesEliminar([]);
      setOwnerModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarDiseno = async () => {
    if (!window.confirm('¿Seguro que querés eliminar este diseño?')) return;
    try {
      setDeleting(true);
      await API.delete(`/disenos/${diseno.id_diseno}`);
      navigate('/principal');
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el diseño');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="diseno-detalle-page">
      <button className="volver" onClick={() => navigate(-1)}>← Volver a galería</button>

      <div className="detalle-card">
        {/* Galería */}
        <div className="gallery-section">
          <div className="main-img" onClick={() => setModalOpen(true)}>
            <img
              src={imagenes[imagenActiva]?.url}
              alt={`${titulo} ${imagenActiva + 1}`}
              loading="eager"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 600px"
            />
          </div>

          <div className="thumb-row">
            {imagenes.map((img, i) => (
              <div
                key={img.id_imagen}
                className={i === imagenActiva ? 'thumb-wrapper active' : 'thumb-wrapper'}
                onClick={() => setImagenActiva(i)}
              >
                <img
                  className="thumb"
                  src={img.url}
                  alt={`miniatura ${i + 1}`}
                  loading="lazy"
                  sizes="80px"
                />
              </div>
            ))}
          </div>

          <h2 className="description">Description</h2>
          <p className="description">{descripcion}</p>
        </div>

        {/* Info */}
        <div className="info-section">
          <div className="price-row">
            <div className="price-download">
              <span className="price">{Number(precio) === 0 ? 'Gratis' : `$ ${precio}`}</span>

              {!usuario && (
                <button
                  className="btn-download"
                  onClick={() =>
                    navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
                  }
                  aria-label="Inicia sesión para descargar"
                >
                  Inicia sesión para descargar
                </button>
              )}

              {usuario && usuario.apodo !== creador && (
                <button onClick={agregarAlCarrito} className="btn-download">Descargar</button>
              )}
            </div>

            {isOwner && (
              <div className="owner-actions-inline">
                <button className="btn-owner edit" onClick={handleOwnerOpen}>Editar</button>
                <button className="btn-owner danger" onClick={handleEliminarDiseno} disabled={deleting}>
                  {deleting ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            )}
          </div>

          <h1 className="title">{titulo}</h1>

          {creador && (
            <p className="author">
              Creado por{' '}
              <strong className="authorLink" onClick={() => navigate(`/perfil/${creador}`)}>
                {creador}
              </strong>
            </p>
          )}

          <div className="tags">
            {categoria_nombre && (
              <span
                className="tag"
                role="link"
                onClick={() => navigate(`/principal?cat=${encodeURIComponent(categoria)}`)}
                title={categoria_slug || categoria_nombre}
                style={{ cursor: 'pointer' }}
              >
                {categoria_nombre}
              </span>
            )}
            {etiqueta && <span className="tag">{etiqueta}</span>}
          </div>

          {parametros_fabricacion && (
            <ul className="details-list">
              <li><strong>Parámetros:</strong> {parametros_fabricacion}</li>
            </ul>
          )}
        </div>

        {/* Columna derecha: Más del autor */}
        <aside className="more-by-author">
  <h3>Más de {creador}</h3>
  {masDelAutor.length === 0 ? (
    <p className="muted">Este creador no tiene más diseños.</p>
  ) : (
    <ul className="more-list">
      {masDelAutor.map(item => (
        <li
          key={item.id_diseno}
          className="more-card"
          onClick={() => navigate(`/disenos/${item.id_diseno}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/disenos/${item.id_diseno}`)}
          title={item.titulo}
        >
          <div className="more-thumb">
            {item.portada_url ? (
              <img src={item.portada_url} alt={item.titulo} loading="lazy" />
            ) : (
              <div className="placeholder-sm">Sin imagen</div>
            )}
          </div>
          <div className="more-info">
            <p className="more-title">{item.titulo}</p>
            <span className="more-price">
              {Number(item.precio) === 0 ? 'Gratis' : `$ ${item.precio}`}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )}
</aside>
      </div>

      {/* Modal galería */}
      {modalOpen && (
        <div className="modal2" onClick={() => setModalOpen(false)}>
          <div className="modal-content2" onClick={e => e.stopPropagation()}>
            <button className="modal-close2" onClick={() => setModalOpen(false)}>×</button>
            <button className="modal-nav left" onClick={prevImagen}>‹</button>
            <img
              className="modal-img"
              src={imagenes[imagenActiva]?.url}
              alt={`Ampliada ${titulo}`}
              loading="eager"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
            <button className="modal-nav right" onClick={nextImagen}>›</button>

            <div className="modal-thumb-row">
              {imagenes.map((img, i) => (
                <div
                  key={img.id_imagen}
                  className={i === imagenActiva ? 'modal-thumb-wrapper active' : 'modal-thumb-wrapper'}
                >
                  <img className="modal-thumb" src={img.url} alt={`mini ampliada ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal del dueño */}
      {ownerModalOpen && (
        <div className="owner-modal-backdrop" onClick={handleOwnerClose}>
          <div className="owner-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3>Editar diseño</h3>
              <button className="owner-close" onClick={handleOwnerClose}>×</button>
            </div>

            <div className="owner-modal-body">
              <div className="owner-meta-row">
                <span className="counter">
                  Imágenes: {existentesConservadas() + imagenesNuevas.length} / {MAX_IMGS}
                </span>
                {espacioRestante() === 0 && <span className="counter-full">Límite alcanzado</span>}
              </div>

              <div className="grid-two">
                <div className="col">
                  <label>Título</label>
                  <input name="titulo" value={form.titulo} onChange={handleFormChange} />
                </div>
                <div className="col">
                  <label>Precio</label>
                  <input name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={handleFormChange} />
                </div>
              </div>

              <div className="grid-two">
                <div className="col">
                  <label>Categoría (ID)</label>
                  <input name="categoria" value={form.categoria} onChange={handleFormChange} />
                </div>
                <div className="col">
                  <label>Etiqueta</label>
                  <input name="etiqueta" value={form.etiqueta} onChange={handleFormChange} />
                </div>
              </div>

              <div className="col">
                <label>Descripción</label>
                <textarea name="descripcion" rows={4} value={form.descripcion} onChange={handleFormChange} />
              </div>

              <div className="col">
                <label>Parámetros de fabricación</label>
                <input name="parametros_fabricacion" value={form.parametros_fabricacion} onChange={handleFormChange} />
              </div>

              <div className="grid-two">
                <div className="col">
                  <label>Archivo 3D (.stl, .obj o .zip)</label>
                  <input type="file" accept=".stl,.obj,.zip" onChange={handleArchivoChange} />
                </div>
                <div className="col">
                  <label>Agregar imágenes {espacioRestante() > 0 ? `(restan ${espacioRestante()})` : '(sin cupo)'}</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImagenesChange}
                    disabled={espacioRestante() === 0}
                  />
                </div>
              </div>

              {/* EXISTENTES */}
              <h4 className="subtle-title">Imágenes actuales</h4>
              <div className="thumbs-edit">
                {imagenes.map(img => {
                  const marcado = imagenesEliminar.includes(img.id_imagen);
                  const esPortada = portadaSeleccionada === img.id_imagen;

                  return (
                    <div
                      key={img.id_imagen}
                      className={`thumb-ed ${marcado ? 'danger' : ''} ${esPortada ? 'star' : ''}`}
                      role="group"
                      aria-label={`Imagen ${img.id_imagen}`}
                    >
                      <img src={img.url} alt="" />

                      <div className="thumb-ed-actions">
                        <button
                          type="button"
                          className="mini"
                          onClick={() => toggleEliminarImagen(img.id_imagen)}
                          aria-pressed={marcado}
                          title={marcado ? 'Deshacer eliminación' : 'Marcar para eliminar'}
                        >
                          {marcado ? 'Deshacer' : 'Eliminar'}
                        </button>
                      </div>

                      <div className="portada-picker">
                        <label className={`portada-label ${marcado ? 'disabled' : ''}`}>
                          <input
                            type="radio"
                            name="portada"
                            value={img.id_imagen}
                            checked={esPortada}
                            onChange={() => handleSeleccionarPortada(img.id_imagen)}
                            disabled={marcado}
                          />
                          {esPortada ? 'Portada seleccionada' : 'Establecer como portada'}
                        </label>
                      </div>

                      {esPortada && <span className="badge">Portada</span>}
                      {marcado && <span className="badge badge-danger">A borrar</span>}
                    </div>
                  );
                })}

                {/* NUEVAS PREVIEWS */}
                {imagenesNuevas.map((p, i) => (
                  <div key={`new-${i}`} className="thumb-ed new">
                    <img src={p.url} alt="nueva" />
                    <div className="thumb-ed-actions">
                      <button type="button" className="mini" onClick={() => handleEliminarImagenNueva(i)}>
                        Quitar
                      </button>
                    </div>
                    <div className="portada-picker">
                      <span className="portada-hint">Se puede elegir como portada tras guardar</span>
                    </div>
                  </div>
                ))}
              </div>

              {imagenesNuevas.length > 0 && (
                <p className="hint">
                  La portada se elige entre las guardadas. Si querés una nueva como portada,
                  guardá y después marcála.
                </p>
              )}
            </div>

            <div className="owner-modal-footer">
              <button className="btn ghost" onClick={handleOwnerClose}>Cancelar</button>
              <button className="btn primary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgregadoModal && (
        <>
          <div className="modal-overlay" />
          <div className="toast-carrito">🎉 ¡Diseño agregado al carrito!</div>
        </>
      )}
    </div>
  );
}
