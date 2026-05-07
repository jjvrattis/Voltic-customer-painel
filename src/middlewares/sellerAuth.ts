import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from './errorHandler';

declare module 'express-serve-static-core' {
  interface Request {
    sellerId?: string;
    sellerName?: string;
  }
}

export async function sellerAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) throw new AppError(401, 'Token de seller não informado');

    const { data: invite, error } = await supabase
      .from('onboarding_invites')
      .select('seller_id, seller_name')
      .eq('token', token)
      .single();

    if (error || !invite) throw new AppError(401, 'Token inválido');

    const sellerId = req.params['id'];
    if (sellerId && invite.seller_id !== sellerId) {
      throw new AppError(403, 'Acesso negado a este seller');
    }

    req.sellerId  = invite.seller_id;
    req.sellerName = invite.seller_name;
    next();
  } catch (err) {
    next(err);
  }
}
