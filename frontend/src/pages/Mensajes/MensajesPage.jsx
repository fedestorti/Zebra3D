import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import ChatWindow from "../../components/ChatWindow/ChatWindow.jsx";
import "./Mensajes.css";

function time24(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

// Avatar simple con fallback a inicial
function Avatar({ src, alt }) {
  if (src) {
    return (
      <div className="ava">
        <img src={src} alt={alt || ""} loading="lazy" />
      </div>
    );
  }
  const letter = (alt || "?").replace(/^@/, "").trim().slice(0, 1).toUpperCase() || "?";
  return <div className="ava fallback" aria-label={alt || "usuario"}>{letter}</div>;
}

export default function MensajesPage() {
  const ctx = useChat();
  if (!ctx) return <div style={{ padding: 16 }}>Chat no disponible.</div>;

  const {
    threads = [],
    fetchThreads,
    activeThread,
    setActive,
    unreadTotal = 0,
    loading = false,
  } = ctx;

  // búsqueda local
  const [q, setQ] = useState("");

  // Mobile vs Desktop
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 980px)").matches
      : false
  );
  // En móvil: "list" o "chat"
  const [mobileMode, setMobileMode] = useState("list");

  useEffect(() => { fetchThreads?.(); }, [fetchThreads]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 980px)");
    const onChange = e => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile && !activeThread && threads.length && setActive) {
      setActive(threads[0].id_conversacion);
    }
  }, [isMobile, activeThread, threads, setActive]);

  useEffect(() => {
    if (!isMobile) return;
    const vv = window.visualViewport;
    const setVH = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    };
    setVH();
    if (vv) {
      vv.addEventListener("resize", setVH);
      vv.addEventListener("scroll", setVH);
      return () => {
        vv.removeEventListener("resize", setVH);
        vv.removeEventListener("scroll", setVH);
      };
    } else {
      const onResize = () => setVH();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
  }, [isMobile]);

  // Usamos los campos que ya devuelve tu endpoint (incluye avatar_otro)
  const norm = (t) => ({
    id: t.id_conversacion,
    apodo: t.apodo_otro ?? t.apodo ?? `usuario #${t.id_usuario_otro ?? "?"}`,
    avatar: t.avatar_otro || null,
    preview: t.ultimo_cuerpo ?? t.ultimo_mensaje ?? "",
    ts: time24(t.ultimo_ts),
    unread: t.no_leidos ?? 0,
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((raw) => {
      const t = norm(raw);
      return (t.apodo || "").toLowerCase().includes(needle);
    });
  }, [threads, q]);

  const rootClass = useMemo(() => {
    if (isMobile) return `mensajes-wrap wa-chat ${mobileMode === "chat" ? "is-chat" : "is-list"}`;
    return "mensajes-wrap wa-chat";
  }, [isMobile, mobileMode]);

  const handleSelectThread = (id) => {
    setActive?.(id);
    if (isMobile) setMobileMode("chat");
  };

  const handleBackToList = () => {
    if (isMobile) setMobileMode("list");
  };

  const handleClear = () => setQ("");

  return (
    <div className={rootClass}>
      {/* LISTA: izquierda en desktop / principal en móvil */}
      <aside className="mensajes-sidebar">
        <div className="mensajes-header">
          <h2 className="mensajes-title">Mensajes</h2>
          <span className="badge">NL: {unreadTotal}</span>
        </div>

        <div className="wa-search">
          <div className="box">
            🔎
            <input
              placeholder="Buscar por apodo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button className="clear" onClick={handleClear} aria-label="Limpiar búsqueda">✕</button>
            )}
          </div>
        </div>

        {loading && <div className="hint">Cargando hilos…</div>}

        <ul className="threads-list">
          {filtered.map((r) => {
            const t = norm(r);
            const isActive = activeThread === t.id;
            return (
              <li
                key={t.id}
                className={`thread-item ${isActive ? "active" : ""}`}
                onClick={() => handleSelectThread(t.id)}
              >
                {/* AVATAR -> Perfil. Stop propagation para que no cambie de hilo */}
                <Link
                  to={`/perfil/${t.apodo}`}
                  onClick={(e) => e.stopPropagation()}
                  className="ava-link"
                  title={`Ver perfil de @${t.apodo}`}
                >
                  <Avatar src={t.avatar} alt={`@${t.apodo}`} />
                </Link>

                <div>
                  <div className="thread-title">@{t.apodo}</div>
                  <div className="thread-sub">{t.preview || "…"}</div>
                </div>
                <div className="thread-right">
                  <span className="thread-time">{t.ts}</span>
                  {t.unread > 0 && <span className="pill">{t.unread}</span>}
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && !loading && (
            <li className="hint">No hay resultados para “{q}”.</li>
          )}
        </ul>
      </aside>

      {/* CHAT: derecha en desktop / secundaria en móvil */}
      <main className="mensajes-main">
        {isMobile && (
          <div className="chat-mobilebar">
            {mobileMode === "chat" && (
              <button className="back-btn" onClick={handleBackToList} aria-label="Volver">←</button>
            )}
            
          </div>
        )}
        <ChatWindow />
      </main>
    </div>
  );
}
