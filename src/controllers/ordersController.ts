import { Request, Response, NextFunction } from 'express';
import { listOrders, collectOrder } from '../services/syncService';
import { ApiResponse, PaginatedResponse, Order, CollectOrderBody } from '../types';
import { AppError } from '../middlewares/errorHandler';

export async function getOrders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status, platform, polo, page, limit } = req.query;

    const result = await listOrders({
      status: typeof status === 'string' ? status : undefined,
      platform: typeof platform === 'string' ? platform : undefined,
      polo: typeof polo === 'string' ? polo : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    const body: ApiResponse<PaginatedResponse<Order>> = {
      success: true,
      data: {
        items: result.items,
        total: result.total,
        page: Number(page ?? 1),
        limit: Number(limit ?? 20),
      },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function collectOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const body = req.body as Partial<CollectOrderBody>;

    if (!body.collectedAt || !body.collectorId) {
      throw new AppError(400, 'Missing collectedAt or collectorId');
    }

    const order = await collectOrder(id, {
      collectedAt: body.collectedAt,
      collectorId: body.collectorId,
      trackingScanned: body.trackingScanned ?? false,
    });

    const response: ApiResponse<Order> = { success: true, data: order };
    res.json(response);
  } catch (err) {
    next(err);
  }
}
