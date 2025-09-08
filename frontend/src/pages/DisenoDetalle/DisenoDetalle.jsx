// src/components/DisenoDetalle/DisenoDetalle.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DisenoDetalle.css';
import { useCart } from '../../context/CartContext';

export default function DisenoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { addItem } = useCart();
  const [diseno, setDiseno] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [imagenActiva, setImagenActiva] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAgregadoModal, setShowAgregadoModal] = useState(false);

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/disenos/${id}`);
        if (!res.ok) throw new Error(`Error al cargar diseño (${res.status})`);
        const data = await res.json();
        data.imagenes = Array.isArray(data.imagenes) ? data.imagenes : [];
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

  const agregarAlCarrito = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Debes iniciar sesión para agregar al carrito");
      return;
    }

    await addItem(diseno.id_diseno);

    // Mostrar modal temporal
    setShowAgregadoModal(true);
    setTimeout(() => setShowAgregadoModal(false), 2500);

  } catch (err) {
    console.error("❌ Error al agregar al carrito:", err.message);
    alert("Error al agregar al carrito");
  }
};

  if (cargando) return <p className="cargando">Cargando diseño…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!diseno) return <p className="error">Diseño no encontrado</p>;

  const {
    titulo, creador, descripcion,
    categoria, etiqueta, parametros_fabricacion,
    precio, imagenes
  } = diseno;

  const prevImagen = () => setImagenActiva(i => (i - 1 + imagenes.length) % imagenes.length);
  const nextImagen = () => setImagenActiva(i => (i + 1) % imagenes.length);

  return (
    <div className="diseno-detalle-page">
      <button className="volver" onClick={() => navigate(-1)}>← Volver a galería</button>

      <div className="detalle-card">
        <div className="gallery-section">
          <div className="main-img" onClick={() => setModalOpen(true)}>
            <img
              src={imagenes[imagenActiva]?.url}
              alt={`${titulo} ${imagenActiva + 1}`}
            />
          </div>
          <div className="thumb-row">
            {imagenes.map((img, i) => (
              <div
                key={img.id_imagen}
                className={i === imagenActiva ? "thumb-wrapper active" : "thumb-wrapper"}
                onClick={() => setImagenActiva(i)}
              >
                <img className="thumb" src={img.url} alt={`miniatura ${i + 1}`} />
              </div>
            ))}
          </div>
          <h2 className="description">Description</h2>
          <p className="description">{descripcion}</p>
        </div>

        <div className="info-section">
          <div className="price-download">
            <span className="price">{Number(precio) === 0 ? 'Gratis' : `$ ${precio}`}</span>
            {usuario?.apodo !== creador && (
              <button onClick={agregarAlCarrito} className="btn-download">
                Descargar
              </button>
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
            {categoria && <span className="tag">{categoria}</span>}
            {etiqueta && <span className="tag">{etiqueta}</span>}
          </div>
          {parametros_fabricacion && (
            <ul className="details-list">
              <li><strong>Parámetros:</strong> {parametros_fabricacion}</li>
            </ul>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-content2" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            <button className="modal-nav left" onClick={prevImagen}>‹</button>
            <img className="modal-img" src={imagenes[imagenActiva]?.url} alt={`Ampliada ${titulo}`} />
            <button className="modal-nav right" onClick={nextImagen}>›</button>
            <div className="modal-thumb-row">
              {imagenes.map((img, i) => (
                <div key={img.id_imagen} className={i === imagenActiva ? "modal-thumb-wrapper active" : "modal-thumb-wrapper"}>
                  <img className="modal-thumb" src={img.url} alt={`mini ampliada ${i + 1}`} />
                </div>
              ))}
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
