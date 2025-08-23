// routes/usuarios.routes.js
import { Router } from 'express';
import {
  obtenerPerfilPorApodo,
  obtenerDisenosPorApodo,
  contarSeguidores,
  promedioResenas,
  estadoSeguirPorApodo,
  seguirUsuarioPorApodo,
  dejarDeSeguirUsuarioPorApodo,
  crearResena
} from '../controllers/usuarios.controller.js';
import { verificarToken } from '../middlewares/validarToken.js';

const router = Router();

// 🔹 RUTAS PÚBLICAS
router.get('/:apodo/perfil', obtenerPerfilPorApodo);
router.get('/:apodo/disenos', obtenerDisenosPorApodo);
router.get('/:apodo/seguidores/count', contarSeguidores);
router.get('/:apodo/resenas/average', promedioResenas);

// 🔒 RUTAS PRIVADAS (requieren token)
router.get('/:apodo/seguidores/status', verificarToken, estadoSeguirPorApodo);
router.post('/:apodo/seguidores', verificarToken, seguirUsuarioPorApodo);
router.post('/:apodo/resenas', verificarToken, crearResena);
router.delete('/:apodo/seguidores', verificarToken, dejarDeSeguirUsuarioPorApodo);

export default router;
