// frontend/src/pages/Disenos/DisenosForm.jsx
import { useEffect, useState, useRef } from 'react';
import './Disenos.css';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BotonZebra from '../../components/BotonZebra/BotonZebra';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGENES = 5;

export default function DisenosForm() {
  const { usuario, loading } = useAuth();
  const navigate = useNavigate();
  const archivoRef = useRef(null);
  const [idUsuario, setIdUsuario] = useState(null);
  const [previewImagenes, setPreviewImagenes] = useState([]);
  const [archivosImagenes, setArchivosImagenes] = useState([]);
  const [portadaIndex, setPortadaIndex] = useState(0);
  const [imagenes, setImagenes] = useState([]);
  const imagenesOrdenadas = [...previewImagenes];


  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    categoria: '',
    etiqueta: '',
    parametros_fabricacion: '',
    archivo_3d: null
  });
  const [archivo3DNombre, setArchivo3DNombre] = useState('');
  const [gratis, setGratis] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificando, setVerificando] = useState(true);

  // Modal para ver imágenes
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const token = localStorage.getItem('token');

  // Obtener id_usuario
  useEffect(() => {
    if (!loading && usuario?.id_usuario) setIdUsuario(usuario.id_usuario);
  }, [loading, usuario]);

  // Verificar sesión
  useEffect(() => {
    if (!token) navigate('/login');
    else setVerificando(false);
  }, [usuario]);

  // Cambiar portada sin borrar la foto
  const handleHacerPortada = (index) => {
    setPortadaIndex(index);
  };

  // Cambiar portada primera
  if (imagenesOrdenadas.length > 1 && portadaIndex !== 0) {
  const portada = imagenesOrdenadas.splice(portadaIndex, 1)[0]; // sacar portada
  imagenesOrdenadas.unshift(portada); // ponerla al inicio
  }

  // abrir modal
  useEffect(() => {
  const handleEsc = (e) => {
    if (e.key === 'Escape') setModalOpen(false);
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
  }, []);


  // cerrar modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setGaleriaAbierta(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      if (name === 'imagenes') {
        const nuevosArchivos = Array.from(files);

        for (const img of nuevosArchivos) {
          if (img.size > MAX_FILE_SIZE) {
            alert(`La imagen "${img.name}" supera el tamaño máximo de 10 MB.`);
            return;
          }
        }

        if (archivosImagenes.length + nuevosArchivos.length > MAX_IMAGENES) {
          alert(`Solo podés subir hasta ${MAX_IMAGENES} imágenes.`);
          return;
        }

        const nuevasPreviews = nuevosArchivos.map(file => URL.createObjectURL(file));
        setArchivosImagenes(prev => [...prev, ...nuevosArchivos]);
        setPreviewImagenes(prev => [...prev, ...nuevasPreviews]);
      } else if (name === 'archivo_3d') {
        const archivo = files[0];
        if (!archivo) return;

        if (archivo.size > MAX_FILE_SIZE) {
          alert(`El archivo "${archivo.name}" supera el tamaño máximo de 10 MB.`);
          e.target.value = null;
          setArchivo3DNombre('');
          setForm(prev => ({ ...prev, archivo_3d: null }));
          return;
        }

        setArchivo3DNombre(archivo.name);
        setForm(prev => ({ ...prev, archivo_3d: archivo }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const borrarImagen = (indice) => {
    setPreviewImagenes(prev => prev.filter((_, i) => i !== indice));
    setArchivosImagenes(prev => prev.filter((_, i) => i !== indice));
    if (indice === portadaIndex) setPortadaIndex(0);
    else if (indice < portadaIndex) setPortadaIndex(portadaIndex - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMensaje('');

    if (!form.titulo.trim() || !form.descripcion.trim() || (!form.precio && !gratis)) {
      setMensaje('❌ Completa todos los campos obligatorios');
      setIsSubmitting(false);
      return;
    }
    if (!form.archivo_3d) {
      setMensaje('❌ Debes subir un archivo 3D');
      setIsSubmitting(false);
      return;
    }
    if (archivosImagenes.length === 0) {
      setMensaje('❌ Debes subir al menos una imagen');
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('titulo', form.titulo.trim());
      formData.append('descripcion', form.descripcion.trim());
      formData.append('precio', gratis ? 0 : form.precio);
      formData.append('categoria', form.categoria.trim());
      formData.append('etiqueta', form.etiqueta.trim());
      formData.append('parametros_fabricacion', form.parametros_fabricacion.trim());
      formData.append('archivo_3d', form.archivo_3d);

      archivosImagenes.forEach(img => formData.append('imagenes', img));
      formData.append('portada', portadaIndex);

      const res = await fetch('http://localhost:4000/api/disenos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error inesperado del servidor');

      setMensaje('✅ Diseño subido correctamente');
      setTimeout(() => {
        setForm({
          titulo: '',
          descripcion: '',
          precio: '',
          categoria: '',
          etiqueta: '',
          parametros_fabricacion: '',
          archivo_3d: null
        });
        setPreviewImagenes([]);
        setArchivosImagenes([]);
        setArchivo3DNombre('');
        setGratis(false);
        setPortadaIndex(0);
        if (archivoRef.current) archivoRef.current.value = null;
        setMensaje('');
      }, 1500);
    } catch (err) {
      setMensaje('❌ ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirModal = (i) => {
    setModalIndex(i);
    setModalOpen(true);
  };

  const cerrarModal = () => setModalOpen(false);

  const siguienteImagen = () => setModalIndex((modalIndex + 1) % previewImagenes.length);
  const anteriorImagen = () => setModalIndex((modalIndex - 1 + previewImagenes.length) % previewImagenes.length);

  if (verificando) return <p>Cargando sesión...</p>;

  return (
  <div className="pagina-disenos">
    <h2 className="titulo-seccion">Subí tu diseño 3D 🧩</h2>
    <div className="contenedor-diseno">
      <form onSubmit={handleSubmit} className="formulario-diseno">
        <input
          type="text"
          name="titulo"
          placeholder="Título"
          value={form.titulo}
          onChange={handleChange}
          required
        />
        <textarea
          name="descripcion"
          placeholder="Descripción"
          value={form.descripcion}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="categoria"
          placeholder="Categoría"
          value={form.categoria}
          onChange={handleChange}
        />
        <input
          type="text"
          name="etiqueta"
          placeholder="Etiqueta"
          value={form.etiqueta}
          onChange={handleChange}
        />
        <textarea
          name="parametros_fabricacion"
          placeholder="Parámetros de fabricación"
          value={form.parametros_fabricacion}
          onChange={handleChange}
        />

        <div className="precio-wrapper">
          <input
            type="number"
            name="precio"
            placeholder="Precio"
            value={gratis ? 0 : form.precio || ''}
            onChange={handleChange}
            step="0.01"
            disabled={gratis}
            className="precio"
          />
          <label>
            <input
              type="checkbox"
              checked={gratis}
              onChange={() => {
                setGratis(!gratis);
                setForm(prev => ({ ...prev, precio: !gratis ? 0 : '' }));
              }}
            />{' '}
            Gratis
          </label>
        </div>

        <div className="input-file-wrapper">
          <label htmlFor="imagenes" className="btn-agregar-imagenes">
            Agregar imágenes (máx 5)
          </label>
          <input
            id="imagenes"
            type="file"
            name="imagenes"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.gif"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="input-file-wrapper">
          <label htmlFor="archivo_3d" className="btn-agregar-archivo">
            {archivo3DNombre || 'Subir archivo 3D'}
          </label>
          <input
            id="archivo_3d"
            type="file"
            name="archivo_3d"
            accept=".stl,.obj,.rar"
            onChange={handleChange}
            style={{ display: 'none' }}
            ref={archivoRef}
          />
        </div>

        <BotonZebra
          type="submit"
          texto="Subir diseño"
          enviando={isSubmitting}
          disabled={isSubmitting}
          style={{ width: '100%' }}
        />
        {mensaje && <p className="mensaje">{mensaje}</p>}
      </form>

      <div className="preview-column">
        {imagenesOrdenadas.map((src, i) => (
          <div key={i} className={`preview-wrapper ${i === 0 ? 'portada' : ''}`}>
            <img
              src={src}
              alt={`preview-${i}`}
              className="preview-imagen"
              onClick={() => abrirModal(i)}
            />
            <div className="preview-buttons">
              <button type="button" className="boton-borrar" onClick={() => borrarImagen(i)}>❌</button>
              {i !== 0 && (
                <button type="button" className="boton-portada" onClick={() => setPortadaIndex(i)}>Hacer portada</button>
              )}
              {i === 0 && <span className="portada-label">Portada</span>}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="galeria-modal">
          <span className="cerrar" onClick={cerrarModal}>×</span>
          <img src={previewImagenes[modalIndex]} alt="ampliada" className="imagen-grande" />
          <button className="flecha izq" onClick={anteriorImagen}>❮</button>
          <button className="flecha der" onClick={siguienteImagen}>❯</button>

          <div className="modal-controls">
            {modalIndex !== portadaIndex ? (
              <button
                type="button"
                className="boton-portada"
                onClick={() => setPortadaIndex(modalIndex)}
              >
                Hacer portada
              </button>
            ) : (
              <span className="portada-label">Portada</span>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);
}
