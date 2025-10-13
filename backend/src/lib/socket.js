// backend/src/lib/socket.js
import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config.js";

export let io; // ← exportamos una referencia global

export function initSocket(httpServer, corsParam) {
  const cors =
    typeof corsParam === "string"
      ? { origin: corsParam, credentials: true }
      : { ...(corsParam || {}), credentials: true };

  io = new Server(httpServer, {
    cors,
    transports: ["websocket"],
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie || "";
      const jar = cookie.parse(raw || "");
      const token = jar.access_token;
      if (!token) return next(new Error("No token"));
      const payload = jwt.verify(token, JWT_ACCESS_SECRET);
      socket.user = { id_usuario: payload.id_usuario };
      next();
    } catch {
      next(new Error("Auth inválida"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.user?.id_usuario;
    if (!uid) return socket.disconnect(true);

    socket.join(`user:${uid}`);

    socket.on("thread:join", ({ id_conversacion }) => {
      if (!id_conversacion) return;
      socket.join(`conv:${id_conversacion}`);
    });

    socket.on("thread:leave", ({ id_conversacion }) => {
      if (!id_conversacion) return;
      socket.leave(`conv:${id_conversacion}`);
    });

    socket.on("typing", ({ id_conversacion, typing }) => {
      if (!id_conversacion) return;
      socket.to(`conv:${id_conversacion}`).emit("typing", {
        id_conversacion,
        from: uid,
        typing: Boolean(typing),
        at: Date.now(),
      });
    });
  });

  return io;
}
