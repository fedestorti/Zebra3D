// src/context/ChatContext.jsx
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { io as ioClient } from "socket.io-client";
import API, { ensureCsrf } from "../api";

const ChatCtx = createContext(null);
export const useChat = () => useContext(ChatCtx);

// Toma el host del backend a partir de VITE_API_URL, quitando "/api"
const SOCKET_URL =
  (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "")) || "http://localhost:4000";

export default function ChatProvider({ children }) {
  // -------- state --------
  const [activeThread, _setActive] = useState(null);
  const [threads, setThreads] = useState([]);
  const [messagesByThread, setMessagesByThread] = useState({});
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [typingByThread, setTypingByThread] = useState({});

  // el usuario eligió manualmente un hilo (para no cambiarle el foco)
  const userChoseRef = useRef(false);
  const setActive = useCallback((id) => {
    userChoseRef.current = true;
    _setActive(id);
  }, []);

  // sockets + de-dupe
  const socketRef = useRef(null);
  const msgIdsRef = useRef({}); // { [id_conversacion]: Set<id_mensaje> }

  function pushMsgDedup(m) {
    if (!m?.id_conversacion || !m?.id_mensaje) return;
    const cid = m.id_conversacion;
    if (!msgIdsRef.current[cid]) msgIdsRef.current[cid] = new Set();
    if (msgIdsRef.current[cid].has(m.id_mensaje)) return; // ya lo tenemos
    msgIdsRef.current[cid].add(m.id_mensaje);
    setMessagesByThread((prev) => {
      const arr = prev[cid] || [];
      return { ...prev, [cid]: [...arr, m] };
    });
  }

  // --------- API helpers (declaradas ANTES de los effects) ---------
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await API.get("/mensajes/unread-count");
      setUnreadTotal(data?.total ?? 0);
    } catch (e) {
      if (e?.response?.status === 401) setUnreadTotal(0);
      else console.error("fetchUnreadCount:", e);
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      await ensureCsrf();
      const { data } = await API.get("/mensajes/threads", { params: { limit: 50 } });
      const rows = Array.isArray(data) ? data : [];
      const norm = rows
        .map((t) => ({
          ...t,
          no_leidos: Number(t.no_leidos || 0),
          ultimo_ts: t.ultimo_ts ? new Date(t.ultimo_ts) : null,
        }))
        .sort(
          (a, b) =>
            (b.ultimo_ts?.getTime?.() || 0) - (a.ultimo_ts?.getTime?.() || 0)
        );

      setThreads(norm);
      setUnreadTotal(norm.reduce((acc, t) => acc + (t.no_leidos || 0), 0));

      // Autoseleccionar solo una vez si el user nunca eligió
      if (!userChoseRef.current && !activeThread && norm.length) {
        _setActive(norm[0].id_conversacion);
      }
    } catch (e) {
      if (e?.response?.status === 401) {
        setThreads([]);
        setUnreadTotal(0);
      } else {
        console.error("fetchThreads:", e);
      }
    } finally {
      setLoading(false);
    }
  }, [activeThread]);

  // Primera carga: COLA (últimos N) | Paginación: más antiguos (cursor = id más viejo)
  const fetchMessages = useCallback(
    async ({ conversacionId, cursor = null, limit = 50, mode = "tail" }) => {
      const { data } = await API.get(
        `/mensajes/threads/${conversacionId}/mensajes`,
        { params: { cursor, limit, mode } }
      );
      const arr = Array.isArray(data) ? data : [];

      if (!msgIdsRef.current[conversacionId])
        msgIdsRef.current[conversacionId] = new Set();
      arr.forEach((m) => msgIdsRef.current[conversacionId].add(m.id_mensaje));

      setMessagesByThread((prev) => {
        const list = prev[conversacionId] || [];
        return cursor
          ? { ...prev, [conversacionId]: [...arr, ...list] } // prepend más antiguos
          : { ...prev, [conversacionId]: arr };              // primera carga (cola)
      });

      return arr;
    },
    []
  );

  const openThread = useCallback(async (userIdB) => {
    await ensureCsrf();
    const { data } = await API.post("/mensajes/threads", { b: userIdB });
    const id = data.id_conversacion;
    setActive(id);
    return id;
  }, [setActive]);

  const markThreadAsRead = useCallback(
    async (conversacionId) => {
      if (!conversacionId) return;
      const arr = messagesByThread[conversacionId] || [];
      const lastId = arr.length ? arr[arr.length - 1].id_mensaje : null;
      if (!lastId) return;

      // Optimista: bajar pill en memoria
      const old = threads.find((t) => t.id_conversacion === conversacionId);
      const delta = old?.no_leidos || 0;
      if (delta) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id_conversacion === conversacionId ? { ...t, no_leidos: 0 } : t
          )
        );
        setUnreadTotal((u) => Math.max(0, u - delta));
      }

      try {
        await ensureCsrf();
        await API.post("/mensajes/read", {
          conversacionId,
          hastaMensajeId: lastId,
        });
      } catch (e) {
        console.warn("markThreadAsRead fallo:", e?.message || e);
      }
    },
    [messagesByThread, threads]
  );

  const sendDirect = useCallback(
    async (userIdB, contenido) => {
      const conversacionId = await openThread(userIdB);
      await ensureCsrf();
      const { data } = await API.post("/mensajes/send", {
        conversacionId,
        para: userIdB,
        contenido,
      });

      // Optimista + de-dupe (cuando llegue el socket con el mismo id, se ignora)
      pushMsgDedup(data.mensaje);

      // Marcar leído si estoy en ese hilo
      if (activeThread === conversacionId) {
        markThreadAsRead(conversacionId);
      }

      // Refrescos de lista/contadores
      fetchThreads();
      fetchUnreadCount();

      // Garantizar que estoy unido al room
      const s = socketRef.current;
      if (s?.connected) s.emit("thread:join", { id_conversacion: conversacionId });

      return conversacionId;
    },
    [openThread, fetchThreads, fetchUnreadCount, activeThread, markThreadAsRead]
  );

  const emitTyping = useCallback((id_conversacion, typing) => {
    const s = socketRef.current;
    if (!s?.connected || !id_conversacion) return;
    s.emit("typing", { id_conversacion, typing: Boolean(typing) });
  }, []);

  // --------- efectos (después de declarar helpers) ---------
  // Conexión socket
  useEffect(() => {
    const s = ioClient(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
      path: "/socket.io",
    });
    socketRef.current = s;

    s.on("connect", () => {
      if (activeThread) s.emit("thread:join", { id_conversacion: activeThread });
    });

    // Mensaje nuevo
    s.on("message:new", (payload) => {
      const m = payload?.mensaje || payload;
      pushMsgDedup(m);

      if (m?.id_conversacion && m.id_conversacion === activeThread) {
        // si estoy mirando ese hilo, marcá leído
        markThreadAsRead(m.id_conversacion);
      }

      // refrescar lista para contadores/preview
      fetchThreads();
    });

    // Ping para actualizar lista
    s.on("thread:poke", () => {
      fetchThreads();
    });

    // Indicador "escribiendo"
    s.on("typing", (evt) => {
      const { id_conversacion } = evt || {};
      if (!id_conversacion) return;
      setTypingByThread((prev) => ({ ...prev, [id_conversacion]: evt }));
      setTimeout(() => {
        setTypingByThread((prev) => {
          const cur = prev[id_conversacion];
          if (!cur) return prev;
          if (Date.now() - cur.at >= 2500) {
            const clone = { ...prev };
            clone[id_conversacion] = { ...cur, typing: false };
            return clone;
          }
          return prev;
        });
      }, 2600);
    });

    return () => {
      try { s.close(); } catch {}
      socketRef.current = null;
    };
  }, [activeThread, fetchThreads, markThreadAsRead]);

  // Unir/dejar sala del hilo al cambiar activeThread
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !s.connected) return;
    if (activeThread) s.emit("thread:join", { id_conversacion: activeThread });
    return () => {
      if (activeThread && s?.connected) s.emit("thread:leave", { id_conversacion: activeThread });
    };
  }, [activeThread]);

  // Cargar mensajes de la conversación activa (últimos N) cuando cambia
  useEffect(() => {
    if (!activeThread) return;
    fetchMessages({ conversacionId: activeThread, cursor: null, limit: 50, mode: "tail" });
  }, [activeThread, fetchMessages]);

  // Podés disparar fetchThreads() aquí o desde la página
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const value = {
    // state
    activeThread,
    threads,
    messagesByThread,
    unreadTotal,
    loading,
    typingByThread,
    // actions
    setActive,
    openThread,
    sendDirect,
    fetchThreads,
    fetchMessages,
    markThreadAsRead,
    markRead: async ({ conversacionId, hastaMensajeId }) => {
      await ensureCsrf();
      await API.post("/mensajes/read", { conversacionId, hastaMensajeId });
      fetchUnreadCount();
    },
    emitTyping,
  };

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}
