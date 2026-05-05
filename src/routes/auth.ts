import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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
import { sellerAuth } from '../middlewares/sellerAuth';
import { adminAuth } from '../middlewares/adminAuth';

const router = Router();

// Rate limiting: max 10 tentativas de login por 15 min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Muitas tentativas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mercado Livre
router.get('/ml/url',      sellerAuth, mlGetUrl);   // requer seller logado
router.get('/ml/callback', mlCallback);              // callback público (vem do ML)
router.post('/ml/refresh', sellerAuth, mlRefresh);   // requer seller logado

// Admin Auth
router.post('/admin/login', loginLimiter, adminLogin);

// Seller Auth
router.post('/seller/signup',   loginLimiter, sellerSignup);
router.post('/seller/register', loginLimiter, sellerRegister);
router.post('/seller/login',    loginLimiter, sellerLogin);

// Collector Auth
router.post('/collector/login', loginLimiter, collectorLogin);

// Shopee
router.get('/shopee/url', shopeeGetUrl);
router.get('/shopee/callback', shopeeCallback);

export default router;
