import { Router } from 'express';
import {
  mlGetUrl,
  mlCallback,
  mlRefresh,
  shopeeGetUrl,
  shopeeCallback,
  sellerRegister,
  sellerLogin,
  adminLogin,
} from '../controllers/authController';

const router = Router();

// Mercado Livre
router.get('/ml/url', mlGetUrl);
router.get('/ml/callback', mlCallback);
router.post('/ml/refresh', mlRefresh);

// Admin Auth
router.post('/admin/login', adminLogin);

// Seller Auth
router.post('/seller/register', sellerRegister);
router.post('/seller/login',    sellerLogin);

// Shopee
router.get('/shopee/url', shopeeGetUrl);
router.get('/shopee/callback', shopeeCallback);

export default router;
