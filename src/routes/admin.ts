import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth';
import {
  getAdminMetrics,
  listAdminSellers,
  updateSellerCredit,
  listAdminCollectors,
  createAdminCollector,
  updateAdminCollector,
} from '../controllers/adminController';

const router = Router();

router.use(adminAuth);

router.get('/metrics',                    getAdminMetrics);

router.get('/sellers',                    listAdminSellers);
router.patch('/sellers/:sellerId/credit', updateSellerCredit);

router.get('/collectors',                 listAdminCollectors);
router.post('/collectors',                createAdminCollector);
router.patch('/collectors/:collectorId',  updateAdminCollector);

export default router;
