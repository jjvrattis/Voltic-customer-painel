import { Router } from 'express';
import { sellerAuth } from '../middlewares/sellerAuth';
import {
  dashboardHandler,
  pedidosHandler,
  financeiroHandler,
  createChargeHandler,
} from '../controllers/sellerController';

const router = Router();

// Todas as rotas exigem token de seller
router.use(sellerAuth);

router.get('/dashboard', dashboardHandler);
router.get('/pedidos',   pedidosHandler);
router.get('/financeiro', financeiroHandler);
router.post('/financeiro/charge', createChargeHandler);

export default router;
