import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';
import { sendOtpCode } from './whatsappService';

const CODE_TTL_S      = Number(process.env['PHONE_CODE_TTL_SECONDS']        ?? 300);
const RESEND_COOL_S   = Number(process.env['PHONE_RESEND_COOLDOWN_SECONDS']  ?? 60);
const MAX_ATTEMPTS    = Number(process.env['PHONE_MAX_ATTEMPTS']             ?? 5);
const SESSION_TTL_D   = 30; // dias até a sessão expirar

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizePhone(raw: string): string {
  let phone = raw.replace(/\D/g, '');
  if (!phone.startsWith('55')) phone = '55' + phone;
  return phone;
}

function generateCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Envio de código ─────────────────────────────────────────────────────────

export async function sendVerificationCode(phone: string, ip?: string): Promise<void> {
  const normalized = normalizePhone(phone);

  if (normalized.length < 12 || normalized.length > 13) {
    throw new AppError(400, 'Número inválido. Use o formato: 11999998888');
  }

  // Verifica cooldown: não pode pedir outro código por RESEND_COOL_S segundos
  const cooldownCutoff = new Date(Date.now() - RESEND_COOL_S * 1000).toISOString();
  const { data: recent } = await supabase
    .from('phone_verification_codes')
    .select('id, created_at')
    .eq('phone', normalized)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .gt('created_at', cooldownCutoff)
    .limit(1)
    .maybeSingle();

  if (recent) {
    throw new AppError(429, `Aguarde ${RESEND_COOL_S} segundos para solicitar outro código.`);
  }

  // Invalida códigos antigos não-usados do mesmo número
  await supabase
    .from('phone_verification_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('phone', normalized)
    .is('used_at', null);

  const code      = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_S * 1000).toISOString();

  const { error } = await supabase
    .from('phone_verification_codes')
    .insert({ phone: normalized, code, expires_at: expiresAt, ip: ip ?? null });

  if (error) throw new AppError(500, 'Erro ao gerar código de verificação.');

  await sendOtpCode(normalized, code);
  logger.info({ phone: normalized }, 'OTP code sent');
}

// ─── Verificação de código ────────────────────────────────────────────────────

export async function verifyCode(phone: string, code: string): Promise<string> {
  const normalized = normalizePhone(phone);

  const { data: record, error } = await supabase
    .from('phone_verification_codes')
    .select('id, code, expires_at, attempts, used_at')
    .eq('phone', normalized)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !record) {
    throw new AppError(400, 'Nenhum código ativo encontrado. Solicite um novo.');
  }

  if (new Date() > new Date(record.expires_at as string)) {
    await supabase.from('phone_verification_codes').update({ used_at: new Date().toISOString() }).eq('id', record.id);
    throw new AppError(400, 'Código expirado. Solicite um novo.');
  }

  const attempts = (record.attempts as number) ?? 0;
  if (attempts >= MAX_ATTEMPTS) {
    throw new AppError(429, 'Muitas tentativas. Solicite um novo código.');
  }

  if ((record.code as string).trim() !== String(code).trim()) {
    await supabase.from('phone_verification_codes').update({ attempts: attempts + 1 }).eq('id', record.id);
    const remaining = MAX_ATTEMPTS - (attempts + 1);
    throw new AppError(400, `Código incorreto. Tentativas restantes: ${remaining}`);
  }

  // Marca como usado
  await supabase.from('phone_verification_codes').update({ used_at: new Date().toISOString() }).eq('id', record.id);
  logger.info({ phone: normalized }, 'OTP verified');
  return normalized;
}

// ─── Criação de sessão ────────────────────────────────────────────────────────

export interface SessionPayload {
  accountType: 'seller' | 'collector' | 'admin' | 'carrier';
  accountId:   string;
  deviceInfo?: Record<string, unknown>;
}

export async function createPhoneSession(payload: SessionPayload): Promise<string> {
  const token     = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_D * 86_400_000).toISOString();

  const { error } = await supabase.from('phone_sessions').insert({
    account_type:  payload.accountType,
    account_id:    payload.accountId,
    session_token: token,
    device_info:   payload.deviceInfo ?? null,
    expires_at:    expiresAt,
  });

  if (error) throw new AppError(500, `Erro ao criar sessão: ${error.message}`);
  return token;
}

// ─── Lookup de sessão ─────────────────────────────────────────────────────────

