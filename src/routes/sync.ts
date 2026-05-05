import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth';
import { syncML, syncShopee } from '../controllers/syncController';

const router = Router();

// Sync endpoints require admin auth
router.use(adminAuth);
router.post('/ml/:sellerId', syncML);
router.post('/shopee/:sellerId', syncShopee);

export default router;
