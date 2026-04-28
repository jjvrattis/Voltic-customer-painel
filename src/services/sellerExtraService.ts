import { supabase } from '../lib/supabase';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProprioOrder {
  id:                 string;
  seller_id:          string;
  external_ref:       string | null;
  recipient_name:     string;
  recipient_phone:    string;
  recipient_email:    string | null;
  dest_cep:           string;
  dest_street:        string;
  dest_number:        string;
  dest_complement:    string | null;
  dest_neighborhood:  string | null;
  dest_city:          string;
  dest_state:         string;
  weight_grams:       number | null;
  notes:              string | null;
  status:             string;
  collection_id:      string | null;
  created_at:         string;
  collected_at:       string | null;
  delivered_at:       string | null;
}

export interface RecurringConfig {
  enabled:     boolean;
  weekdays:    number[];   // 0=domingo .. 6=sábado
  hour:        number;     // 0..23
  time_window: string;     // 'manha' | 'tarde' | 'qualquer'
  last_run_at: string | null;
}

export interface CollectionDetail {
  id:                 string;
  status:             string;
  ml_count:           number;
  shopee_count:       number;
  ecommerce_count:    number;
  ecommerce_proprio_count: number;
  total_count:        number;
  notes:              string | null;
  time_window:        string;
  address_snapshot:   Record<string, unknown> | null;
  origin_lat:         number | null;
  origin_lng:         number | null;
  dest_lat:           number | null;
  dest_lng:           number | null;
  requested_at:       string;
  accepted_at:        string | null;
  en_route_at:        string | null;
  arrived_at:         string | null;
  collected_at:       string | null;
  collector_location: { lat: number; lng: number; updated_at: string } | null;
  proprio_orders:     ProprioOrder[];
}

// ─── Quick Collect (1-tap) ────────────────────────────────────────────────────

export async function getReadyToCollect(sellerId: string): Promise<{
  ml: number;
  shopee: number;
  proprio: number;
  total: number;
  ml_order_ids: string[];
  shopee_order_ids: string[];
  proprio_order_ids: string[];
}> {
  const [mlR, shopeeR, proprioR] = await Promise.all([
    supabase
      .from('orders')
      .select('id, external_order_id')
      .eq('seller_id', sellerId)
      .eq('platform', 'mercadolivre')
      .eq('status', 'ready_to_ship'),
    supabase
      .from('orders')
      .select('id, external_order_id')
      .eq('seller_id', sellerId)
      .eq('platform', 'shopee')
      .eq('status', 'ready_to_ship'),
    supabase
      .from('proprio_orders')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('status', 'ready_to_ship'),
  ]);

  const mlIds      = (mlR.data ?? []).map(r => r.external_order_id as string);
  const shopeeIds  = (shopeeR.data ?? []).map(r => r.external_order_id as string);
  const proprioIds = (proprioR.data ?? []).map(r => r.id as string);

  return {
    ml:      mlIds.length,
    shopee:  shopeeIds.length,
    proprio: proprioIds.length,
    total:   mlIds.length + shopeeIds.length + proprioIds.length,
    ml_order_ids:      mlIds,
    shopee_order_ids:  shopeeIds,
    proprio_order_ids: proprioIds,
  };
}

export async function quickCollect(sellerId: string, timeWindow: string = 'qualquer'): Promise<{ collection_id: string; total: number }> {
  const ready = await getReadyToCollect(sellerId);
  if (ready.total === 0) {
    throw new AppError(400, 'Nenhum pedido pronto para coletar.');
  }

  // Snapshot do endereço
  const { data: profile } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('seller_id', sellerId)
    .single();

  const { data: collection, error } = await supabase
    .from('collection_requests')
    .insert({
      seller_id:               sellerId,
      ml_count:                ready.ml,
      shopee_count:            ready.shopee,
      ecommerce_count:         0,
      ecommerce_proprio_count: ready.proprio,
      ml_order_ids:            ready.ml_order_ids,
      shopee_order_ids:        ready.shopee_order_ids,
      time_window:             timeWindow,
      address_snapshot:        profile ?? null,
      origin_lat:              profile?.['lat'] ?? null,
      origin_lng:              profile?.['lng'] ?? null,
    })
    .select()
    .single();

  if (error || !collection) throw new AppError(500, `Erro ao criar coleta: ${error?.message}`);

  // Linka os pedidos próprios à coleta
  if (ready.proprio_order_ids.length > 0) {
    await supabase
      .from('proprio_orders')
      .update({ collection_id: collection.id })
      .in('id', ready.proprio_order_ids);
  }

  logger.info({ sellerId, total: ready.total }, 'Quick collect criada');
  return { collection_id: collection.id as string, total: ready.total };
}

