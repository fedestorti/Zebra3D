// frontend/src/pages/Disenos/DisenosForm.jsx
import { useEffect, useState } from 'react';
import './Disenos.css';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DisenosForm() {
  const { usuario, loading } = useAuth();
  const [idUsuario, setIdUsuario] = useState(null);
  const navigate = useNavigate();

  const [verificando, setVerificando] = useState(true);
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    categoria: '',
    etiqueta: '',
    parametros_fabricacion: '',
    imagenes: [],
    archivo_3d: null
  });

  const [previewImagenes, setPreviewImagenes] = useState([]);
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);
  const [imagenActual, setImagenActual] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [disenos, setDisenos] = useState([]);
  const token = localStorage.getItem('token');

  // Obtener id_usuario
  useEffect(() => {
    if (!loading) {
      if (usuario && usuario.id_usuario) {
        console.log('🧠 ID del usuario logueado:', usuario.id_usuario);
        setIdUsuario(usuario.id_usuario);
      } else {
        console.warn('⚠️ No se encontró id_usuario en el perfil:', usuario);
      }
    }
  }, [loading, usuario]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (usuario === null) return; // Esperando AuthContext
    if (!usuario) {
      navigate('/login');
      return;
    }
    setVerificando(false);
  }, [usuario]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      if (name === 'imagenes') {
        const nuevasImagenes = Array.from(files);
        if (form.imagenes.length + nuevasImagenes.length > 5) {
          alert('Solo podés subir hasta 5 imágenes.');
          return;
        }
        const nuevasPreviews = nuevasImagenes.map(file => URL.createObjectURL(file));
        setForm((prev) => ({
          ...prev,
          imagenes: [...prev.imagenes, ...nuevasImagenes],
        }));
        setPreviewImagenes((prev) => [...prev, ...nuevasPreviews]);
      } else {
        setForm({ ...form, [name]: files[0] });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const borrarImagen = (index) => {
    const nuevasImagenes = [...form.imagenes];
    nuevasImagenes.splice(index, 1);
    const nuevasPreviews = [...previewImagenes];
    nuevasPreviews.splice(index, 1);
    setForm({ ...form, imagenes: nuevasImagenes });
    setPreviewImagenes(nuevasPreviews);
    if (imagenActual >= nuevasPreviews.length) {
      setImagenActual(nuevasPreviews.length - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('⏳ Subiendo...');
    console.log('📤 Enviando formulario...');
    console.log('📝 Datos del formulario:', form);
  
    const formData = new FormData();
    formData.append('titulo', form.titulo);
    formData.append('descripcion', form.descripcion);
    formData.append('precio', form.precio);
    formData.append('categoria', form.categoria);
    formData.append('etiqueta', form.etiqueta);
    formData.append('parametros_fabricacion', form.parametros_fabricacion);
  
    // ✅ Verificamos si es un archivo válido
    if (form.archivo_3d instanceof File) {
      formData.append('archivo_3d', form.archivo_3d);
    } else {
      console.error('❌ archivo_3d no es un File válido:', form.archivo_3d);
      setMensaje('❌ Archivo 3D no válido');
      return;
    }
  
    form.imagenes.forEach((img) => {
      if (img instanceof File) {
        formData.append('imagenes', img);
      }
    });
  
    try {
      const res = await fetch('http://localhost:4000/api/disenos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
    
      const contentType = res.headers.get('content-type');
      const data = contentType?.includes('application/json') ? await res.json() : null;
    
      if (!res.ok) throw new Error(data?.error || 'Error inesperado del servidor');
    
      setMensaje('✅ Diseño subido correctamente');
      // reset...
    } catch (err) {
      console.error('❌ Error en el envío:', err);
      setMensaje('❌ ' + err.message);
    }
  };

  const obtenerDisenos = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/disenos');
      const data = await res.json();
      setDisenos(data);
    } catch (err) {
      console.error('❌ Error al cargar diseños:', err);
    }
  };

  useEffect(() => {
    obtenerDisenos();
    const handleEsc = (e) => {
      if (e.key === 'Escape') setGaleriaAbierta(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (verificando) return <p>Cargando sesión...</p>;

  return (
    <div className="pagina-disenos">
      <h2 className="titulo-seccion">Subí tu diseño 3D 🧩</h2>
      <div className="contenedor-diseno">
        <form onSubmit={handleSubmit} className="formulario-diseno">
          <input type="text" name="titulo" placeholder="Título" value={form.titulo} onChange={handleChange} required />
          <textarea name="descripcion" placeholder="Descripción" value={form.descripcion} onChange={handleChange} required />
          <input type="text" name="categoria" placeholder="Categoría" value={form.categoria} onChange={handleChange} />
          <input type="text" name="etiqueta" placeholder="Etiqueta" value={form.etiqueta} onChange={handleChange} />
          <textarea name="parametros_fabricacion" placeholder="Parámetros de fabricación" value={form.parametros_fabricacion} onChange={handleChange} />
          <input type="number" name="precio" placeholder="Precio" value={form.precio} onChange={handleChange} step="0.01" />
          
          <input
        type="file"
        name="imagenes"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.gif"
        onChange={handleChange}
      />

          <input
        type="file"
        name="archivo_3d"
        accept=".stl,.obj,.rar"
        onChange={handleChange}
      />

          <button type="submit">Subir diseño</button>
          {mensaje && <p className="mensaje">{mensaje}</p>}
        </form>

        <div className="preview-column">
          {previewImagenes.map((src, i) => (
            <div key={i} className={`preview-wrapper ${i === 0 ? 'portada' : ''}`} onClick={() => {
              setImagenActual(i);
              setGaleriaAbierta(true);
            }}>
              <img src={src} alt={`preview-${i}`} className="preview-imagen" />
              <button className="boton-borrar" onClick={(e) => { e.stopPropagation(); borrarImagen(i); }}>
                ❌
              </button>
              {i === 0 && <span className="portada-label">Portada</span>}
            </div>
          ))}
        </div>
      </div>

      {galeriaAbierta && (
        <div className="galeria-modal" onClick={() => setGaleriaAbierta(false)}>
          <span className="cerrar" onClick={() => setGaleriaAbierta(false)}>&times;</span>
          <span className="flecha izq" onClick={(e) => { e.stopPropagation(); setImagenActual((imagenActual - 1 + previewImagenes.length) % previewImagenes.length); }}>&#10094;</span>
          <img src={previewImagenes[imagenActual]} className="imagen-grande" alt="preview" onClick={(e) => e.stopPropagation()} />
          <span className="flecha der" onClick={(e) => { e.stopPropagation(); setImagenActual((imagenActual + 1) % previewImagenes.length); }}>&#10095;</span>
        </div>
      )}
    </div>
  );
}
