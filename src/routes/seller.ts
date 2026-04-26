import { Router } from 'express';
import { sellerAuth } from '../middlewares/sellerAuth';
import {
  dashboardHandler,
  pedidosHandler,
  availableOrdersHandler,
  financeiroHandler,
  createChargeHandler,
  getProfileHandler,
  upsertProfileHandler,
  createColetaHandler,
  listColetasHandler,
} from '../controllers/sellerController';

const router = Router();

router.use(sellerAuth);

router.get('/dashboard',          dashboardHandler);
router.get('/pedidos',            pedidosHandler);
router.get('/orders/available',   availableOrdersHandler);
router.get('/financeiro',         financeiroHandler);
router.post('/financeiro/charge', createChargeHandler);

// Perfil
router.get('/profile',  getProfileHandler);
router.put('/profile',  upsertProfileHandler);

// Coletas
router.post('/coletas', createColetaHandler);
router.get('/coletas',  listColetasHandler);

export default router;