// ─── Coleta Detalhe ───────────────────────────────────────────────────────────

export async function getCollectionDetail(sellerId: string, collectionId: string): Promise<CollectionDetail> {
  const { data: collection, error } = await supabase
    .from('collection_requests')
    .select('*')
    .eq('id', collectionId)
    .eq('seller_id', sellerId)
    .single();

  if (error || !collection) throw new AppError(404, 'Coleta não encontrada');

  const [locR, proprioR] = await Promise.all([
    supabase
      .from('collector_locations')
      .select('lat, lng, updated_at')
      .eq('collection_id', collectionId)
      .single(),
    supabase
      .from('proprio_orders')
      .select('*')
      .eq('collection_id', collectionId),
  ]);

  return {
    ...(collection as object),
    collector_location: locR.data ?? null,
    proprio_orders:     (proprioR.data ?? []) as ProprioOrder[],
  } as CollectionDetail;
}

// ─── Recurring Collections ────────────────────────────────────────────────────

export async function getRecurring(sellerId: string): Promise<RecurringConfig> {
  const { data } = await supabase
    .from('recurring_collections')
    .select('*')
    .eq('seller_id', sellerId)
    .single();

  if (!data) {
    return {
      enabled:     false,
      weekdays:    [1, 2, 3, 4, 5],
      hour:        14,
      time_window: 'tarde',
      last_run_at: null,
    };
  }

  return {
    enabled:     data.enabled,
    weekdays:    data.weekdays,
    hour:        data.hour,
    time_window: data.time_window,
    last_run_at: data.last_run_at,
  };
}

export async function upsertRecurring(sellerId: string, cfg: Partial<RecurringConfig>): Promise<RecurringConfig> {
  const payload: Record<string, unknown> = {
    seller_id:  sellerId,
    updated_at: new Date().toISOString(),
  };
  if (cfg.enabled     !== undefined) payload['enabled']     = cfg.enabled;
  if (cfg.weekdays    !== undefined) payload['weekdays']    = cfg.weekdays;
  if (cfg.hour        !== undefined) payload['hour']        = cfg.hour;
  if (cfg.time_window !== undefined) payload['time_window'] = cfg.time_window;

  const { error } = await supabase
    .from('recurring_collections')
    .upsert(payload, { onConflict: 'seller_id' });

  if (error) throw new AppError(500, `Erro ao salvar agendamento: ${error.message}`);
  return getRecurring(sellerId);
}

// ─── Push Token ───────────────────────────────────────────────────────────────

export async function registerPushToken(sellerId: string, token: string, platform: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { seller_id: sellerId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    );
  if (error) throw new AppError(500, `Erro ao registrar token: ${error.message}`);
}

// ─── Integrations Status ──────────────────────────────────────────────────────

export async function getIntegrations(sellerId: string): Promise<{ ml: boolean; shopee: boolean }> {
  const { data } = await supabase
    .from('seller_tokens')
    .select('platform')
    .eq('seller_id', sellerId);

  const platforms = new Set((data ?? []).map(r => r.platform as string));
  return { ml: platforms.has('mercadolivre'), shopee: platforms.has('shopee') };
}

// ─── Pedidos Próprios ─────────────────────────────────────────────────────────

