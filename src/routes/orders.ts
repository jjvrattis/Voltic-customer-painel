import { Router } from 'express';
import { getOrders, collectOrderHandler } from '../controllers/ordersController';

const router = Router();

router.get('/', getOrders);
router.patch('/:id/collect', collectOrderHandler);

export default router;
