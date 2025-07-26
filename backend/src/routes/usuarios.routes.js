import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
    res.send('👤 Usuarios funcionando');
});

export default router;
