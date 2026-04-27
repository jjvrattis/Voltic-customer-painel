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
import {
  readyToCollectHandler,
  quickCollectHandler,
  collectionDetailHandler,
  getRecurringHandler,
  upsertRecurringHandler,
  registerPushTokenHandler,
  integrationsHandler,
  createProprioHandler,
  listProprioHandler,
  getProprioHandler,
  cancelProprioHandler,
  proprioLabelHandler,
} from '../controllers/sellerExtraController';

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
router.post('/coletas',          createColetaHandler);
router.get('/coletas',           listColetasHandler);
router.get('/coletas/ready',     readyToCollectHandler);
router.post('/coletas/quick',    quickCollectHandler);
router.get('/coletas/:id',       collectionDetailHandler);

// Coleta automática (recorrente)
router.get('/recurring',  getRecurringHandler);
router.put('/recurring',  upsertRecurringHandler);

// Push notifications
router.post('/push-token', registerPushTokenHandler);

// Integrações ML/Shopee
router.get('/integrations', integrationsHandler);

// Pedidos próprios (e-commerce do seller)
router.post('/orders/proprio',           createProprioHandler);
router.get('/orders/proprio',            listProprioHandler);
router.get('/orders/proprio/:id',        getProprioHandler);
router.delete('/orders/proprio/:id',     cancelProprioHandler);
router.get('/orders/proprio/:id/label',  proprioLabelHandler);

export default router;
