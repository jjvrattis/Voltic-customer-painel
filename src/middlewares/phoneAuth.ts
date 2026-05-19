import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from './errorHandler';
import { resolvePhoneSession } from '../services/phoneAuthService';

// Enriquece req com seller_id (text) compatível com rotas existentes
export async function phoneAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw new AppError(401, 'Token não informado');

    // ── Tenta sessão por telefone primeiro ──────────────────────────────────
    const session = await resolvePhoneSession(token);

    if (session && session.accountType === 'seller') {
      // Resolve seller_id (text) a partir do account_id (UUID)
      const { data: account } = await supabase
        .from('seller_accounts')
        .select('seller_id')
        .eq('id', session.accountId)
        .maybeSingle();

      if (!account) throw new AppError(401, 'Conta não encontrada');

      const sellerId = account.seller_id as string;

      const { data: profile } = await supabase
        .from('seller_profiles')
        .select('name')
        .eq('seller_id', sellerId)
        .maybeSingle();

      req.sellerId   = sellerId;
      req.sellerName = (profile?.name as string | undefined) ?? undefined;
      return next();
    }

    // ── Fallback: token legado via onboarding_invites ───────────────────────
    const { data: invite } = await supabase
      .from('onboarding_invites')
      .select('seller_id, seller_name')
      .eq('token', token)
      .maybeSingle();

    if (!invite) throw new AppError(401, 'Token inválido ou expirado');

    // Verifica se o route param :id bate com o seller (proteção lateral)
    const sellerId = req.params['id'];
    if (sellerId && invite.seller_id !== sellerId) {
      throw new AppError(403, 'Acesso negado a este seller');
    }

    req.sellerId   = invite.seller_id  as string;
    req.sellerName = invite.seller_name as string | undefined;
    next();
  } catch (err) {
    next(err);
  }
}
