import { Router } from "express";
import { verificarToken } from "../middlewares/auth.middleware.js";
import {
  getMySalesSummary,    // métricas resumidas
  getMySalesOrders,     // lista de órdenes donde vendí algo (paginada)
  getSellerOrderDetail  // detalle de una orden pero SOLO mis items y mi pago
} from "../controllers/sales.controller.js";

const r = Router();
r.use(verificarToken);

// GET /api/sales/summary?days=30
r.get("/summary", getMySalesSummary);

// GET /api/sales/orders?status=approved&page=1&pageSize=10
r.get("/orders", getMySalesOrders);

// GET /api/sales/orders/:id
r.get("/orders/:id", getSellerOrderDetail);

export default r;
