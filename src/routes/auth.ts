import { Router } from 'express';
import {
  mlGetUrl,
  mlCallback,
  mlRefresh,
  shopeeGetUrl,
  shopeeCallback,
  sellerRegister,
  sellerSignup,
  sellerLogin,
  adminLogin,
} from '../controllers/authController';
import { collectorLogin } from '../controllers/collectorController';

const router = Router();

// Mercado Livre
router.get('/ml/url', mlGetUrl);
router.get('/ml/callback', mlCallback);
router.post('/ml/refresh', mlRefresh);

// Admin Auth
router.post('/admin/login', adminLogin);

// Seller Auth
router.post('/seller/signup',   sellerSignup);
router.post('/seller/register', sellerRegister);
router.post('/seller/login',    sellerLogin);

// Collector Auth
router.post('/collector/login', collectorLogin);

// Shopee
router.get('/shopee/url', shopeeGetUrl);
router.get('/shopee/callback', shopeeCallback);

export default router;
