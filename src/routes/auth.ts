import { Router } from 'express';
import {
  mlGetUrl,
  mlCallback,
  mlRefresh,
  shopeeGetUrl,
  shopeeCallback,
} from '../controllers/authController';

const router = Router();

// Mercado Livre
router.get('/ml/url', mlGetUrl);
router.get('/ml/callback', mlCallback);
router.post('/ml/refresh', mlRefresh);

// Shopee
router.get('/shopee/url', shopeeGetUrl);
router.get('/shopee/callback', shopeeCallback);

export default router;
