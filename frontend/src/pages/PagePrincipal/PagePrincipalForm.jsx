// src/pages/PagePrincipal/PagePrincipalForm.jsx
import { useEffect, useMemo, useState } from "react";
import TarjetaDiseno from "../../components/TarjetaDiseno/TarjetaDiseno";
import "./PagePrincipal.css";
import { Link, useLocation } from "react-router-dom";

export default function PagePrincipalForm() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const busqueda = queryParams.get("search") || "";

  const [disenos, setDisenos] = useState([]);
  const [todosDisenos, setTodosDisenos] = useState([]);
  const [random25, setRandom25] = useState([]);

  const [filtroPuntuacion, setFiltroPuntuacion] = useState(false);
  const [filtroPromo, setFiltroPromo] = useState(false);
  const [filtroGratis, setFiltroGratis] = useState(false);

  const [paginaActual, setPaginaActual] = useState(1);
  const [paginaActualTodos, setPaginaActualTodos] = useState(1);

  const ITEMS_POR_PAGINA = 50;

  const cargarDisenos = async () => {
    try {
      const url = busqueda.trim()
        ? `http://localhost:4000/api/disenos?search=${encodeURIComponent(busqueda)}`
        : "http://localhost:4000/api/disenos";
      const res = await fetch(url);
      const data = await res.json();
      setDisenos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarDisenos();
    (async () => {
      try {
        const res = await fetch("http://localhost:4000/api/disenos");
        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        setTodosDisenos(lista);
        const copia = [...lista].sort(() => Math.random() - 0.5);
        setRandom25(copia.slice(0, 25));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [busqueda]);

  const disenosFiltrados = useMemo(() => {
    let out = [...disenos];
    if (filtroPromo) out = out.filter(d => d.promo);
    if (filtroGratis) out = out.filter(d => d.precio === "Gratis" || d.precio === 0);
    if (filtroPuntuacion) out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return out;
  }, [disenos, filtroPromo, filtroGratis, filtroPuntuacion]);

  const totalPaginas = Math.max(1, Math.ceil(disenosFiltrados.length / ITEMS_POR_PAGINA));
  const pageStart = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const disenosPagina = disenosFiltrados.slice(pageStart, pageStart + ITEMS_POR_PAGINA);

  const totalPaginasTodos = Math.max(1, Math.ceil(disenos.length / ITEMS_POR_PAGINA));
  const pageStartTodos = (paginaActualTodos - 1) * ITEMS_POR_PAGINA;
  const disenosPaginaTodos = disenos.slice(pageStartTodos, pageStartTodos + ITEMS_POR_PAGINA);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroPromo, filtroGratis, filtroPuntuacion, busqueda]);

  const mostrandoGeneral = !(busqueda || filtroGratis || filtroPuntuacion || filtroPromo);

  return (
    <div className="pagina-principal">
      <div className="page-wrapper">
        {mostrandoGeneral && (
          <div className="servicio-link">
            <div className="card-servicio-wrapper">
              <Link to="/servicio-impresion" className="card-servicio" aria-label="Ir al servicio de impresión 3D">
                <img src="../../../public/Fotos/ServicioImpresioProximamente.png" alt="Servicio de Impresión 3D" />
              </Link>
            </div>
          </div>
        )}

        <section className="galeria-general">
          {/* FILTROS */}
          <div className="filtros" aria-label="Filtros de diseños">
            <label>
              <input
                type="checkbox"
                checked={filtroGratis}
                onChange={(e) => setFiltroGratis(e.target.checked)}
              />
              Solo gratis
            </label>
            <label>
              <input
                type="checkbox"
                checked={filtroPuntuacion}
                onChange={(e) => setFiltroPuntuacion(e.target.checked)}
              />
              Mejor puntuación
            </label>
            <label>
              <input
                type="checkbox"
                checked={filtroPromo}
                onChange={(e) => setFiltroPromo(e.target.checked)}
              />
              Solo promo
            </label>
          </div>

          {/* GALERÍA */}
          {mostrandoGeneral ? (
            <div className="galeria">
              <div className="galeria2-tarjetas">
                {disenosPaginaTodos.map((d) => (
                  <TarjetaDiseno key={d.id_diseno} diseno={d} />
                ))}
              </div>

              {totalPaginasTodos > 1 && (
                <div className="paginas" aria-label="Paginación">
                  <button
                    disabled={paginaActualTodos === 1}
                    onClick={() => setPaginaActualTodos(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <span>{paginaActualTodos} / {totalPaginasTodos}</span>
                  <button
                    disabled={paginaActualTodos === totalPaginasTodos}
                    onClick={() => setPaginaActualTodos(p => Math.min(totalPaginasTodos, p + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {disenosFiltrados.length > 0 ? (
                <div className="galeria">
                  <h1 className="resultados-busqueda">
                    <span>{disenosFiltrados.length}</span> resultados encontrados
                  </h1>

                  <div className="galeria2-tarjetas">
                    {disenosPagina.map((d) => (
                      <TarjetaDiseno key={d.id_diseno} diseno={d} />
                    ))}
                  </div>

                  {totalPaginas > 1 && (
                    <div className="paginas" aria-label="Paginación">
                      <button
                        disabled={paginaActual === 1}
                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      >
                        Anterior
                      </button>
                      <span>{paginaActual} / {totalPaginas}</span>
                      <button
                        disabled={paginaActual === totalPaginas}
                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="vsin-resultados">No se encontraron diseños...</p>
              )}

              <div className="otros-wrapper">
                <p className="otros">Otros diseños</p>
                <div className="otros-grid">
                  {random25.map((d) => (
                    <TarjetaDiseno key={d.id_diseno} diseno={d} />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
