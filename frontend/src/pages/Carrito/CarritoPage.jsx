// src/pages/Carrito/CarritoPage.jsx
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import API from "../../api";

const nf = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

export default function CarritoPage() {
  const { loading, cart, total, removeItem, clear } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [links, setLinks] = useState([]);

  async function irAPagar() {
    setCheckingOut(true);
    try {
      const { data } = await API.post("/checkout", {}); // fix axios
      setLinks(data.links || []);
      // Si querés redirigir cuando hay un solo vendedor:
      // if ((data.links || []).length === 1) window.location.href = data.links[0].init_point;
    } catch (e) {
      console.error(e);
      alert("No se pudo iniciar el checkout");
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) return <div>Cargando carrito…</div>;

  return (
    <div className="carrito-page">
      <h1>Tu carrito</h1>

      {cart.items.length === 0 && <p>Vacío, como el presupuesto cultural. Agregá algo.</p>}

      {cart.items.map(it => (
        <div key={it.id_diseno} className="cart-row">
          <div className="left">
            <img
              className="thumb"
              src={it.portada_url || "/img/placeholder.png"}
              alt={it.titulo}
            />
            <div className="info">
              <strong className="titulo">{it.titulo}</strong>
              <div className="muted">Diseñador: {it.creador || it.id_creador}</div>
            </div>
          </div>

          {/* qty fijo en 1 por diseño */}
          <div className="mid">x1</div>

          <div className="price">{nf.format(Number(it.precio || 0))}</div>
          <button className="rm" onClick={() => removeItem(it.id_diseno)}>Quitar</button>
        </div>
      ))}

      {cart.items.length > 0 && (
        <>
          <div className="cart-total">
            <span>Total estimado</span>
            <strong>{nf.format(total)}</strong>
          </div>

          <div className="cart-actions">
            <button onClick={clear} className="ghost">Vaciar</button>
            <button onClick={irAPagar} disabled={checkingOut}>
              {checkingOut ? "Preparando pago..." : "Ir a pagar"}
            </button>
          </div>
        </>
      )}

      {links.length > 0 && (
        <div className="pagos-por-vendedor">
          <h2>Pagos por vendedor</h2>
          {links.map(l => (
            <div key={l.preference_id} className="pago-card">
              <div>Vendedor: <b>{l.id_vendedor}</b></div>
              <div>
                Bruto: {nf.format(l.monto_bruto)} | Comisión: {nf.format(l.fee)} | Neto: {nf.format(l.neto)}
              </div>
              <a href={l.init_point} target="_blank" rel="noreferrer">Pagar con Mercado Pago</a>
            </div>
          ))}
          <p className="hint">Se genera un pago por cada vendedor del carrito.</p>
        </div>
      )}
    </div>
  );
}
