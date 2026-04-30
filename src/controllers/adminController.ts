import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { AppError } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';

// ── Métricas gerais ──────────────────────────────────────────────────────────

export async function getAdminMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]!;

    const [
      { count: totalSellers },
      { count: totalCollectors },
      { count: activeCollectors },
      ordersToday,
      deliveriesToday,
      pendingCharges,
    ] = await Promise.all([
      supabase.from('seller_accounts').select('*', { count: 'exact', head: true }),
      supabase.from('collectors').select('*', { count: 'exact', head: true }),
      supabase.from('collectors').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase
        .from('orders')
        .select('status', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`),
      supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .gte('delivered_at', `${today}T00:00:00`),
      supabase
        .from('seller_charges')
        .select('amount_cents')
        .eq('status', 'pending'),
    ]);

    // Contagem por status hoje
    const statusCount: Record<string, number> = {};
    for (const row of (ordersToday.data ?? [])) {
      statusCount[row.status] = (statusCount[row.status] ?? 0) + 1;
    }

    // Valor pendente total
    const pendingTotal = (pendingCharges.data ?? []).reduce(
      (acc, c) => acc + (c.amount_cents as number),
      0,
    );

    res.json({
      success: true,
      data: {
        sellers:   { total: totalSellers ?? 0 },
        collectors:{ total: totalCollectors ?? 0, active: activeCollectors ?? 0 },
        orders_today: {
          total:        (ordersToday.count ?? 0),
          ready_to_ship: statusCount['ready_to_ship'] ?? 0,
          collected:     statusCount['collected']      ?? 0,
          shipped:       statusCount['shipped']        ?? 0,
          delivered:     statusCount['delivered']      ?? 0,
        },
        deliveries_today: deliveriesToday.count ?? 0,
        pending_billing_cents: pendingTotal,
      },
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Lojistas ─────────────────────────────────────────────────────────────────

export async function listAdminSellers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { data: accounts, error } = await supabase
      .from('seller_accounts')
      .select('seller_id, email, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, error.message);

    const sellerIds = (accounts ?? []).map(a => a.seller_id as string);

    // Busca perfis, créditos e última coleta em paralelo
    const [profilesRes, creditsRes, collectionsRes, ordersRes] = await Promise.all([
      supabase
        .from('seller_profiles')
        .select('seller_id, name, phone, city, state')
        .in('seller_id', sellerIds),
      supabase
        .from('seller_credits')
        .select('seller_id, credit_limit, credit_used, cycle_start, cycle_end')
        .in('seller_id', sellerIds),
      supabase
        .from('collection_requests')
        .select('seller_id, status, requested_at')
        .in('seller_id', sellerIds)
        .order('requested_at', { ascending: false }),
      supabase
        .from('orders')
        .select('seller_id, status')
        .in('seller_id', sellerIds),
    ]);

    const profileMap   = new Map((profilesRes.data ?? []).map(p => [p.seller_id, p]));
    const creditMap    = new Map((creditsRes.data ?? []).map(c => [c.seller_id, c]));
    const lastColMap   = new Map<string, string>();
    for (const c of (collectionsRes.data ?? [])) {
      if (!lastColMap.has(c.seller_id as string))
        lastColMap.set(c.seller_id as string, c.requested_at as string);
    }

    // Pedidos por seller
    const orderCountMap = new Map<string, number>();
    for (const o of (ordersRes.data ?? [])) {
      orderCountMap.set(o.seller_id as string, (orderCountMap.get(o.seller_id as string) ?? 0) + 1);
    }

    const sellers = (accounts ?? []).map(a => ({
      seller_id:      a.seller_id,
      email:          a.email,
      created_at:     a.created_at,
      profile:        profileMap.get(a.seller_id as string) ?? null,
      credit:         creditMap.get(a.seller_id as string) ?? null,
      last_collection: lastColMap.get(a.seller_id as string) ?? null,
      total_orders:   orderCountMap.get(a.seller_id as string) ?? 0,
    }));

    res.json({ success: true, data: { sellers } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

export async function updateSellerCredit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sellerId } = req.params;
    const { credit_limit, reset_cycle } = req.body as {
      credit_limit?: number;
      reset_cycle?: boolean;
    };

    if (credit_limit === undefined && !reset_cycle) {
      throw new AppError(400, 'Informe credit_limit ou reset_cycle');
    }

    const update: Record<string, unknown> = {};
    if (credit_limit !== undefined) {
      if (credit_limit < 0) throw new AppError(400, 'Limite não pode ser negativo');
      update['credit_limit'] = credit_limit;
    }
    if (reset_cycle) {
      const now   = new Date();
      const start = now.toISOString().split('T')[0];
      const end   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      update['credit_used']  = 0;
      update['cycle_start']  = start;
      update['cycle_end']    = end;
    }

    const { error } = await supabase
      .from('seller_credits')
      .update(update)
      .eq('seller_id', sellerId!);

    if (error) throw new AppError(500, error.message);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Coletores ────────────────────────────────────────────────────────────────

export async function listAdminCollectors(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('collectors')
      .select('id, name, phone, active, cep_zones, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, error.message);

    // Última entrega de cada coletor
    const ids = (data ?? []).map(c => c.id as string);
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('collector_id, delivered_at')
      .in('collector_id', ids)
      .order('delivered_at', { ascending: false });

    const lastDeliveryMap = new Map<string, string>();
    for (const d of (deliveries ?? [])) {
      if (!lastDeliveryMap.has(d.collector_id as string))
        lastDeliveryMap.set(d.collector_id as string, d.delivered_at as string);
    }

    const { data: scans } = await supabase
      .from('scans')
      .select('collector_id')
      .in('collector_id', ids);

    const scanCountMap = new Map<string, number>();
    for (const s of (scans ?? [])) {
      scanCountMap.set(s.collector_id as string, (scanCountMap.get(s.collector_id as string) ?? 0) + 1);
    }

    const collectors = (data ?? []).map(c => ({
      ...c,
      last_delivery: lastDeliveryMap.get(c.id as string) ?? null,
      total_scans:   scanCountMap.get(c.id as string) ?? 0,
    }));

    res.json({ success: true, data: { collectors } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

export async function createAdminCollector(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, phone, pin, cep_zones } = req.body as {
      name?: string;
      phone?: string;
      pin?: string;
      cep_zones?: string[];
    };

    if (!name || !phone || !pin) throw new AppError(400, 'name, phone e pin são obrigatórios');
    if (!/^\d{4}$/.test(pin)) throw new AppError(400, 'PIN deve ter 4 dígitos');

    const cleanPhone = phone.replace(/\D/g, '');
    const pin_hash   = await bcrypt.hash(pin, 10);

    const { data, error } = await supabase
      .from('collectors')
      .insert({
        name:       name.trim(),
        phone:      cleanPhone,
        pin_hash,
        active:     true,
        cep_zones:  cep_zones ?? [],
      })
      .select('id, name, phone, active, cep_zones')
      .single();

    if (error) throw new AppError(500, error.message);

    res.status(201).json({ success: true, data } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

export async function updateAdminCollector(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { collectorId } = req.params;
    const { name, phone, pin, active, cep_zones } = req.body as {
      name?: string;
      phone?: string;
      pin?: string;
      active?: boolean;
      cep_zones?: string[];
    };

    const update: Record<string, unknown> = {};
    if (name      !== undefined) update['name']      = name.trim();
    if (phone     !== undefined) update['phone']     = phone.replace(/\D/g, '');
    if (active    !== undefined) update['active']    = active;
    if (cep_zones !== undefined) update['cep_zones'] = cep_zones;
    if (pin !== undefined) {
      if (!/^\d{4}$/.test(pin)) throw new AppError(400, 'PIN deve ter 4 dígitos');
      update['pin_hash'] = await bcrypt.hash(pin, 10);
      // invalida sessão atual ao trocar PIN
      update['session_token'] = null;
    }

    if (Object.keys(update).length === 0) {
      res.json({ success: true } satisfies ApiResponse);
      return;
    }

    const { error } = await supabase
      .from('collectors')
      .update(update)
      .eq('id', collectorId!);

    if (error) throw new AppError(500, error.message);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
