// backend/src/index.js
import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PORT } from "./config.js";

import authRoutes from "./routes/auth.routes.js";
import disenosRoutes from "./routes/disenos.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import mpWebhookRoutes from "./routes/mp.webhook.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import mpRoutes from "./routes/mp.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";
import mensajesRoutes from "./routes/mensajes.routes.js";
import descargasRoutes from "./routes/descargas.routes.js";

import { initSocket } from "./lib/socket.js";
import { cloudinary } from "./lib/cloudinary.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
}));
app.use(express.json());
app.use(cookieParser());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/disenos", disenosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/mp", mpWebhookRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/mp", mpRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/mensajes", mensajesRoutes);
app.use("/api/descargas", descargasRoutes);
app.get("/", (_req, res) => res.send("🚀 Backend Proyecto3D funcionando!"));

// Cloudinary ping (opcional)
cloudinary.api.ping((error, result) => {
  if (error) console.error("❌ Cloudinary:", error);
  else console.log("✅ Cloudinary:", result);
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("🔥 Error global:", err);
  res.status(500).json({ error: "Error inesperado del servidor" });
});

// HTTP server + Socket.IO
const server = http.createServer(app);
const io = initSocket(server, { origin: "http://localhost:5173" });
app.set("io", io);

server.listen(PORT, () => {
  console.log(`✅ Servidor backend escuchando en el puerto ${PORT}`);
});
