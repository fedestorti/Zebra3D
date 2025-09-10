// src/routes/mp.webhook.routes.js
import { Router } from "express";
import { webhookMP } from "../controllers/mp.webhook.controller.js";

const router = Router();

// Debe aceptar POST (MP suele mandar POST). También dejá GET por compat.
router.post("/webhook", webhookMP);
router.get("/webhook", webhookMP);

export default router;
