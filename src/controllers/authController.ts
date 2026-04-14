import { Request, Response, NextFunction } from 'express';
import { buildMLAuthUrl, exchangeMLCode, refreshMLToken } from '../services/mlService';
import { buildShopeeAuthUrl, exchangeShopeeCode } from '../services/shopeeService';
import { markInviteConnected, notifyAdminWhatsApp } from '../services/onboardingService';
import { AppError } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';

// ── Mercado Livre ────────────────────────────────────────────────────────────

export async function mlGetUrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const state = typeof req.query['state'] === 'string' ? req.query['state'] : undefined;
    const url = buildMLAuthUrl(state);
    const body: ApiResponse<{ url: string }> = { success: true, data: { url } };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function mlCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== 'string') {
      throw new AppError(400, 'Missing authorization code');
    }

    const token = await exchangeMLCode(code);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const inviteToken = typeof state === 'string' ? state : null;

    // Se veio de um invite de onboarding, marcar como conectado e notificar
    if (inviteToken) {
      await markInviteConnected(inviteToken, token.seller_id);
      await notifyAdminWhatsApp(token.seller_id);
      // Redireciona para o painel do seller passando o token como query param
      // O frontend salva o token no localStorage e redireciona internamente
      res.redirect(
        `${frontendUrl}/seller/${token.seller_id}?token=${inviteToken}`,
      );
      return;
    }

    // Fluxo direto (sem invite) — redireciona para /conectar com banner de sucesso
    res.redirect(`${frontendUrl}/conectar?success=ml`);
  } catch (err) {
    next(err);
  }
}

export async function mlRefresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sellerId } = req.body as { sellerId?: string };
    if (!sellerId) throw new AppError(400, 'Missing sellerId');
    const token = await refreshMLToken(sellerId);
    const body: ApiResponse = {
      success: true,
      data: { expires_at: token.expires_at },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

// ── Shopee ───────────────────────────────────────────────────────────────────

export async function shopeeGetUrl(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const url = buildShopeeAuthUrl();
    const body: ApiResponse<{ url: string }> = { success: true, data: { url } };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function shopeeCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, shop_id } = req.query;
    if (!code || typeof code !== 'string') {
      throw new AppError(400, 'Missing authorization code');
    }
    if (!shop_id || typeof shop_id !== 'string') {
      throw new AppError(400, 'Missing shop_id');
    }
    const token = await exchangeShopeeCode(code, shop_id);
    const body: ApiResponse = { success: true, data: { seller_id: token.seller_id } };
    res.json(body);
  } catch (err) {
    next(err);
  }
}
