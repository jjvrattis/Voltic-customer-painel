import { Router, Request, Response } from 'express';
import authRouter from './auth';
import syncRouter from './sync';
import ordersRouter from './orders';
import onboardingRouter from './onboarding';
import sellerRouter from './seller';
import webhooksRouter from './webhooks';
import { listSellersHandler } from '../controllers/onboardingController';
import { runRecurringHandler } from '../controllers/sellerExtraController';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRouter);
router.use('/sync', syncRouter);
router.use('/orders', ordersRouter);
router.use('/onboarding', onboardingRouter);
router.use('/seller', sellerRouter);
router.use('/webhooks', webhooksRouter);
router.get('/sellers', listSellersHandler);

// Cron — disparado por serviço externo (cron-job.org, etc) com header x-cron-secret
router.post('/jobs/recurring-collections', runRecurringHandler);

export default router;
