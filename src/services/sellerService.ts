import { supabase } from '../lib/supabase';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';
import { SellerCredit, SellerCharge, SellerDashboardData, Order } from '../types';
import { SellerCustomer } from './abacatePayService';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getSellerDashboard(sellerId: string): Promise<SellerDashboardData> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersResult, creditResult] = await Promise.all([
    supabase
      .from('orders')
      .select('status')
      .eq('seller_id', sellerId)
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('seller_credits')
      .select('*')
      .eq('seller_id', sellerId)
      .single(),
  ]);

  if (ordersResult.error) {
    throw new AppError(500, `Erro ao buscar pedidos: ${ordersResult.error.message}`);
  }

  // Criar crédito padrão se não existir
  let credit: SellerCredit;
  if (creditResult.error || !creditResult.data) {
    const { data: newCredit, error: createErr } = await supabase
      .from('seller_credits')
      .insert({ seller_id: sellerId })
      .select()
      .single();
    if (createErr || !newCredit) throw new AppError(500, 'Erro ao criar crédito do seller');
    credit = newCredit as SellerCredit;
  } else {
    credit = creditResult.data as SellerCredit;
  }

  const orders = ordersResult.data ?? [];
  const counts = { ready_to_ship: 0, collected: 0, shipped: 0, delivered: 0, cancelled: 0 };
  for (const o of orders) {
    const s = o.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }

  const remaining   = Math.max(0, credit.credit_limit - credit.credit_used);
  const pctRemaining = credit.credit_limit > 0
    ? Math.round((remaining / credit.credit_limit) * 100)
    : 0;

  return {
    orders_today: { ...counts, total: orders.length },
    credit: {
      limit:         credit.credit_limit,
      used:          credit.credit_used,
      remaining,
      pct_remaining: pctRemaining,
      cycle_start:   credit.cycle_start,
      cycle_end:     credit.cycle_end,
      low_credit:    pctRemaining < 20,
    },
  };
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export async function getSellerOrders(
  sellerId: string,
  filters: { status?: string; page?: number; limit?: number },
): Promise<{ items: Order[]; total: number; page: number; limit: number }> {
  const page  = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, filters.limit ?? 20);
  const from  = (page - 1) * limit;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('seller_id', sellerId);

  if (filters.status) query = query.eq('status', filters.status);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new AppError(500, `Erro ao buscar pedidos: ${error.message}`);
  return { items: (data ?? []) as Order[], total: count ?? 0, page, limit };
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export async function calcAmountDue(
  sellerId: string,
  creditUsed: number,
): Promise<{ amount_cents: number; ml_count: number; shopee_count: number }> {
  if (creditUsed === 0) return { amount_cents: 0, ml_count: 0, shopee_count: 0 };

  // Pega os N pedidos mais recentes onde N = credit_used (fonte de verdade)
  const { data: orders } = await supabase
    .from('orders')
    .select('platform')
    .eq('seller_id', sellerId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(creditUsed);

  const found       = orders ?? [];
  const mlCount     = found.filter((o) => o.platform === 'mercadolivre').length;
  const shopeeCount = found.filter((o) => o.platform === 'shopee').length;

  // Pedidos não encontrados no banco são tratados como ML (fallback)
  const unmatched   = Math.max(0, creditUsed - mlCount - shopeeCount);
  const effectiveMl = mlCount + unmatched;

  const priceMl     = Number(process.env.PRICE_ML_CENTS     ?? 1150);
  const priceShopee = Number(process.env.PRICE_SHOPEE_CENTS ?? 800);

  logger.info({ sellerId, creditUsed, effectiveMl, shopeeCount, unmatched }, 'calcAmountDue');

  return {
    amount_cents: effectiveMl * priceMl + shopeeCount * priceShopee,
    ml_count:     effectiveMl,
    shopee_count: shopeeCount,
  };
}

export async function getSellerFinanceiro(sellerId: string) {
  const [creditResult, chargesResult] = await Promise.all([
    supabase.from('seller_credits').select('*').eq('seller_id', sellerId).single(),
    supabase
      .from('seller_charges')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  let credit: SellerCredit;
  if (creditResult.error || !creditResult.data) {
    const { data: newCredit, error: createErr } = await supabase
      .from('seller_credits')
      .insert({ seller_id: sellerId })
      .select()
      .single();
    if (createErr || !newCredit) throw new AppError(500, 'Erro ao criar crédito do seller');
    credit = newCredit as SellerCredit;
  } else {
    credit = creditResult.data as SellerCredit;
  }

  const charges = (chargesResult.data ?? []) as SellerCharge[];
  const pendingCharge = charges.find(
    (c) => c.status === 'pending' && new Date(c.expires_at) > new Date(),
  ) ?? null;

  const remaining    = Math.max(0, credit.credit_limit - credit.credit_used);
  const pctRemaining = credit.credit_limit > 0
    ? Math.round((remaining / credit.credit_limit) * 100)
    : 0;

  const { amount_cents, ml_count, shopee_count } = await calcAmountDue(
    sellerId,
    credit.credit_used,
  );

  return {
    credit: {
      limit:         credit.credit_limit,
      used:          credit.credit_used,
      remaining,
      pct_remaining: pctRemaining,
      cycle_start:   credit.cycle_start,
      cycle_end:     credit.cycle_end,
      low_credit:    pctRemaining < 20,
    },
    amount_due:   amount_cents,
    ml_count,
    shopee_count,
    charges,
    pending_charge: pendingCharge,
  };
}

// ── Criar cobrança ────────────────────────────────────────────────────────────

export async function getOrCreatePendingCharge(
  sellerId: string,
  createFn: (amountCents: number, customer: SellerCustomer) => Promise<{
    abacatepay_id: string;
    pix_code: string;
    qr_code_base64: string;
  }>,
): Promise<SellerCharge> {
  const { data: creditData } = await supabase
    .from('seller_credits')
    .select('*')
    .eq('seller_id', sellerId)
    .single();

  if (!creditData) throw new AppError(404, 'Crédito do seller não encontrado');
  const credit = creditData as SellerCredit;

  if (credit.credit_used === 0) throw new AppError(400, 'Seller não tem crédito a pagar');

  // Verificar se já tem cobrança pendente válida
  const { data: existing } = await supabase
    .from('seller_charges')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing as SellerCharge;

  // Buscar dados do seller para o customer AbacatePay
  const { data: inviteData } = await supabase
    .from('onboarding_invites')
    .select('seller_name, seller_phone')
    .eq('seller_id', sellerId)
    .eq('status', 'connected')
    .order('connected_at', { ascending: false })
    .limit(1)
    .single();

  const customer: SellerCustomer = {
    name:      inviteData?.seller_name ?? `Seller ${sellerId}`,
    cellphone: inviteData?.seller_phone ?? null,
  };

  const { amount_cents: amountCents } = await calcAmountDue(
    sellerId,
    credit.credit_used,
  );

  if (amountCents === 0) throw new AppError(400, 'Valor calculado é zero');

  const pixData = await createFn(amountCents, customer);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: charge, error } = await supabase
    .from('seller_charges')
    .insert({
      seller_id:      sellerId,
      amount_cents:   amountCents,
      abacatepay_id:  pixData.abacatepay_id,
      pix_code:       pixData.pix_code,
      qr_code_base64: pixData.qr_code_base64,
      expires_at:     expiresAt,
    })
    .select()
    .single();

  if (error || !charge) throw new AppError(500, `Erro ao salvar cobrança: ${error?.message}`);
  logger.info({ sellerId, amountCents }, 'Cobrança Pix criada');
  return charge as SellerCharge;
}

// ── Coletas manuais ───────────────────────────────────────────────────────────

export interface CollectionRequest {
  id: string;
  seller_id: string;
  ml_count: number;
  ecommerce_count: number;
  total_count: number;
  notes: string | null;
  status: 'pending' | 'collected' | 'cancelled';
  requested_at: string;
  collected_at: string | null;
}

export async function createCollectionRequest(
  sellerId: string,
  mlCount: number,
  ecommerceCount: number,
  notes?: string,
): Promise<CollectionRequest> {
  const { data, error } = await supabase
    .from('collection_requests')
    .insert({
      seller_id:       sellerId,
      ml_count:        mlCount,
      ecommerce_count: ecommerceCount,
      notes:           notes ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new AppError(500, `Erro ao criar coleta: ${error?.message}`);
  logger.info({ sellerId, mlCount, ecommerceCount }, 'Coleta solicitada');
  return data as CollectionRequest;
}

export async function listCollectionRequests(
  sellerId: string,
  page: number,
  limit: number,
): Promise<{ items: CollectionRequest[]; total: number; page: number; limit: number }> {
  const p    = Math.max(1, page);
  const lim  = Math.min(50, limit);
  const from = (p - 1) * lim;

  const { data, error, count } = await supabase
    .from('collection_requests')
    .select('*', { count: 'exact' })
    .eq('seller_id', sellerId)
    .order('requested_at', { ascending: false })
    .range(from, from + lim - 1);

  if (error) throw new AppError(500, `Erro ao buscar coletas: ${error.message}`);
  return { items: (data ?? []) as CollectionRequest[], total: count ?? 0, page: p, limit: lim };
}

// ── Confirmar pagamento (webhook) ─────────────────────────────────────────────

export async function confirmPayment(abacatepayId: string): Promise<void> {
  const { data: charge, error } = await supabase
    .from('seller_charges')
    .select('seller_id')
    .eq('abacatepay_id', abacatepayId)
    .single();

  if (error || !charge) {
    logger.warn({ abacatepayId }, 'Webhook recebido para cobrança desconhecida');
    return;
  }

  await supabase
    .from('seller_charges')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('abacatepay_id', abacatepayId);

  const nextCycleStart = new Date();
  const nextCycleEnd   = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await supabase
    .from('seller_credits')
    .update({
      credit_used:  0,
      cycle_start:  nextCycleStart.toISOString().split('T')[0],
      cycle_end:    nextCycleEnd.toISOString().split('T')[0],
      updated_at:   new Date().toISOString(),
    })
    .eq('seller_id', charge.seller_id);

  logger.info({ abacatepayId, sellerId: charge.seller_id }, 'Pagamento confirmado, crédito resetado');
}
