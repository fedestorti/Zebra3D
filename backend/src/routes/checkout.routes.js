import { Router } from "express";
import { verificarToken } from "../middlewares/validarToken.js";
import { createCheckout } from "../controllers/checkout.controller.js";

const r = Router();

r.use(verificarToken);

// POST /api/checkout
r.post("/", createCheckout);

export default r;
