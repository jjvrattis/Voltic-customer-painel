import { Request, Response, NextFunction } from 'express';
import {
  getSellerDashboard,
  getSellerOrders,
  getSellerFinanceiro,
  getOrCreatePendingCharge,
  createCollectionRequest,
  listCollectionRequests,
} from '../services/sellerService';
import { createPixCharge } from '../services/abacatePayService';

export async function dashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.sellerId!;
    const data = await getSellerDashboard(sellerId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function pedidosHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.sellerId!;
    const filters = {
      status: req.query['status'] as string | undefined,
      page:   req.query['page']   ? Number(req.query['page'])  : undefined,
      limit:  req.query['limit']  ? Number(req.query['limit']) : undefined,
    };
    const data = await getSellerOrders(sellerId, filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function financeiroHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.sellerId!;
    const data = await getSellerFinanceiro(sellerId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createChargeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.sellerId!;
    const charge = await getOrCreatePendingCharge(
      sellerId,
      (amountCents, customer) => createPixCharge(amountCents, customer),
    );
    res.json({ success: true, data: charge });
  } catch (err) {
    next(err);
  }
}

export async function createColetaHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.sellerId!;
    const { ml_count, ecommerce_count, notes } = req.body as {
      ml_count?: number;
      ecommerce_count?: number;
      notes?: string;
    };

    const ml   = Math.max(0, Math.floor(Number(ml_count ?? 0)));
    const ecom = Math.max(0, Math.floor(Number(ecommerce_count ?? 0)));

    if (ml + ecom === 0) {
      res.status(400).json({ success: false, error: 'Informe pelo menos 1 pacote.' });
      return;
    }

    const coleta = await createCollectionRequest(sellerId, ml, ecom, notes);
    res.status(201).json({ success: true, data: coleta });
  } catch (err) {
    next(err);
  }
}

export async function listColetasHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.sellerId!;
    const page  = req.query['page']  ? Number(req.query['page'])  : 1;
    const limit = req.query['limit'] ? Number(req.query['limit']) : 20;
    const data = await listCollectionRequests(sellerId, page, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
