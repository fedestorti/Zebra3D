// cart.routes.js
import { Router } from "express";
import { verificarToken } from "../middlewares/validarToken.js";
import { getOrCreateCart, addItem, removeItem, clearCart } from "../controllers/cart.controller.js";

const r = Router();
r.use(verificarToken);

r.get("/", getOrCreateCart);
r.post("/items", addItem);
r.delete("/items/:id_diseno", removeItem);

// soportá ambas:
r.delete("/", clearCart);       // <-- habilita DELETE /api/cart
r.delete("/clear", clearCart);  // <-- tu ruta actual

export default r;