export async function createProprioOrder(
  sellerId: string,
  payload: Omit<ProprioOrder, 'id' | 'seller_id' | 'status' | 'collection_id' | 'created_at' | 'collected_at' | 'delivered_at'>,
): Promise<ProprioOrder> {
  if (!payload.recipient_name || !payload.recipient_phone || !payload.dest_cep || !payload.dest_street || !payload.dest_number || !payload.dest_city || !payload.dest_state) {
    throw new AppError(400, 'Dados do destinatário incompletos');
  }

  const { data, error } = await supabase
    .from('proprio_orders')
    .insert({ ...payload, seller_id: sellerId })
    .select()
    .single();

  if (error || !data) throw new AppError(500, `Erro ao criar pedido: ${error?.message}`);
  return data as ProprioOrder;
}

export async function listProprioOrders(sellerId: string, status?: string): Promise<ProprioOrder[]> {
  let q = supabase
    .from('proprio_orders')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw new AppError(500, `Erro ao listar pedidos: ${error.message}`);
  return (data ?? []) as ProprioOrder[];
}

export async function getProprioOrder(sellerId: string, orderId: string): Promise<ProprioOrder> {
  const { data, error } = await supabase
    .from('proprio_orders')
    .select('*')
    .eq('id', orderId)
    .eq('seller_id', sellerId)
    .single();

  if (error || !data) throw new AppError(404, 'Pedido não encontrado');
  return data as ProprioOrder;
}

