import './TarjetaDiseno.css';

export default function TarjetaDiseno({ diseno }) {
  return (
    <div className="tarjeta">
      <img src={diseno.imagen} alt={diseno.titulo} className="tarjeta-img" />
      <div className="tarjeta-info">
        <h3>{diseno.titulo}</h3>
        <p>👨‍🎨 {diseno.creador}</p>
        <span className="tarjeta-precio">{diseno.precio}</span>
      </div>
    </div>
  );
}
