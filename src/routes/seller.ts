import { Router } from 'express';
import { sellerAuth } from '../middlewares/sellerAuth';
import {
  dashboardHandler,
  pedidosHandler,
  financeiroHandler,
  createChargeHandler,
  createColetaHandler,
  listColetasHandler,
} from '../controllers/sellerController';

const router = Router();

// Todas as rotas exigem token de seller
router.use(sellerAuth);

router.get('/dashboard', dashboardHandler);
router.get('/pedidos',   pedidosHandler);
router.get('/financeiro', financeiroHandler);
router.post('/financeiro/charge', createChargeHandler);

// Coletas manuais
router.post('/coletas', createColetaHandler);
router.get('/coletas',  listColetasHandler);

export default router;