export interface PhoneSessionInfo {
  accountType: string;
  accountId:   string;
}

export async function resolvePhoneSession(token: string): Promise<PhoneSessionInfo | null> {
  const { data, error } = await supabase
    .from('phone_sessions')
    .select('account_type, account_id, expires_at')
    .eq('session_token', token)
    .maybeSingle();

  if (error || !data) return null;

  if (data.expires_at && new Date() > new Date(data.expires_at as string)) return null;

  // Atualiza last_used_at sem bloquear a resposta
  supabase
    .from('phone_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('session_token', token)
    .then(() => { /* fire and forget */ });

  return { accountType: data.account_type as string, accountId: data.account_id as string };
}

// ─── Registro de novo seller via telefone ────────────────────────────────────

export interface SellerRegisterResult {
  sessionToken: string;
  sellerId:     string;
  isNew:        boolean;
}

export async function phoneRegisterSeller(
  phone: string,
  code:  string,
  deviceInfo?: Record<string, unknown>,
): Promise<SellerRegisterResult> {
  const normalized = await verifyCode(phone, code);

  // Se já tem conta, faz login normal em vez de criar duplicata
  const { data: existing } = await supabase
    .from('seller_accounts')
    .select('id, seller_id, phone_verified_at')
    .eq('phone', normalized)
    .maybeSingle();

  if (existing) {
    if (!existing.phone_verified_at) {
      await supabase
        .from('seller_accounts')
        .update({ phone_verified_at: new Date().toISOString(), legacy_email_login: false })
        .eq('id', existing.id);
    }
    const sessionToken = await createPhoneSession({
      accountType: 'seller',
      accountId:   existing.id as string,
      deviceInfo,
    });
    return { sessionToken, sellerId: existing.seller_id as string, isNew: false };
  }

  // Cria nova conta phone-only
  const internalId = crypto.randomUUID();
  const { data: newAccount, error } = await supabase
    .from('seller_accounts')
    .insert({
      seller_id:          internalId,
      phone:              normalized,
      phone_verified_at:  new Date().toISOString(),
      legacy_email_login: false,
    })
    .select('id, seller_id')
    .single();

  if (error || !newAccount) throw new AppError(500, `Erro ao criar conta: ${error?.message}`);

  // Cria crédito inicial zerado
  await supabase.from('seller_credits').insert({
    seller_id:    internalId,
    credit_limit: 0,
    used_credits: 0,
  });

  const sessionToken = await createPhoneSession({
    accountType: 'seller',
    accountId:   newAccount.id as string,
    deviceInfo,
  });

  logger.info({ phone: normalized, sellerId: internalId }, 'Novo seller criado via OTP');
  return { sessionToken, sellerId: internalId, isNew: true };
}

// ─── Fluxo completo: verificar + logar seller ─────────────────────────────────

export interface SellerLoginResult {
  sessionToken: string;
  sellerId:     string; // text — o seller_id (ML ID ou interno) usado nas rotas
  sellerName:   string | null;
  isNew:        boolean;
}

export async function phoneLoginSeller(
  phone: string,
  code:  string,
  deviceInfo?: Record<string, unknown>,
): Promise<SellerLoginResult> {
  const normalized = await verifyCode(phone, code);

  // Busca conta pelo telefone
  const { data: account } = await supabase
    .from('seller_accounts')
    .select('id, seller_id, phone_verified_at')
    .eq('phone', normalized)
    .maybeSingle();

  if (!account) {
    throw new AppError(404, 'Nenhuma conta encontrada para este número. Cadastre-se primeiro.');
  }

  // Marca telefone como verificado se ainda não estava
  if (!account.phone_verified_at) {
    await supabase
      .from('seller_accounts')
      .update({ phone_verified_at: new Date().toISOString(), legacy_email_login: false })
      .eq('id', account.id);
  }

  const sessionToken = await createPhoneSession({
    accountType: 'seller',
    accountId:   account.id as string,
    deviceInfo,
  });

  // Busca nome do seller no perfil
  const { data: profile } = await supabase
    .from('seller_profiles')
    .select('name')
    .eq('seller_id', account.seller_id as string)
    .maybeSingle();

  return {
    sessionToken,
    sellerId:   account.seller_id as string,
    sellerName: (profile?.name as string | null) ?? null,
    isNew:      false,
  };
}
