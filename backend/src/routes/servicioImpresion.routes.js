// routes/servicioImpresion.routes.js
import { Router } from "express";
import { verificarToken } from "../middlewares/auth.middleware.js";
import * as C from "../controllers/servicioImpresion.controller.js";

const r = Router();

// Ping para verificar montaje del router
r.get("/ping", (_req, res) => res.json({ ok: true, where: "servicio" }));

// Adaptador NO intrusivo: si alguna parte de tu stack mete req.user, lo copio a req.usuario.
// No toca tu auth.middleware.js, solo normaliza.
function ensureUsuario(req, _res, next) {
  if (!req.usuario && req.user) req.usuario = req.user;
  next();
}

// Sanity checks para no volvernos locos con "undefined"
if (typeof verificarToken !== "function") {
  throw new Error("verificarToken es undefined (revisá export/import de auth.middleware.js)");
}
["getMiVendedor","upsertVendedor","mpOAuthStart","crearImpresora","listarImpresorasPublicas","cotizarOrden","checkoutMP","webhookMP"]
  .forEach(k => { if (typeof C[k] !== "function") throw new Error(`Controller ${k} es undefined`); });

// Rutas
r.get("/vendedores/me", verificarToken, ensureUsuario, C.getMiVendedor);
r.post("/vendedores", verificarToken, ensureUsuario, C.upsertVendedor);

r.get("/vendedores/mp/oauth/start", verificarToken, ensureUsuario, C.mpOAuthStart);

r.post("/impresoras", verificarToken, ensureUsuario, C.crearImpresora);
r.get("/impresoras", C.listarImpresorasPublicas);

r.post("/ordenes/cotizar", verificarToken, ensureUsuario, C.cotizarOrden);
r.post("/ordenes/:id/checkout", verificarToken, ensureUsuario, C.checkoutMP);

r.post("/webhooks/mercadopago", C.webhookMP);
r.get("/vendedores/mp/oauth/callback", C.mpOAuthCallback);
export default r;

