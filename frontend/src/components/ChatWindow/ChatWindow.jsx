import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useChat } from "../../context/ChatContext";
import "./ChatWindow.css";

const PAGE_SIZE = 30; // cuántos mensajes antiguos pedir por click

export default function ChatWindow() {
  const {
    activeThread,
    threads,
    messagesByThread,
    fetchMessages,
    emitTyping,
    typingByThread,
    sendDirect,
  } = useChat();

  const [text, setText] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreByThread, setHasMoreByThread] = useState({}); // { [id]: boolean }

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const msgs = messagesByThread[activeThread] || [];
  const typing = typingByThread?.[activeThread]?.typing;

  // formateador 24hs
  const fmt24 = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    []
  );

  // Cuando cambia de hilo activo, reseteamos el flag de "hay más"
  useEffect(() => {
    if (!activeThread) return;
    setHasMoreByThread((prev) => ({
      ...prev,
      [activeThread]: true, // asumimos que al entrar podría haber más
    }));
    // al entrar a un thread, bajamos al final
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, [activeThread]);

  // Autoscroll al final cuando llegan mensajes nuevos a este hilo
  // (solo si el usuario está cerca del final)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const isNearBottom = () => {
      const threshold = 60; // px
      return el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
    };

    // si estoy abajo, autoscroll
    if (isNearBottom()) {
      el.scrollTop = el.scrollHeight;
    }
  }, [msgs.length, typing]);

  // Autogrow del textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height =
      Math.min(inputRef.current.scrollHeight, 120) + "px";
  }, [text]);

  // ID del otro usuario para sendDirect
  const targetUserId = useMemo(() => {
    const t = threads.find((x) => x.id_conversacion === activeThread);
    return t?.id_usuario_otro || null;
  }, [threads, activeThread]);

  const onChange = (e) => {
    setText(e.target.value);
    if (activeThread) emitTyping(activeThread, true);
  };

  const doSend = async () => {
    const body = text.trim();
    if (!body || !targetUserId) return;
    await sendDirect(targetUserId, body);
    setText("");
    if (activeThread) emitTyping(activeThread, false);
    // tras enviar, bajamos al final
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  };

  const onKeyDown = async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await doSend();
    }
  };

  // --- CARGAR MENSAJES ANTERIORES (prepend) ---
  const loadOlder = useCallback(async () => {
    if (!activeThread || loadingOlder) return;
    const curr = messagesByThread[activeThread] || [];
    if (!curr.length) return;
    const oldestId = curr[0]?.id_mensaje;
    if (!oldestId) return;

    setLoadingOlder(true);

    // Guardamos métricas de scroll antes de cargar
    const el = listRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    const prevTop = el ? el.scrollTop : 0;

    try {
      const arr = await fetchMessages({
        conversacionId: activeThread,
        cursor: oldestId, // pedimos los más viejos que este
        limit: PAGE_SIZE,
        mode: "older",    // si tu backend lo usa, genial; si no, se ignora
      });

      // si vinieron menos que PAGE_SIZE, no hay más
      setHasMoreByThread((prev) => ({
        ...prev,
        [activeThread]: (arr || []).length === PAGE_SIZE,
      }));

      // Mantenemos la posición de lectura (no “salta”)
      requestAnimationFrame(() => {
        const newHeight = el ? el.scrollHeight : 0;
        if (el) el.scrollTop = newHeight - prevHeight + prevTop;
      });
    } catch (e) {
      console.error("loadOlder:", e);
    } finally {
      setLoadingOlder(false);
    }
  }, [activeThread, messagesByThread, loadingOlder, fetchMessages]);

  // Estado de “hay más”
  const hasMore = hasMoreByThread[activeThread] ?? true;

  if (!activeThread) {
    return (
      <div className="chatwin empty">
        Elegí una conversación para empezar a chatear.
      </div>
    );
  }

  return (
    <div className="chatwin">
      {/* Botón superior para cargar anteriores */}
      <div className="load-older-row">
        {hasMore ? (
          <button
            className="load-older-btn"
            onClick={loadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder ? (
              <>
                <span className="spinner" /> Cargando…
              </>
            ) : (
              "Cargar mensajes anteriores"
            )}
          </button>
        ) : (
          <div className="load-older-end">No hay más mensajes</div>
        )}
      </div>

      <div className="chatwin-list" ref={listRef}>
        {msgs.map((m) => {
          const side = m.es_mio ? "me" : "other";
          return (
            <div key={m.id_mensaje} className={`msg-row ${side}`}>
              <div className={`bubble ${side}`}>
                <div className="bubble-content">
                  <div className="body">{m.cuerpo}</div>
                  <time className="meta">
                    {fmt24.format(new Date(m.creado_en))}
                  </time>
                </div>
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="msg-row other">
            <div className="typing-row">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      <div className="chatwin-input">
        <textarea
          ref={inputRef}
          rows={1}
          placeholder="Escribí un mensaje…"
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        <button
          className="chatwin-btn"
          title="Enviar"
          type="button"
          onClick={doSend}
          aria-label="Enviar"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
