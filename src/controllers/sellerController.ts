import { Request, Response, NextFunction } from 'express';
import {
  getSellerDashboard,
  getSellerOrders,
  getSellerFinanceiro,
  getOrCreatePendingCharge,
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
