import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth';
import { getOrders, collectOrderHandler } from '../controllers/ordersController';

const router = Router();

// Orders endpoints require admin auth
router.use(adminAuth);
router.get('/', getOrders);
router.patch('/:id/collect', collectOrderHandler);

export default router;
