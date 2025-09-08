import { Router } from "express";
import { mpWebhook } from "../controllers/mp.webhook.controller.js";

// MP puede llamar por GET (legacy) o POST (webhook moderno). Soportemos ambos:
const r = Router();

// GET /api/mp/webhook
r.get("/webhook", mpWebhook);

// POST /api/mp/webhook
r.post("/webhook", mpWebhook);

export default r;
