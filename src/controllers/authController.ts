import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { buildMLAuthUrl, exchangeMLCode, refreshMLToken } from '../services/mlService';
import { buildShopeeAuthUrl, exchangeShopeeCode } from '../services/shopeeService';
import { markInviteConnected, notifyAdminWhatsApp } from '../services/onboardingService';
import { AppError } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';
import { supabase } from '../lib/supabase';

// ── Admin Auth ───────────────────────────────────────────────────────────────

export async function adminLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) throw new AppError(400, 'E-mail e senha são obrigatórios');

    const { data: account, error } = await supabase
      .from('admin_accounts')
      .select('id, password_hash')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !account) throw new AppError(401, 'E-mail ou senha inválidos');

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) throw new AppError(401, 'E-mail ou senha inválidos');

    const sessionToken = crypto.randomUUID();

    await supabase
      .from('admin_accounts')
      .update({ session_token: sessionToken })
      .eq('id', account.id);

    const body: ApiResponse<{ token: string }> = {
      success: true,
      data: { token: sessionToken },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

// ── Seller Auth ───────────────────────────────────────────────────────────────

export async function sellerRegister(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { invite_token, email, password } = req.body as {
      invite_token?: string;
      email?: string;
      password?: string;
    };

    if (!invite_token || !email || !password) {
      throw new AppError(400, 'invite_token, email e senha são obrigatórios');
    }
    if (password.length < 6) {
      throw new AppError(400, 'Senha deve ter ao menos 6 caracteres');
    }

    // Valida o invite
    const { data: invite, error: inviteErr } = await supabase
      .from('onboarding_invites')
      .select('seller_id, status')
      .eq('token', invite_token)
      .eq('status', 'connected')
      .single();

    if (inviteErr || !invite) {
      throw new AppError(401, 'Convite inválido ou seller não conectado');
    }

    // Verifica se email já existe
    const { data: existing } = await supabase
      .from('seller_accounts')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) throw new AppError(409, 'E-mail já cadastrado');

    const password_hash = await bcrypt.hash(password, 10);

    const { error: insertErr } = await supabase.from('seller_accounts').insert({
      seller_id: invite.seller_id,
      email: email.toLowerCase(),
      password_hash,
    });

    if (insertErr) throw new AppError(500, `Erro ao criar conta: ${insertErr.message}`);

    const body: ApiResponse<{ token: string; seller_id: string }> = {
      success: true,
      data: { token: invite_token, seller_id: invite.seller_id },
    };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

export async function sellerLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      throw new AppError(400, 'E-mail e senha são obrigatórios');
    }

    const { data: account, error } = await supabase
      .from('seller_accounts')
      .select('seller_id, password_hash')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !account) throw new AppError(401, 'E-mail ou senha inválidos');

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) throw new AppError(401, 'E-mail ou senha inválidos');

    // Busca o token de acesso mais recente do seller
    const { data: invite, error: tokenErr } = await supabase
      .from('onboarding_invites')
      .select('token')
      .eq('seller_id', account.seller_id)
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenErr || !invite) {
      throw new AppError(401, 'Seller não possui conexão ativa');
    }

    // Renova a sessão por 90 dias a cada login
    const newExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('onboarding_invites')
      .update({ expires_at: newExpiry })
      .eq('token', invite.token);

    const body: ApiResponse<{ token: string; seller_id: string }> = {
      success: true,
      data: { token: invite.token, seller_id: account.seller_id },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

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
      // Redireciona para o cadastro do seller para ele criar email/senha
      res.redirect(`${frontendUrl}/register?invite=${inviteToken}`);
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
