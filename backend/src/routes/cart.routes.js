//cart.routes.js

import { Router } from "express";
import { verificarToken  } from "../middlewares/auth.middleware.js";
import { getOrCreateCart, addItem, removeItem, clearCart } from "../controllers/cart.controller.js";

const r = Router();
r.use(verificarToken );

r.get("/", getOrCreateCart);
r.post("/items", addItem);
r.delete("/items/:id_diseno", removeItem);
r.delete("/clear", clearCart);

export default r;
