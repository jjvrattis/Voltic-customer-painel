import { Request, Response, NextFunction } from 'express';
import {
  createInvite,
  getInviteByToken,
  listConnectedSellers,
} from '../services/onboardingService';
import { AppError } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';

// POST /api/v1/onboarding/invite
export async function createInviteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sellerName, sellerPhone } = req.body as {
      sellerName?: string;
      sellerPhone?: string;
    };
    if (!sellerName?.trim()) throw new AppError(400, 'sellerName é obrigatório');

    const invite = await createInvite(sellerName.trim(), sellerPhone?.trim());

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const link = `${frontendUrl}/onboarding/${invite.token}`;

    const body: ApiResponse = {
      success: true,
      data: { token: invite.token, link, expires_at: invite.expires_at },
    };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/onboarding/:token
export async function getInviteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.params as { token: string };
    const invite = await getInviteByToken(token);
    const body: ApiResponse = {
      success: true,
      data: {
        seller_name: invite.seller_name,
        status: invite.status,
        expires_at: invite.expires_at,
      },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/sellers
export async function listSellersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellers = await listConnectedSellers();
    const body: ApiResponse = { success: true, data: sellers };
    res.json(body);
  } catch (err) {
    next(err);
  }
}
