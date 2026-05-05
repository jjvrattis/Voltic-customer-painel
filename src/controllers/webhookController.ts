import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { confirmPayment } from '../services/sellerService';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

export async function abacatePayWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Verificação de assinatura HMAC (AbacatePay envia x-webhook-token)
    const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
    if (secret) {
      const receivedToken = req.headers['x-webhook-token'] as string | undefined;
      if (!receivedToken || receivedToken !== secret) {
        logger.warn({ headers: req.headers }, 'Webhook AbacatePay: token inválido');
        throw new AppError(401, 'Webhook token inválido');
      }
    }

    const event = req.body as {
      event?: string;
      data?: { billing?: { id?: string; status?: string } };
    };

    logger.info({ event: event.event }, 'Webhook AbacatePay recebido');

    const status  = event.data?.billing?.status;
    const id      = event.data?.billing?.id;

    if (event.event === 'BILLING_PAID' && status === 'PAID' && id) {
      await confirmPayment(id);
      logger.info({ billingId: id }, 'Pagamento confirmado via webhook');
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
