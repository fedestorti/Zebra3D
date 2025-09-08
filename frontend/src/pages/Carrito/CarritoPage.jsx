//pages/Carrito/CarritoPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import API from "../../api";
import "./CarritoPage.css";

/* --- Bricks para tarjeta --- */
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

const nf = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export default function CarritoPage() {
  const { loading, cart, total, removeItem, clear } = useCart();
  const [links, setLinks] = useState([]);

  // Modal de pago
  const [showPay, setShowPay] = useState(false);
  const [method, setMethod] = useState(null); // null | 'mp' | 'card'
  const [checkingOut, setCheckingOut] = useState(false);
  const [processingCard, setProcessingCard] = useState(false);
  const [payError, setPayError] = useState("");

  // MP Public Key para Bricks (definila en .env: VITE_MP_PUBLIC_KEY=...)
  useEffect(() => {
    if (showPay && method === "card") {
      initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: "es-AR" });
    }
  }, [showPay, method]);

  const multipleVendors = useMemo(() => {
    const set = new Set((cart.items || []).map((i) => i.id_creador));
    return set.size > 1;
  }, [cart.items]);

  async function pagarConMP() {
  setCheckingOut(true);
  setPayError("");
  try {
    const { data } = await API.post("/checkout", {});
    const links = data?.links || [];
    setLinks(links);
    if (links.length === 1 && links[0].init_point) window.location.href = links[0].init_point;
    else setShowPay(false);
  } catch (e) {
    const msg = e?.response?.data?.error || e.message;
    const det = e?.response?.data?.detalle;
    console.error("Checkout error:", msg, det);
    setPayError(msg + (det ? ` · ${det}` : ""));
    alert(msg); // opcional
  } finally {
    setCheckingOut(false);
  }
}

  // Handler de Bricks (tarjeta)
  async function onSubmitCard({ selectedPaymentMethod, formData }) {
    // formData.token: token de la tarjeta (MP)
    setProcessingCard(true);
    setPayError("");
    try {
      // Validación simple
      if (multipleVendors) {
        setPayError("Pago con tarjeta deshabilitado para múltiples vendedores. Usá Mercado Pago.");
        return;
      }

      // Enviá al backend para crear el pago:
      const payload = {
        token: formData.token,
        payment_method_id: formData.paymentMethodId,
        issuer_id: formData.issuerId,
        installments: formData.installments || 1,
        amount: Number(total) || 0,
      };
      const { data } = await API.post("/payments/card", payload);

      // Éxito → podés redirigir a success o mostrar toast
      setShowPay(false);
      alert("✅ Pago procesado correctamente");
      // Opcional: clear() del carrito si tu backend ya lo vacía.
    } catch (e) {
      console.error(e);
      setPayError(e?.response?.data?.error || "No se pudo procesar el pago con tarjeta");
    } finally {
      setProcessingCard(false);
    }
  }

  if (loading) return <div className="carrito-cargando">Cargando carrito…</div>;

  return (
    <div className="carrito-page">
      <h1>🛒 Tu carrito</h1>

      {cart.items.length === 0 && (
        <p className="carrito-vacio">Vacío, como el presupuesto cultural. Agregá algo.</p>
      )}

      {cart.items.map((it) => (
        <div key={it.id_item} className="cart-row">
          <div className="left">
            <Link to={`/disenos/${it.id_diseno}`} className="thumb2-link">
              <img
                className="thumb2"
                src={it.portada_url || "/img/placeholder.png"}
                alt={it.titulo}
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/80x80?text=%20";
                }}
              />
            </Link>

            <div className="info">
              <Link to={`/disenos/${it.id_diseno}`} className="titulo-link">
                <strong className="titulo">{it.titulo}</strong>
              </Link>
              <div className="muted">
                Diseñador:{" "}
                <Link to={`/perfil/${it.apodo_creador}`} className="autor-link">
                  {it.apodo_creador}
                </Link>
              </div>
            </div>
          </div>

          <div className="right">
            <div className="price">
              {Number(it.precio) === 0 ? (
                <span className="gratis-badge">Gratis</span>
              ) : (
                nf.format(Number(it.precio || 0))
              )}
            </div>
            <button
              className="rm"
              aria-label="Quitar del carrito"
              onClick={() => removeItem(it.id_diseno)}
            >
              ❌
            </button>
          </div>
        </div>
      ))}

      {cart.items.length > 0 && (
        <div className="checkout-box">
          <div className="checkout-summary">
            <span>Total estimado</span>
            <strong>{nf.format(total)}</strong>
          </div>

          <div className="checkout-buttons">
            <button onClick={clear} className="ghost">🧹 Vaciar carrito</button>
            {/* Abre el modal de medios de pago */}
            <button onClick={() => { setMethod(null); setShowPay(true); }}>
              💳 Elegir medio de pago
            </button>
          </div>
        </div>
      )}

      {/* Links por vendedor (cuando vuelve /checkout con varios) */}
      {links.length > 0 && (
        <div className="pagos-por-vendedor">
          <h2>Pagos por vendedor</h2>
          {links.map((l) => (
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

      {/* Modal de pago */}
      {showPay && (
        <div className="pay-modal-overlay" onClick={() => setShowPay(false)}>
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pay-modal-close" onClick={() => setShowPay(false)}>×</button>

            {!method && (
              <>
                <h3>Elegí cómo querés pagar</h3>
                {multipleVendors && (
                  <div className="pay-alert">
                    Carrito con múltiples vendedores: el pago con tarjeta directa se deshabilita.
                  </div>
                )}
                <div className="pay-options">
                  <button
                    className="pay-option mp"
                    onClick={() => { setMethod("mp"); pagarConMP(); }}
                    disabled={checkingOut}
                  >
                    {checkingOut ? "Preparando pago..." : "Mercado Pago"}
                  </button>

                  <button
                    className="pay-option card"
                    onClick={() => setMethod("card")}
                    disabled={multipleVendors || total <= 0}
                    title={multipleVendors ? "Para múltiples vendedores, usá Mercado Pago" : ""}
                  >
                    Tarjeta de crédito/debito
                  </button>
                </div>

                {payError && <div className="pay-error">{payError}</div>}
              </>
            )}

            {method === "card" && (
              <div className="card-form">
                <h3>Pago con tarjeta</h3>
                <p className="muted">Monto: <b>{nf.format(total)}</b></p>

                <CardPayment
                  initialization={{
                    amount: Number(total) || 0,
                  }}
                  customization={{
                    paymentMethods: { creditCard: "all", debitCard: "all" },
                    visual: { style: { theme: "dark" } },
                  }}
                  onSubmit={onSubmitCard}
                />

                <div className="card-actions">
                  <button className="ghost" onClick={() => setMethod(null)} disabled={processingCard}>
                    ← Volver
                  </button>
                  <button className="primary" disabled>
                    {/* el submit lo maneja el Brick */}
                    Procesar con tarjeta
                  </button>
                </div>

                {payError && <div className="pay-error">{payError}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
