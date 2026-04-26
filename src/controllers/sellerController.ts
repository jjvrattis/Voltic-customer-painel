import { Request, Response, NextFunction } from 'express';
import {
  getSellerDashboard,
  getSellerOrders,
  getSellerFinanceiro,
  getOrCreatePendingCharge,
  createCollectionRequest,
  listCollectionRequests,
  getAvailableOrders,
  getSellerProfile,
  upsertSellerProfile,
} from '../services/sellerService';
import { createPixCharge } from '../services/abacatePayService';
import { AppError } from '../middlewares/errorHandler';

export async function dashboardHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await getSellerDashboard(req.sellerId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function pedidosHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const filters = {
      status: req.query['status'] as string | undefined,
      page:   req.query['page']   ? Number(req.query['page'])  : undefined,
      limit:  req.query['limit']  ? Number(req.query['limit']) : undefined,
    };
    const data = await getSellerOrders(req.sellerId!, filters);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function availableOrdersHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await getAvailableOrders(req.sellerId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function financeiroHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await getSellerFinanceiro(req.sellerId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createChargeHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const charge = await getOrCreatePendingCharge(
      req.sellerId!,
      (amountCents, customer) => createPixCharge(amountCents, customer),
    );
    res.json({ success: true, data: charge });
  } catch (err) { next(err); }
}

export async function getProfileHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await getSellerProfile(req.sellerId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function upsertProfileHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const allowed = [
      'name', 'phone', 'cep', 'street', 'street_number', 'complement',
      'neighborhood', 'city', 'state', 'location_type',
      'floor_unit', 'doorman_name', 'intercom_code', 'access_notes',
    ];
    const body = req.body as Record<string, unknown>;
    const profile: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) profile[key] = body[key];
    }
    const data = await upsertSellerProfile(req.sellerId!, profile);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createColetaHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const {
      ml_order_ids,
      shopee_order_ids,
      ecommerce_count,
      ecommerce_proprio_count,
      notes,
      time_window,
      address_snapshot,
    } = req.body as {
      ml_order_ids?:             string[];
      shopee_order_ids?:         string[];
      ecommerce_count?:          number;
      ecommerce_proprio_count?:  number;
      notes?:                    string;
      time_window?:              string;
      address_snapshot?:         Record<string, unknown>;
    };

    const mlIds     = Array.isArray(ml_order_ids)     ? ml_order_ids     : [];
    const shopeeIds = Array.isArray(shopee_order_ids) ? shopee_order_ids : [];
    const ecom      = Math.max(0, Math.floor(Number(ecommerce_count          ?? 0)));
    const ecomProp  = Math.max(0, Math.floor(Number(ecommerce_proprio_count  ?? 0)));

    if (mlIds.length + shopeeIds.length + ecom + ecomProp === 0) {
      res.status(400).json({ success: false, error: 'Informe pelo menos 1 pacote.' });
      return;
    }

    const coleta = await createCollectionRequest(
      req.sellerId!, mlIds, shopeeIds, ecom, ecomProp,
      notes, time_window, address_snapshot,
    );
    res.status(201).json({ success: true, data: coleta });
  } catch (err) { next(err); }
}

export async function listColetasHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const page  = req.query['page']  ? Number(req.query['page'])  : 1;
    const limit = req.query['limit'] ? Number(req.query['limit']) : 20;
    const data  = await listCollectionRequests(req.sellerId!, page, limit);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
