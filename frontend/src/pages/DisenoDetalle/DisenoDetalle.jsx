// src/components/DisenoDetalle/DisenoDetalle.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DisenoDetalle.css';

export default function DisenoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [diseno, setDiseno] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [imagenActiva, setImagenActiva] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/disenos/${id}`);
        if (!res.ok) throw new Error(`Error al cargar diseño (${res.status})`);
        const data = await res.json();

        let imgs = data.imagenes;
        if (typeof imgs === 'string') {
          try { imgs = JSON.parse(imgs); } catch { imgs = []; }
        }
        data.imagenes = Array.isArray(imgs) ? imgs : [];
        setDiseno(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };
    fetchDesign();
  }, [id]);

  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape' && modalOpen) setModalOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalOpen]);

  if (cargando) return <p className="cargando">Cargando diseño…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!diseno) return <p className="error">Diseño no encontrado</p>;

  const {
    titulo, creador, descripcion,
    categoria, etiqueta, parametros_fabricacion,
    precio, archivo_url, imagenes
  } = diseno;

  const prevImagen = () => setImagenActiva(i => (i - 1 + imagenes.length) % imagenes.length);
  const nextImagen = () => setImagenActiva(i => (i + 1) % imagenes.length);

  return (
    <div className="diseno-detalle-page">
      <button className="volver" onClick={() => navigate(-1)}>
        ← Volver a galería
      </button>

      <div className="detalle-card">
        {/* — Galería de imágenes — */}
        <div className="gallery-section">
          <div className="main-img" onClick={() => setModalOpen(true)}>
            <img
              src={imagenes[imagenActiva]}
              alt={`${titulo} ${imagenActiva + 1}`}
              onError={e => e.currentTarget.src = '/placeholder.png'}
            />
          </div>
          <div className="thumb-row">
            {imagenes.map((url, i) => (
              <div
                key={i}
                className={i === imagenActiva ? "thumb-wrapper active" : "thumb-wrapper"}
                onClick={() => setImagenActiva(i)}
              >
                <img
                  className="thumb"
                  src={url}
                  alt={`miniatura ${i + 1}`}
                  onError={e => e.currentTarget.src = '/placeholder.png'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* — Sección de información — */}
        <div className="info-section">
          <div className="price-download">
            <span className="price">{precio ? `$ ${precio}` : 'Gratis'}</span>
            {archivo_url && (
              <a className="btn-download" href={archivo_url} download rel="noopener noreferrer">
                Descargar 3D
              </a>
            )}
          </div>

          <h1 className="title">{titulo}</h1>

          {creador && (
            <p className="author">
              por{' '}
              <strong className="authorLink" onClick={() => navigate(`/perfil/${creador}`)}>
                {creador}
              </strong>
            </p>
          )}

          <p className="description">{descripcion}</p>

          <div className="tags">
            <span className="tag">{categoria}</span>
            <span className="tag">{etiqueta}</span>
          </div>

          <ul className="details-list">
            <li><strong>Parámetros:</strong> {parametros_fabricacion}</li>
          </ul>
        </div>
      </div>

      {/* — Modal de ampliación — */}
      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            <button className="modal-nav left" onClick={prevImagen}>‹</button>
            <img className="modal-img" src={imagenes[imagenActiva]} alt={`Ampliada ${titulo}`} />
            <button className="modal-nav right" onClick={nextImagen}>›</button>
            <div className="modal-thumb-row">
              {imagenes.map((url,i)=>(
                <div key={i} className={i===imagenActiva ? "modal-thumb-wrapper active" : "modal-thumb-wrapper"}>
                  <img className="modal-thumb" src={url} alt={`mini ampliada ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
