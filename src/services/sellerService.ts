import { supabase } from '../lib/supabase';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';
import {
  SellerCredit, SellerCharge, SellerDashboardData, Order,
  SellerProfile, CollectionRequest,
} from '../types';
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

  const remaining    = Math.max(0, credit.credit_limit - credit.credit_used);
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

// ── Pedidos disponíveis para coleta ──────────────────────────────────────────

export async function getAvailableOrders(sellerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, platform, external_order_id, tracking_number, status, created_at')
    .eq('seller_id', sellerId)
    .eq('status', 'ready_to_ship')
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Erro ao buscar pedidos disponíveis: ${error.message}`);
  return (data ?? []) as Order[];
}

// ── Perfil do seller ──────────────────────────────────────────────────────────

export async function getSellerProfile(sellerId: string): Promise<SellerProfile | null> {
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('seller_id', sellerId)
    .single();

  if (error || !data) return null;
  return data as SellerProfile;
}

export async function upsertSellerProfile(
  sellerId: string,
  profile: Partial<Omit<SellerProfile, 'id' | 'seller_id' | 'created_at' | 'updated_at'>>,
): Promise<SellerProfile> {
  const { data, error } = await supabase
    .from('seller_profiles')
    .upsert(
      { seller_id: sellerId, ...profile, updated_at: new Date().toISOString() },
      { onConflict: 'seller_id' },
    )
    .select()
    .single();

  if (error || !data) throw new AppError(500, `Erro ao salvar perfil: ${error?.message}`);
  logger.info({ sellerId }, 'Perfil do seller atualizado');
  return data as SellerProfile;
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export async function calcAmountDue(
  sellerId: string,
  cycleStart: string,
  cycleEnd: string,
): Promise<{ amount_cents: number; ml_count: number; shopee_count: number; ecom_count: number }> {
  // Usa collection_requests coletadas no ciclo como fonte de verdade para cobrança
  const { data: coletas } = await supabase
    .from('collection_requests')
    .select('ml_count, shopee_count, ecommerce_count, ecommerce_proprio_count')
    .eq('seller_id', sellerId)
    .eq('status', 'collected')
    .gte('requested_at', cycleStart + 'T00:00:00.000Z')
    .lte('requested_at', cycleEnd   + 'T23:59:59.999Z');

  let mlCount = 0, shopeeCount = 0, ecomCount = 0;
  for (const c of coletas ?? []) {
    mlCount     += c.ml_count               ?? 0;
    shopeeCount += c.shopee_count            ?? 0;
    ecomCount   += (c.ecommerce_count ?? 0) + (c.ecommerce_proprio_count ?? 0);
  }

  const priceMl     = Number(process.env.PRICE_ML_CENTS     ?? 1150);
  const priceShopee = Number(process.env.PRICE_SHOPEE_CENTS ?? 800);
  const priceEcom   = 800;

  logger.info({ sellerId, mlCount, shopeeCount, ecomCount }, 'calcAmountDue');

  return {
    amount_cents: mlCount * priceMl + shopeeCount * priceShopee + ecomCount * priceEcom,
    ml_count:    mlCount,
    shopee_count: shopeeCount,
    ecom_count:   ecomCount,
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

  const charges      = (chargesResult.data ?? []) as SellerCharge[];
  const pendingCharge = charges.find(
    (c) => c.status === 'pending' && new Date(c.expires_at) > new Date(),
  ) ?? null;

  const remaining    = Math.max(0, credit.credit_limit - credit.credit_used);
  const pctRemaining = credit.credit_limit > 0
    ? Math.round((remaining / credit.credit_limit) * 100)
    : 0;

  const { amount_cents, ml_count, shopee_count, ecom_count } = await calcAmountDue(
    sellerId,
    credit.cycle_start,
    credit.cycle_end,
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
    amount_due:    amount_cents,
    ml_count,
    shopee_count,
    ecom_count,
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

  const { amount_cents: amountCents } = await calcAmountDue(
    sellerId,
    credit.cycle_start,
    credit.cycle_end,
  );

  if (amountCents === 0) throw new AppError(400, 'Seller não tem valor a pagar');

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

  const pixData   = await createFn(amountCents, customer);
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

export async function createCollectionRequest(
  sellerId: string,
  mlOrderIds: string[],
  shopeeOrderIds: string[],
  mlCount: number,
  shopeeCount: number,
  ecommerceCount: number,
  ecommerceProprioCount: number,
  notes?: string,
  timeWindow?: string,
  addressSnapshot?: Record<string, unknown>,
): Promise<CollectionRequest> {
  if (mlCount + shopeeCount + ecommerceCount + ecommerceProprioCount === 0) {
    throw new AppError(400, 'Informe pelo menos 1 pacote.');
  }

  const { data, error } = await supabase
    .from('collection_requests')
    .insert({
      seller_id:               sellerId,
      ml_count:                mlCount,
      shopee_count:            shopeeCount,
      ecommerce_count:         ecommerceCount,
      ecommerce_proprio_count: ecommerceProprioCount,
      ml_order_ids:            mlOrderIds,
      shopee_order_ids:        shopeeOrderIds,
      notes:                   notes ?? null,
      time_window:             timeWindow ?? 'qualquer',
      address_snapshot:        addressSnapshot ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new AppError(500, `Erro ao criar coleta: ${error?.message}`);
  logger.info({ sellerId, mlCount, shopeeCount, ecommerceCount, ecommerceProprioCount }, 'Coleta solicitada');
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