export async function cancelProprioOrder(sellerId: string, orderId: string): Promise<void> {
  const order = await getProprioOrder(sellerId, orderId);
  if (order.status !== 'ready_to_ship') {
    throw new AppError(400, 'Só é possível cancelar pedidos prontos para envio');
  }

  const { error } = await supabase
    .from('proprio_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);

  if (error) throw new AppError(500, `Erro ao cancelar: ${error.message}`);
}

// ─── Etiqueta HTML ────────────────────────────────────────────────────────────

export async function getProprioLabelHtml(sellerId: string, orderId: string): Promise<string> {
  const order = await getProprioOrder(sellerId, orderId);

  const { data: profile } = await supabase
    .from('seller_profiles')
    .select('name, phone, street, street_number, neighborhood, city, state, cep')
    .eq('seller_id', sellerId)
    .single();

  const trackingCode = `VLT-${order.id.slice(0, 8).toUpperCase()}`;
  const senderName   = profile?.name ?? 'Remetente';
  const senderAddr   = profile
    ? `${profile.street}, ${profile.street_number} — ${profile.neighborhood ?? ''} ${profile.city}/${profile.state} CEP ${profile.cep ?? ''}`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @page { size: 100mm 150mm; margin: 0; }
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 8mm; color: #000; }
  .header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
  .brand { font-weight: 800; font-size: 18px; letter-spacing: 3px; }
  .tracking { font-family: monospace; font-weight: 700; font-size: 14px; }
  .section { margin: 10px 0; }
  .label { font-size: 9px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; }
  .value { font-size: 12px; margin-top: 2px; line-height: 1.4; }
  .recipient { border: 2px solid #000; padding: 8px; border-radius: 4px; margin-top: 10px; }
  .recipient .value { font-size: 14px; font-weight: 600; }
  .footer { font-size: 8px; color: #888; margin-top: 12px; text-align: center; }
</style></head><body>
  <div class="header">
    <div class="brand">VOLTIC</div>
    <div class="tracking">${trackingCode}</div>
  </div>
  <div class="section">
    <div class="label">Remetente</div>
    <div class="value">${senderName}<br/>${senderAddr}</div>
  </div>
  <div class="recipient">
    <div class="label">Destinatário</div>
    <div class="value">
      <strong>${order.recipient_name}</strong><br/>
      ${order.dest_street}, ${order.dest_number}${order.dest_complement ? ' — ' + order.dest_complement : ''}<br/>
      ${order.dest_neighborhood ? order.dest_neighborhood + ' — ' : ''}${order.dest_city}/${order.dest_state}<br/>
      CEP ${order.dest_cep}<br/>
      Tel ${order.recipient_phone}
    </div>
  </div>
  ${order.weight_grams ? `<div class="section"><span class="label">Peso</span> <span class="value">${order.weight_grams}g</span></div>` : ''}
  ${order.notes ? `<div class="section"><div class="label">Obs</div><div class="value">${order.notes}</div></div>` : ''}
  <div class="footer">Coleta e entrega Voltic — Última Milha</div>
</body></html>`;
}

// ─── Cron: Coletas Recorrentes ────────────────────────────────────────────────

export async function runRecurringCollections(): Promise<{ created: number; skipped: number }> {
  const now = new Date();
  const weekday = now.getDay();
  const hour    = now.getHours();

  const { data: configs } = await supabase
    .from('recurring_collections')
    .select('seller_id, weekdays, hour, time_window, last_run_at')
    .eq('enabled', true);

  if (!configs || configs.length === 0) return { created: 0, skipped: 0 };

  let created = 0;
  let skipped = 0;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (const cfg of configs) {
    const wd:  number[] = cfg.weekdays as number[];
    const hr:  number   = cfg.hour     as number;
    const tw:  string   = cfg.time_window as string;
    const sid: string   = cfg.seller_id   as string;

    if (!wd.includes(weekday)) { skipped++; continue; }
    if (hr !== hour)           { skipped++; continue; }
    if (cfg.last_run_at && new Date(cfg.last_run_at as string) >= todayStart) { skipped++; continue; }

    try {
      const ready = await getReadyToCollect(sid);
      if (ready.total === 0) {
        await supabase
          .from('recurring_collections')
          .update({ last_run_at: now.toISOString() })
          .eq('seller_id', sid);
        skipped++;
        continue;
      }
      await quickCollect(sid, tw);
      await supabase
        .from('recurring_collections')
        .update({ last_run_at: now.toISOString() })
        .eq('seller_id', sid);
      created++;
    } catch (err) {
      logger.error({ sellerId: sid, err }, 'Erro ao gerar coleta recorrente');
      skipped++;
    }
  }

  logger.info({ created, skipped }, 'Recurring collections run');
  return { created, skipped };
}

// ─── Order Detail (tracking individual) ──────────────────────────────────────

export interface OrderDetail {
  id:                string;
  platform:          string;
  external_order_id: string;
  status:            string;
  tracking_number:   string | null;
  polo:              string | null;
  created_at:        string;
  collected_at:      string | null;
  collector_id:      string | null;
  collector_location: {
    lat: number; lng: number; heading: number | null; speed: number | null; updated_at: string;
  } | null;
  // Informações do comprador extraídas do raw_payload
  buyer_name:   string | null;
  buyer_city:   string | null;
}

export async function getOrderDetailService(
  sellerId: string,
  orderId: string,
): Promise<OrderDetail> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, platform, external_order_id, status, tracking_number, polo, created_at, collected_at, collector_id, raw_payload')
    .eq('id', orderId)
    .eq('seller_id', sellerId)
    .single();

  if (error || !order) throw new AppError(404, 'Pedido não encontrado');

  // Localização ao vivo do coletor / entregador
  let collectorLocation: OrderDetail['collector_location'] = null;
  if (order.collector_id) {
    const { data: loc } = await supabase
      .from('collector_locations')
      .select('lat, lng, heading, speed, updated_at')
      .eq('collector_id', order.collector_id)
      .single();
    if (loc) collectorLocation = loc;
  }

  // Extrai nome e cidade do comprador do payload bruto ML/Shopee
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = order.raw_payload as any;
  const buyerName: string | null =
    payload?.buyer?.nickname
    ?? payload?.buyer_user?.display_name
    ?? payload?.shipping?.receiver_name
    ?? null;
  const buyerCity: string | null =
    payload?.shipping?.receiver_address?.city?.name
    ?? payload?.shipping?.address?.city
    ?? null;

  return {
    id:                 order.id,
    platform:           order.platform,
    external_order_id:  order.external_order_id,
    status:             order.status,
    tracking_number:    order.tracking_number,
    polo:               order.polo,
    created_at:         order.created_at,
    collected_at:       order.collected_at,
    collector_id:       order.collector_id,
    collector_location: collectorLocation,
    buyer_name:         buyerName,
    buyer_city:         buyerCity,
  };
}
