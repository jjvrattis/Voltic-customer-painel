import { Router } from 'express';
import { abacatePayWebhookHandler } from '../controllers/webhookController';

const router = Router();

router.post('/abacatepay', abacatePayWebhookHandler);

export default router;
