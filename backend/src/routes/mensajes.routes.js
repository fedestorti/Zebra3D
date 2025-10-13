// backend/src/routes/mensajes.routes.js
import { Router } from "express";
import { verificarToken } from "../middlewares/validarToken.js"; // tu middleware que setea req.user
import { verifyCsrf } from "../middlewares/csrf.js";
import {
  ensureThread,
  sendMessage,
  listThreads,
  listMessages,
  markRead,
  unreadCount,
} from "../controllers/mensajes.controller.js";

const r = Router();

// leer info → solo auth
r.get("/threads", verificarToken, listThreads);
r.get("/threads/:id/mensajes", verificarToken, listMessages);
r.get("/unread-count", verificarToken, unreadCount);

// mutaciones → auth + CSRF
r.post("/threads", verificarToken, verifyCsrf, ensureThread);
r.post("/send", verificarToken, verifyCsrf, sendMessage);
r.post("/read", verificarToken, verifyCsrf, markRead);

export default r;
