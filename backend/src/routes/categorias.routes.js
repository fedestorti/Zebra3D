// backend/src/routes/categorias.routes.js
import { Router } from 'express';
import { getCategorias, getCategoriaById } from '../controllers/categorias.controller.js';

const router = Router();

router.get('/', getCategorias);
router.get('/:id', getCategoriaById); // opcional

export default router;
