import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import TarjetaDiseno from '../../components/TarjetaDiseno/TarjetaDiseno';
import './TusdisenosForm.css';

export default function TusdisenosForm() {
  const { usuario, loading } = useAuth();
  const [disenos, setDisenos] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [modalDiseno, setModalDiseno] = useState(null);

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio: 0,
    categoria: '',
    etiqueta: '',
    parametros_fabricacion: ''
  });
  const [archivoNuevo, setArchivoNuevo] = useState(null);
  const [imagenesNuevas, setImagenesNuevas] = useState([]);
  const [imagenesEliminar, setImagenesEliminar] = useState([]);
  const [portadaSeleccionada, setPortadaSeleccionada] = useState(null);

 useEffect(() => {
  

  if (!usuario) {
    setFetching(false);
    return;
  }

  setFetching(true);
  API.get(`/disenos/usuario/${usuario.id_usuario}`)
    .then(res => {
      const data = res.data;
      if (Array.isArray(data)) {
        setDisenos(data);
      } else {
        console.warn("⚠️ Respuesta inesperada:", data);
        setDisenos([]);
      }
    })
    .catch(err => {
      console.error("❌ Error al obtener diseños del usuario:", err);
      setDisenos([]);
    })
    .finally(() => setFetching(false));
}, [usuario]);

  useEffect(() => {
    document.body.style.overflow = modalDiseno ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalDiseno]);

  const openModal = async (id_diseno) => {
    try {
      const res = await API.get(`/disenos/${id_diseno}`);
      const data = res.data;
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

  const handleArchivoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['stl', 'obj', 'zip'].includes(ext)) {
      alert('Solo se permiten archivos 3D (.stl, .obj, .zip)');
      return;
    }
    setArchivoNuevo(file);
  };

  const handleImagenesChange = e => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => ['jpg', 'jpeg', 'png', 'gif'].includes(f.name.split('.').pop().toLowerCase()));

    if (imagenesNuevas.length + validFiles.length > 5) {
      alert('Solo puedes subir hasta 5 imágenes nuevas');
      return;
    }

    if (validFiles.length !== files.length) alert('Algunas imágenes no son válidas y fueron ignoradas');

    const previews = validFiles.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setImagenesNuevas(prev => [...prev, ...previews]);
  };

  const handleEliminarImagenNueva = idx => {
    URL.revokeObjectURL(imagenesNuevas[idx].url);
    setImagenesNuevas(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleEliminarImagen = id_imagen => {
    setImagenesEliminar(prev =>
      prev.includes(id_imagen) ? prev.filter(id => id !== id_imagen) : [...prev, id_imagen]
    );
  };

  const handleSeleccionarPortada = id_imagen => setPortadaSeleccionada(id_imagen);

  const handleGuardar = async () => {
    if (!modalDiseno) return;
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (archivoNuevo) formData.append('archivo_3d', archivoNuevo);
      imagenesNuevas.forEach(img => formData.append('imagenes', img.file));
      formData.append('imagenesEliminar', JSON.stringify(imagenesEliminar));
      formData.append('portadaSeleccionada', portadaSeleccionada);

      const res = await API.put(`/disenos/${modalDiseno.id_diseno}`, formData);
      const data = res.data;

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

  const handleEliminar = async id_diseno => {
    if (!window.confirm('¿Seguro que querés eliminar este diseño?')) return;
    try {
      await API.delete(`/disenos/${id_diseno}`);
      setDisenos(prev => prev.filter(d => d.id_diseno !== id_diseno));
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
    <h2 className="titulo-seccion">Tus diseños publicados</h2>
    <div className="tus-disenos-galeria">
      {disenos.map(diseno => (
        <TarjetaDiseno
          key={diseno.id_diseno}
          diseno={diseno}
          onClick={() => openModal(diseno.id_diseno)}
        />
      ))}
    </div>

    {/* Acá podrías agregar el modal si querés (yo lo omito por ahora) */}
  </div>
);

}
