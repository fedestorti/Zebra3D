// src/pages/Perfil/Perfil.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import { Rating } from 'react-simple-star-rating';
import './Perfil.css';
import BotonZebra from '../../components/BotonZebra/BotonZebra.jsx';

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
}

export default function Perfil() {
  const { apodo } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [profile, setProfile] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [followersCount, setFollowers] = useState(0);
  const [averageRating, setAverage] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Edición bio
  const [editMode, setEditMode] = useState(false);
  const [bioTemp, setBioTemp] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // Avatar
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          { data: perfil },
          { data: userDesigns },
          { data: fc },
          { data: avg }
        ] = await Promise.all([
          API.get(`/usuarios/${apodo}/perfil`),
          API.get(`/usuarios/${apodo}/disenos`),
          API.get(`/usuarios/${apodo}/seguidores/count`),
          API.get(`/usuarios/${apodo}/resenas/average`)
        ]);

        setProfile(perfil);
        setBioTemp(perfil.biografia || '');
        setDesigns(
          userDesigns.map(d => ({
            ...d,
            imagenes: d.imagenes?.filter(Boolean) || []
          }))
        );
        setFollowers(fc.count);
        setAverage(avg.average);
      } catch (err) {
        console.error('Error cargando perfil:', err);
        alert('No se pudo cargar el perfil');
      }

      if (usuario) {
        try {
          const { data } = await API.get(`/usuarios/${apodo}/seguidores/status`);
          setIsFollowing(data.isFollowing);
        } catch {
          setIsFollowing(false);
        }
      }
    }

    fetchData();
  }, [apodo, usuario]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isOwner =
    !!usuario &&
    profile &&
    (usuario.id_usuario === profile.id_usuario || usuario.apodo === apodo);

  const handleFollow = async () => {
    if (!usuario) {
      alert('Debes iniciar sesión para seguir a este usuario');
      return navigate('/login');
    }
    try {
      if (isFollowing) {
        await API.delete(`/usuarios/${apodo}/seguidores`);
        setIsFollowing(false);
        setFollowers(c => c - 1);
      } else {
        await API.post(`/usuarios/${apodo}/seguidores`);
        setIsFollowing(true);
        setFollowers(c => c + 1);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('No se pudo cambiar el estado de seguimiento');
    }
  };

  const handleRate = async value => {
    if (value < 1) value = 1;
    if (!usuario) {
      alert('Debes iniciar sesión para calificar');
      return navigate('/login');
    }
    try {
      const ratingValue = Math.round(value * 10) / 10;
      await API.post(`/usuarios/${apodo}/resenas`, { calificacion: ratingValue });
      setMyRating(ratingValue);
      const { data: avg } = await API.get(`/usuarios/${apodo}/resenas/average`);
      setAverage(avg.average);
    } catch (err) {
      if (err.response?.status === 400) {
        alert(err.response.data.mensaje);
        setMyRating(prev => prev || value);
      } else {
        console.error(err);
        alert('Error al enviar tu votación');
      }
    }
  };

  // Avatar
  const handlePickAvatar = () => fileInputRef.current?.click();

  const handleAvatarFileSelect = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setSelectedFile(file);
    setShowPreview(true);
  };

  const confirmUploadAvatar = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append('avatar', selectedFile);

      const csrf = getCookie('csrf_token');
      const { data } = await API.post('/usuarios/me/avatar', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {})
        }
      });

      const bust = `?v=${Date.now()}`;
      setProfile(p => ({ ...p, avatar_url: (data.url || p.avatar_url) + bust }));

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      setShowPreview(false);
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar el avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelUploadAvatar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Guardar bio (máximo 600 caracteres)
  const handleSaveBio = async () => {
    if ((bioTemp || '').length > 600) {
      alert('La biografía no puede superar los 600 caracteres.');
      return;
    }
    try {
      setSavingBio(true);
      const csrf = getCookie('csrf_token');
      const { data } = await API.patch(
        '/usuarios/me',
        { biografia: bioTemp },
        { headers: { ...(csrf ? { 'X-CSRF-Token': csrf } : {}) } }
      );
      setProfile(p => ({ ...p, biografia: data.biografia }));
      setEditMode(false);
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar la biografía');
    } finally {
      setSavingBio(false);
    }
  };

  if (!profile) return <div>Cargando...</div>;

  return (
    <div className="main-container">
      <div className="profile-header">
        <div className="profile-header2">
          <img src={profile.avatar_url} alt="" className="profile-avatar" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFileSelect}
            style={{ display: 'none' }}
          />

          <div className="profile-info">
            <div className="profile-top">
              <span className="profile-username">@{profile.apodo}</span>

              {!isOwner && usuario && (
                <button
                  className={`profile-button ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
              )}

              {!isOwner && (
                <Rating
                  size={25}
                  initialValue={myRating || averageRating}
                  readonly={myRating > 0}
                  onClick={handleRate}
                  transition
                  allowFraction
                />
              )}

              {isOwner && (
                <div className="owner-actions">
                  <button className="profile-button secondary" onClick={handlePickAvatar}>
                    Editar foto
                  </button>
                  <button
                    className="profile-button"
                    onClick={() => setEditMode(e => !e)}
                  >
                    {editMode ? 'Cancelar' : 'Editar bio'}
                  </button>
                </div>
              )}
            </div>

            <div className="profile-stats">
              <span><b>{designs.length}</b><small>Publicaciones</small></span>
              <span><b>{followersCount}</b><small>Seguidores</small></span>
              <span><b>{averageRating.toFixed(1)}</b><small>Promedio</small></span>
            </div>

            {!editMode && <p className="profile-bio">{profile.biografia}</p>}

            {isOwner && editMode && (
              <div className="bio-editor">
                <textarea
                  value={bioTemp}
                  onChange={e => setBioTemp(e.target.value)}
                  rows={4}
                  placeholder="Contá algo sobre vos..."
                  maxLength={600}
                />
                <div className="bio-meta">
                  <small className="bio-count">{bioTemp.length}/600</small>
                </div>

                <div className="bio-actions">
                  <BotonZebra
                    onClick={handleSaveBio}
                    texto={savingBio ? 'Guardando...' : 'Guardar'}
                    enviando={savingBio}
                    disabled={savingBio}
                    aria-label="Guardar biografía"
                  />
                  <button
                    className="profile-button secondary"
                    onClick={() => {
                      setBioTemp(profile.biografia || '');
                      setEditMode(false);
                    }}
                    disabled={savingBio}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="section-title">Diseños de {profile.apodo}</h2>
      <div className="gallery">
        {designs.map(d => (
          <div
            key={d.id_diseno}
            className="design-card"
            onClick={() => navigate(`/disenos/${d.id_diseno}`)}
            style={{ cursor: 'pointer' }}
          >
            {d.imagenes[0] ? (
              <img src={d.imagenes[0]} alt={d.titulo} />
            ) : (
              <div className="no-image">Sin imagen</div>
            )}
            <div className="design-footer">
              <span className="design-title">{d.titulo}</span>
              <span className="design-price">
                ${parseFloat(d.precio).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showPreview && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Previsualizar nueva foto</h3>

            <div className="modal-img-wrap">
              <img src={previewUrl} alt="preview avatar" />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={cancelUploadAvatar}
                disabled={uploading}
              >
                Cancelar
              </button>

              <BotonZebra
                onClick={confirmUploadAvatar}
                disabled={uploading}
                enviando={uploading}
                texto={uploading ? 'Subiendo...' : 'Aceptar'}
                aria-label="Confirmar nueva foto de perfil"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
