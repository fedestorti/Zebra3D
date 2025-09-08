// src/pages/Checkout/CheckoutResult.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

export default function CheckoutResult() {
  const [params] = useSearchParams();
  const status = params.get("status") || "unknown";
  const id_orden = params.get("o");
  const id_vendedor = params.get("v");
  const [msg, setMsg] = useState("Procesando resultado…");

  useEffect(() => {
    if (status === "approved") setMsg("Pago aprobado. Te vamos a liberar la descarga en breve.");
    else if (status === "pending") setMsg("Pago pendiente. Te avisamos cuando se acredite.");
    else if (status === "failure") setMsg("Pago rechazado. Probá de nuevo.");
    else setMsg("Estado desconocido. Revisá tus órdenes.");
  }, [status]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Resultado del pago</h1>
      <p>{msg}</p>
      {id_orden && (
        <p>
          Ver <Link to={`/ordenes/${id_orden}`}>detalle de la orden #{id_orden}</Link>
          {id_vendedor && <> para el vendedor {id_vendedor}</>}
        </p>
      )}
      <p><Link to="/ordenes">Ir a Mis órdenes</Link></p>
    </div>
  );
}
