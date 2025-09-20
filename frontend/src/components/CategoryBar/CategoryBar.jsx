import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CategoryBar.css';

export default function CategoryBar({
  sticky = true,
  fullBleed = true,
  showAll = true,
  fetchUrl = 'http://localhost:4000/api/categorias',
  maxLinesDesktop = 2, // cuántas filas visibles antes de “Ver más”
}) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('');

  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const selectedId = params.get('cat') ? Number(params.get('cat')) : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(fetchUrl);
        const data = await res.json();
        if (!alive) return;
        setCategorias(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error cargando categorías', e);
        if (alive) setCategorias([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fetchUrl]);

  const goToCat = (id) => {
    const q = new URLSearchParams(location.search);
    if (id == null) q.delete('cat');
    else q.set('cat', String(id));
    navigate(`/principal?${q.toString()}`);
    setExpanded(false);
  };

  const filteredCats = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return categorias;
    return categorias.filter(c =>
      c.nombre.toLowerCase().includes(f) || (c.slug || '').toLowerCase().includes(f)
    );
  }, [categorias, filter]);

  // Decide si mostrar “Ver más” (solo desktop). En mobile siempre hay scroll y también botón.
  const [showSeeMore, setShowSeeMore] = useState(false);
  useEffect(() => {
    const checkOverflow = () => {
      if (!wrapRef.current) return;
      // Calculamos cuántas líneas ocupan los chips
      const lineHeight = parseFloat(getComputedStyle(wrapRef.current).getPropertyValue('--chip-line'));
      const h = wrapRef.current.offsetHeight;
      const lines = Math.round(h / lineHeight) || 1;
      setShowSeeMore(lines > maxLinesDesktop);
    };
    const ro = new ResizeObserver(checkOverflow);
    if (wrapRef.current) ro.observe(wrapRef.current);
    checkOverflow();
    return () => ro.disconnect();
  }, [loading, categorias, maxLinesDesktop]);

  return (
    <nav
      className={[
        'glassbar',
        sticky ? 'sticky' : '',
        fullBleed ? 'fullbleed' : '',
      ].join(' ')}
      aria-label="Categorías"
    >
      <div className="glassbar-inner">
        {/* Chips visibles (wrap en desktop, scroll suave en mobile) */}
        <div className="chips-zone">
          <div className="fade left" aria-hidden />
          <div className="fade right" aria-hidden />

          <div
            ref={wrapRef}
            className="chips-wrap"
            role="tablist"
          >
            {loading ? (
              <>
                <span className="chip skeleton" />
                <span className="chip skeleton" />
                <span className="chip skeleton" />
                <span className="chip skeleton" />
                <span className="chip skeleton" />
              </>
            ) : (
              <>
                {showAll && (
                  <button
                    type="button"
                    className={`chip ${selectedId == null ? 'active' : ''}`}
                    onClick={() => goToCat(null)}
                    role="tab"
                    aria-selected={selectedId == null}
                  >
                    Todas
                  </button>
                )}

                {categorias.map((c) => (
                  <button
                    key={c.id_categoria}
                    type="button"
                    className={`chip ${selectedId === c.id_categoria ? 'active' : ''}`}
                    onClick={() => goToCat(c.id_categoria)}
                    role="tab"
                    aria-selected={selectedId === c.id_categoria}
                    title={c.nombre}
                  >
                    {c.nombre}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Botón ver más/menos */}
          {!loading && (
            <button
              type="button"
              className="see-more"
              aria-expanded={expanded}
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>

        {/* Panel expandible (grilla con buscador) */}
        {expanded && (
          <div className="expand-panel" role="region" aria-label="Todas las categorías">
            <div className="expand-head">
              <input
                className="filter-input"
                placeholder="Buscar categorías..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                aria-label="Buscar categorías"
              />
              <button className="close-exp" onClick={() => setExpanded(false)} aria-label="Cerrar">×</button>
            </div>

            <div className="grid">
              {showAll && (
                <button
                  type="button"
                  className={`grid-chip ${selectedId == null ? 'active' : ''}`}
                  onClick={() => goToCat(null)}
                >
                  Todas
                </button>
              )}
              {filteredCats.map(c => (
                <button
                  key={`grid-${c.id_categoria}`}
                  type="button"
                  className={`grid-chip ${selectedId === c.id_categoria ? 'active' : ''}`}
                  onClick={() => goToCat(c.id_categoria)}
                  title={c.nombre}
                >
                  {c.nombre}
                </button>
              ))}
              {!loading && filteredCats.length === 0 && (
                <p className="empty">No hay categorías que coincidan.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
