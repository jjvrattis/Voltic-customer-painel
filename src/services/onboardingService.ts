import crypto from 'crypto';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

export interface OnboardingInvite {
  id: string;
  token: string;
  seller_name: string;
  seller_phone: string | null;
  status: 'pending' | 'connected';
  seller_id: string | null;
  created_at: string;
  connected_at: string | null;
  expires_at: string;
}

// ── Criar invite ──────────────────────────────────────────────────────────────

export async function createInvite(
  sellerName: string,
  sellerPhone?: string,
): Promise<OnboardingInvite> {
  const token = crypto.randomBytes(16).toString('hex'); // 32 chars hex
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

  const { data, error } = await supabase
    .from('onboarding_invites')
    .insert({
      token,
      seller_name: sellerName,
      seller_phone: sellerPhone ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new AppError(500, `Erro ao criar invite: ${error.message}`);
  logger.info({ token, sellerName }, 'Invite de onboarding criado');
  return data as OnboardingInvite;
}

// ── Buscar invite por token ───────────────────────────────────────────────────

export async function getInviteByToken(token: string): Promise<OnboardingInvite> {
  const { data, error } = await supabase
    .from('onboarding_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) throw new AppError(404, 'Invite não encontrado ou expirado');

  const invite = data as OnboardingInvite;

  if (new Date(invite.expires_at) < new Date()) {
    throw new AppError(410, 'Este link de convite expirou');
  }

  return invite;
}

// ── Marcar invite como conectado ─────────────────────────────────────────────

export async function markInviteConnected(
  token: string,
  sellerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('onboarding_invites')
    .update({ status: 'connected', seller_id: sellerId, connected_at: new Date().toISOString() })
    .eq('token', token);

  if (error) {
    logger.error({ err: error, token }, 'Erro ao marcar invite como conectado');
  }
}

// ── Notificação WhatsApp (Evolution API) ─────────────────────────────────────

export async function notifyAdminWhatsApp(sellerName: string): Promise<void> {
  const apiUrl      = process.env.EVOLUTION_API_URL;
  const apiKey      = process.env.EVOLUTION_API_KEY;
  const instance    = process.env.EVOLUTION_INSTANCE;
  const adminPhone  = process.env.ADMIN_PHONE; // ex: 5511999999999

  if (!apiUrl || !apiKey || !instance || !adminPhone) {
    logger.debug('[onboarding] Variáveis de WhatsApp não configuradas — notificação ignorada');
    return;
  }

  try {
    await axios.post(
      `${apiUrl}/message/sendText/${instance}`,
      { number: adminPhone, text: `✅ *${sellerName}* conectou o Mercado Livre no Voltic!` },
      { headers: { apikey: apiKey }, timeout: 5000 },
    );
    logger.info({ sellerName, adminPhone }, '[onboarding] Notificação WhatsApp enviada');
  } catch (err) {
    // Notificação é best-effort — não quebrar o fluxo se falhar
    logger.warn({ err }, '[onboarding] Falha ao enviar notificação WhatsApp');
  }
}

// ── Listar sellers conectados ─────────────────────────────────────────────────

export async function listConnectedSellers() {
  const { data, error } = await supabase
    .from('seller_tokens')
    .select('id, seller_id, platform, expires_at, created_at');

  if (error) throw new AppError(500, `Erro ao listar sellers: ${error.message}`);
  return data ?? [];
}
