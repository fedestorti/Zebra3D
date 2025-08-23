import { useEffect, useState } from "react";
import TarjetaDiseno from "../../components/TarjetaDiseno/TarjetaDiseno";
import "./PagePrincipal.css";
import { Link } from "react-router-dom";

export default function PagePrincipalForm() {
  const [disenos, setDisenos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [todosDisenos, setTodosDisenos] = useState([]);
  const [random25, setRandom25] = useState([]);
  const [filtroPuntuacion, setFiltroPuntuacion] = useState(false);
  const [filtroPromo, setFiltroPromo] = useState(false);
  const [filtroGratis, setFiltroGratis] = useState(false);
  const [paginaActualTodos, setPaginaActualTodos] = useState(1);
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 2;
  const columnas = 5; // ajustar según tu CSS
  const itemsPorPagina = filasPorPagina * columnas;

  const cargarDisenos = async (filtro = "") => {
    try {
      const url = filtro
        ? `http://localhost:4000/api/disenos?search=${encodeURIComponent(filtro)}`
        : "http://localhost:4000/api/disenos";
      const res = await fetch(url);
      const data = await res.json();
      setDisenos(data);
      if (data.length === 0 && random25.length === 0) {
        const copia = [...todosDisenos].sort(() => Math.random() - 0.5);
        setRandom25(copia.slice(0, 25));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPaginasTodos = Math.ceil(disenos.length / itemsPorPagina);
  const disenosPaginaTodos = disenos.slice(
  (paginaActualTodos - 1) * itemsPorPagina,
  paginaActualTodos * itemsPorPagina
  );

  useEffect(() => {
    cargarDisenos();
    const cargarTodos = async () => {
      const res = await fetch("http://localhost:4000/api/disenos");
      const data = await res.json();
      setTodosDisenos(data);
      const copia = [...data].sort(() => Math.random() - 0.5);
      setRandom25(copia.slice(0, 25));
    };
    cargarTodos();
  }, []);

  // Filtrado
  let disenosFiltrados = [...disenos];
  if (busqueda.trim() !== "") {
    disenosFiltrados = disenosFiltrados.filter((d) =>
      d.titulo.toLowerCase().includes(busqueda.toLowerCase())
    );
  }
  if (filtroPuntuacion) disenosFiltrados.sort((a, b) => b.rating - a.rating);
  if (filtroPromo) disenosFiltrados = disenosFiltrados.filter((d) => d.promo);
  if (filtroGratis) disenosFiltrados = disenosFiltrados.filter((d) => d.precio === "Gratis");

  // Paginación lógica
  const totalPaginas = Math.ceil(disenosFiltrados.length / itemsPorPagina);
  const disenosPagina = disenosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  return (
    <div className="pagina-principal">
      <section className="buscador">
        <div className="buscador-form">
          <div className="input-container">
            <input
              type="text"
              placeholder="Buscar diseño..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                cargarDisenos(e.target.value);
                setPaginaActual(1); // reset página al cambiar búsqueda
              }}
            />
            <span className="lupa">🔎</span>
          </div>
        </div>
      </section>

      <div className="page-wrapper">
        {!busqueda && !filtroGratis && !filtroPuntuacion && !filtroPromo && (
          <div className="servicio-link">
            <div className="card-servicio-wrapper">
              <Link to="/servicio-impresion" className="card-servicio">
                <img src="../../../public/Fotos/ServicioImpresio.png" alt="Servicio de Impresión 3D" />
              </Link>
            </div>
          </div>
        )}

        <div className="filtros">
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

        <section className="galeria-general">
          {/* No hay filtros ni búsqueda: mostrar todos los diseños */}
          {!(busqueda || filtroGratis || filtroPuntuacion || filtroPromo) && (
          <div className="galeria">
            <div className="galeria2-tarjetas">
              {disenosPaginaTodos.map((d) => (
                <TarjetaDiseno key={d.id_diseno} diseno={d} />
              ))}
  </div>
              {totalPaginasTodos > 1 && (
                <div className="paginas">
                    <button
                      disabled={paginaActualTodos === 1}
                      onClick={() => setPaginaActualTodos((p) => p - 1)}>
                      Anterior
                    </button>
                  <span>{paginaActualTodos} / {totalPaginasTodos}</span>
                    <button
                      disabled={paginaActualTodos === totalPaginasTodos}
                      onClick={() => setPaginaActualTodos((p) => p + 1)}>
                      Siguiente
                    </button>
                </div>
              )}
            
          </div>  
        )}

          {/* Hay filtros o búsqueda */}
          {(busqueda || filtroGratis || filtroPuntuacion || filtroPromo) && (
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
                    <div className="paginas">
                        <button
                          disabled={paginaActual === 1}
                          onClick={() => setPaginaActual((p) => p - 1)}>
                          Anterior
                        </button>
                      <span>{paginaActual} / {totalPaginas}</span>
                        <button
                          disabled={paginaActual === totalPaginas}
                          onClick={() => setPaginaActual((p) => p + 1)}>
                          Siguiente
                        </button>
                    </div>
                  )}
                  
                </div>
              ) : (
                <p className="sin-resultados">No se encontraron diseños...</p>
              )}

              {/* Galería fija de 25 diseños aleatorios */}
              <div className="grid-5x5">
                <p className="otros">Otros diseños</p>
                {random25.map((d) => (
                  <TarjetaDiseno key={d.id_diseno} diseno={d} />
                ))}
              </div>
            </>
          )}

        </section>
      </div>
    </div>
  );
}
