import { Request, Response, NextFunction } from 'express';
import { syncMLOrders, syncShopeeOrders } from '../services/syncService';
import { ApiResponse } from '../types';

export async function syncML(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.params['sellerId'] as string;
    const count = await syncMLOrders(sellerId);
    const body: ApiResponse<{ synced: number }> = {
      success: true,
      data: { synced: count },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function syncShopee(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.params['sellerId'] as string;
    const count = await syncShopeeOrders(sellerId);
    const body: ApiResponse<{ synced: number }> = {
      success: true,
      data: { synced: count },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}
