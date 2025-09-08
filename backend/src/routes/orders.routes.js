import { Router } from "express";
import { verificarToken } from "../middlewares/auth.middleware.js";
import {
  getMyOrders,        // lista paginada
  getOrderDetail      // detalle con items + pagos por vendedor
} from "../controllers/orders.controller.js";

const r = Router();
r.use(verificarToken);

// GET /api/orders/my?status=pagado&search=zebra&page=1&pageSize=10
r.get("/my", getMyOrders);

// GET /api/orders/:id
r.get("/:id", getOrderDetail);

export default r;
