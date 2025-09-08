import { Router } from "express";
import { mpWebhook } from "../controllers/mp.controller.js";

const r = Router();

// Mercado Pago pega acá. No requiere auth.
r.post("/webhook", mpWebhook);

export default r;
