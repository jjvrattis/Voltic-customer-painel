import { Router } from 'express';
import { collectorAuth } from '../middlewares/collectorAuth';
import {
  todayCollections,
  updateCollectionStatus,
  registerScan,
  todayDeliveries,
  completeDelivery,
  scanHistory,
} from '../controllers/collectorController';

const router = Router();

router.use(collectorAuth);

router.get(  '/collections/today',         todayCollections);
router.patch('/collections/:id/status',    updateCollectionStatus);

router.post( '/scans',                     registerScan);

router.get(  '/deliveries/today',          todayDeliveries);
router.post( '/deliveries/:id/complete',   completeDelivery);

router.get(  '/scans/history',             scanHistory);

export default router;
