import { Request, Response, NextFunction } from 'express';
import { confirmPayment } from '../services/sellerService';
import { logger } from '../lib/logger';

export async function abacatePayWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // AbacatePay envia o evento no body
    const event = req.body as {
      event?: string;
      data?: { billing?: { id?: string; status?: string } };
    };

    logger.info({ event: event.event }, 'Webhook AbacatePay recebido');

    const status  = event.data?.billing?.status;
    const id      = event.data?.billing?.id;

    if (event.event === 'BILLING_PAID' && status === 'PAID' && id) {
      await confirmPayment(id);
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
