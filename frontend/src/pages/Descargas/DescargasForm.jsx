import { useEffect, useState } from "react";
import { fetchDescargas, pedirLinkDescarga } from "../../api.js";
import './Descargas.css';

export default function Descargas() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const data = await fetchDescargas();
        setItems(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function handleDescargar(id_item) {
    try {
      const { url } = await pedirLinkDescarga(id_item);
      // Dispara descarga inmediata
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(e.message);
    }
  }

  if (cargando) return <div className="descargas-wrap">Cargando tus compras…</div>;
  if (error) return <div className="descargas-wrap error">{error}</div>;

  return (
    <div className="descargas-wrap">
      <h1>Mis descargas</h1>
      {items.length === 0 ? (
        <p>No tenés compras todavía. Comprá algo y volvés, campeón.</p>
      ) : (
        <ul className="grid">
          {items.map(it => (
            <li className="card" key={it.id_item}>
              <img
                src={it.portada_url || "/placeholder.png"}
                alt={it.titulo}
                loading="lazy"
              />
              <div className="meta">
                <h3 title={it.titulo}>{it.titulo}</h3>
                <p className="muted">
                  Comprado el {new Date(it.fecha_compra).toLocaleDateString()}
                </p>
                <button onClick={() => handleDescargar(it.id_item)}>
                  Descargar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
