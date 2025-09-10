// src/pages/Perfil/Perfil.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import { Rating } from 'react-simple-star-rating';
import './Perfil.css';

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
        setDesigns(userDesigns.map(d => ({
          ...d,
          imagenes: d.imagenes?.filter(Boolean) || []
        })));
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

  if (!profile) return <div>Cargando...</div>;

  return (
    <div className="main-container">
      <div className="profile-header">
        <div className="profile-header2">
          <img src={profile.avatar_url} alt="" className="profile-avatar" />
          <div className="profile-info">
            <div className="profile-top">
              <span className="profile-username">@{profile.apodo}</span>
              {usuario && usuario.id_usuario !== profile.id_usuario && (
                <button
                  className={`profile-button ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
              {usuario?.id_usuario !== profile.id_usuario && (
                <Rating
                  size={25}
                  initialValue={myRating || averageRating}
                  readonly={myRating > 0}
                  onClick={handleRate}
                  transition
                  allowFraction
                />
              )}
            </div>

            <div className="profile-stats">
              <span><b>{designs.length}</b><small>Publicaciones</small></span>
              <span><b>{followersCount}</b><small>Seguidores</small></span>
              <span><b>{averageRating.toFixed(1)}</b><small>Promedio</small></span>
            </div>

            <p className="profile-bio">{profile.biografia}</p>
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
    </div>
  );
}
