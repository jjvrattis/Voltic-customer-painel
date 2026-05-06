import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth';
import {
  getAdminMetrics,
  getLiveMap,
  listAdminSellers,
  updateSellerCredit,
  getSellerAssignments,
  upsertSellerAssignment,
  removeSellerAssignment,
  listAdminCollectors,
  createAdminCollector,
  updateAdminCollector,
} from '../controllers/adminController';

const router = Router();

router.use(adminAuth);

router.get('/metrics',                    getAdminMetrics);
router.get('/map',                        getLiveMap);

router.get('/sellers',                              listAdminSellers);
router.patch('/sellers/:sellerId/credit',           updateSellerCredit);
router.get('/sellers/:sellerId/assignments',         getSellerAssignments);
router.post('/sellers/:sellerId/assignments',        upsertSellerAssignment);
router.delete('/sellers/:sellerId/assignments/:collectorId', removeSellerAssignment);

router.get('/collectors',                 listAdminCollectors);
router.post('/collectors',                createAdminCollector);
router.patch('/collectors/:collectorId',  updateAdminCollector);

export default router;
