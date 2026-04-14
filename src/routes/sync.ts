import { Router } from 'express';
import { syncML, syncShopee } from '../controllers/syncController';

const router = Router();

router.post('/ml/:sellerId', syncML);
router.post('/shopee/:sellerId', syncShopee);

export default router;
