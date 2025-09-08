// TarjetaDiseno.jsx
import { Link } from "react-router-dom";
import "./TarjetaDiseno.css";
import useAddToCart from "../../hooks/useAddToCart";

export default function TarjetaDiseno({ diseno }) {
  const add = useAddToCart();

  const portada =
    diseno.imagenes && diseno.imagenes.length > 0
      ? diseno.imagenes[0]
      : "/placeholder.jpg";

  const precioFormateado =
    Number(diseno.precio) === 0 ? "Gratis" : `${diseno.precio}`;

  return (
    <div className="tarjeta">
      <Link to={`/disenos/${diseno.id_diseno}`}>
        <div className="tarjeta-img-container">
          <img src={portada} alt={diseno.titulo} className="tarjeta-img" />
          <div className="tarjeta-overlay">
            <span className="tarjeta-titulo">{diseno.titulo}</span>
            <span className="tarjeta-precio">{precioFormateado}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
