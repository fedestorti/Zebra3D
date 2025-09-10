import "dotenv/config";
import express from "express";
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
import { cloudinary } from "./lib/cloudinary.js";

const app = express();

// CORS: habilitar cookies (credenciales) desde el front
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
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

// Debug de rutas (solo dev)
app.get("/api/debug/routes", (_req, res) => {
  const out = [];
  app._router.stack.forEach((m) => {
    if (m.route?.path) out.push({ method: Object.keys(m.route.methods)[0].toUpperCase(), path: m.route.path });
    if (m.name === "router" && m.handle?.stack) {
      m.handle.stack.forEach((h) => {
        if (h.route?.path) out.push({ method: Object.keys(h.route.methods)[0].toUpperCase(), path: h.route.path });
      });
    }
  });
  res.json(out);
});

// Ping raíz
app.get("/", (_req, res) => res.send("🚀 Backend Proyecto3D funcionando!"));

// Cloudinary ping
cloudinary.api.ping((error, result) => {
  if (error) console.error("❌ Error conectando a Cloudinary:", error);
  else console.log("✅ Conectado a Cloudinary:", result);
});

// Manejo de errores
app.use((err, _req, res, _next) => {
  console.error("🔥 Middleware global de errores:", err);
  res.status(500).json({ error: "Error inesperado del servidor" });
});

// Server
app.listen(PORT, () => {
  console.log(`✅ Servidor backend escuchando en el puerto ${PORT}`);
});
