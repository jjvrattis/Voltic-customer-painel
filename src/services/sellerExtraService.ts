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

// ── Gera código de rastreio único VLTC-XXXXXXXX ──────────────────────────────
function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 (confusos visualmente)
  let code = 'VLTC-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createProprioOrder(
  sellerId: string,
  payload: Omit<ProprioOrder, 'id' | 'seller_id' | 'status' | 'collection_id' | 'created_at' | 'collected_at' | 'delivered_at' | 'tracking_number'>,
): Promise<ProprioOrder> {
  if (!payload.recipient_name || !payload.recipient_phone || !payload.dest_cep || !payload.dest_street || !payload.dest_number || !payload.dest_city || !payload.dest_state) {
    throw new AppError(400, 'Dados do destinatário incompletos');
  }

  // Gera tracking code único (retry se colidir)
  let tracking_number = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateTrackingCode();
    const { data: existing } = await supabase
      .from('proprio_orders')
      .select('id')
      .eq('tracking_number', candidate)
      .maybeSingle();
    if (!existing) { tracking_number = candidate; break; }
  }
  if (!tracking_number) throw new AppError(500, 'Falha ao gerar código de rastreio');

  const { data, error } = await supabase
    .from('proprio_orders')
    .insert({ ...payload, seller_id: sellerId, tracking_number })
    .select()
    .single();

  if (error || !data) throw new AppError(500, `Erro ao criar pedido: ${error?.message}`);

  const order = data as ProprioOrder;

  // Cria entrada em orders para aparecer no fluxo do entregador
  await supabase.from('orders').insert({
    seller_id:          sellerId,
    platform:           'proprio' as never,
    external_order_id:  tracking_number,
    tracking_number:    tracking_number,
    status:             'ready_to_ship',
    delivery_cep:       payload.dest_cep.replace(/\D/g, '').slice(0, 5),
    raw_payload: {
      proprio_order_id: order.id,
      recipient_name:   payload.recipient_name,
      recipient_phone:  payload.recipient_phone,
      address: {
        full_address: `${payload.dest_street}, ${payload.dest_number}`,
        complement:   payload.dest_complement ?? null,
        neighborhood: payload.dest_neighborhood ?? null,
        city:         payload.dest_city,
        state:        payload.dest_state,
        zip_code:     payload.dest_cep,
      },
    },
  });

  // Auto-coleta: cria collection_request automaticamente se não há nenhuma ativa
  try {
    const { data: activeColeta } = await supabase
      .from('collection_requests')
      .select('id')
      .eq('seller_id', sellerId)
      .in('status', ['pending', 'accepted', 'en_route', 'arrived'])
      .limit(1)
      .maybeSingle();

    if (!activeColeta) {
      // Busca perfil do seller para o endereço de coleta
      const { data: profile } = await supabase
        .from('seller_profiles')
        .select('name, street, street_number, complement, neighborhood, city, state, cep, location_type, floor_unit, doorman_name, intercom_code, access_notes')
        .eq('seller_id', sellerId)
        .single();

      const { data: newColeta } = await supabase.from('collection_requests').insert({
        seller_id:               sellerId,
        ecommerce_proprio_count: 1,
        ecommerce_count:         0,
        ml_count:                0,
        shopee_count:            0,
        ml_order_ids:            [],
        shopee_order_ids:        [],
        time_window:             'qualquer',
        status:                  'pending',
        address_snapshot: profile ? {
          street:        profile.street,
          street_number: profile.street_number,
          complement:    profile.complement,
          neighborhood:  profile.neighborhood,
          city:          profile.city,
          state:         profile.state,
          cep:           profile.cep,
          location_type: profile.location_type,
          floor_unit:    profile.floor_unit,
          doorman_name:  profile.doorman_name,
          intercom_code: profile.intercom_code,
          access_notes:  profile.access_notes,
        } : null,
      }).select('id').single();

      if (newColeta) {
        await supabase.from('proprio_orders')
          .update({ collection_id: newColeta.id })
          .eq('id', order.id);
      }
    } else {
      // Incrementa o contador e vincula o pedido à coleta existente
      await Promise.all([
        supabase.rpc('increment_proprio_count', { coleta_id: activeColeta.id }),
        supabase.from('proprio_orders').update({ collection_id: activeColeta.id }).eq('id', order.id),
      ]);
    }
  } catch { /* auto-coleta falhou silenciosamente — seller pode solicitar manualmente */ }

  return order;
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

// ─── Etiqueta HTML (80mm — impressora térmica) ────────────────────────────────

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export async function getProprioLabelHtml(sellerId: string, orderId: string): Promise<string> {
  const QRCode = (await import('qrcode')).default;

  const order = await getProprioOrder(sellerId, orderId);

  const { data: profile } = await supabase
    .from('seller_profiles')
    .select('name, phone, street, street_number, neighborhood, city, state, cep')
    .eq('seller_id', sellerId)
    .single();

  const trackingCode = (order as ProprioOrder & { tracking_number?: string }).tracking_number
    ?? `VLTC-${order.id.slice(0,8).toUpperCase()}`;

  const qrSvg      = await QRCode.toString(trackingCode, {
    type: 'svg', width: 300, margin: 3,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  const senderName = esc(profile?.name ?? 'Remetente');
  const senderAddr = profile
    ? esc(`${profile.street}, ${profile.street_number} — ${profile.neighborhood ?? ''} ${profile.city}/${profile.state}`)
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px; margin: 0; padding: 4mm; color: #000;
    width: 80mm;
  }
  .top { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
  .brand { font-weight: 900; font-size: 22px; letter-spacing: 4px; }
  .qr { width: 38mm; height: 38mm; flex-shrink: 0; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .tracking { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-align: center; border: 2px solid #000; padding: 3px 6px; margin-bottom: 6px; }
  .block { margin-bottom: 6px; }
  .lbl { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; }
  .val { font-size: 11px; line-height: 1.4; margin-top: 1px; }
  .dest-box { border: 2px solid #000; padding: 5px; margin-bottom: 6px; }
  .dest-name { font-size: 14px; font-weight: 700; }
  .divider { border-top: 1px dashed #999; margin: 5px 0; }
  .footer { font-size: 8px; text-align: center; color: #888; margin-top: 4px; }
  @media print { body { padding: 2mm; } }
</style></head><body>

  <div class="top">
    <span class="brand">VOLTIC</span>
    <div class="qr">${qrSvg}</div>
  </div>

  <div class="tracking">${esc(trackingCode)}</div>

  <div class="block">
    <div class="lbl">Remetente</div>
    <div class="val">${senderName}<br/>${senderAddr}</div>
  </div>

  <div class="divider"></div>

  <div class="dest-box">
    <div class="lbl">Destinatário</div>
    <div class="dest-name">${esc(order.recipient_name)}</div>
    <div class="val">
      ${esc(order.dest_street)}, ${esc(order.dest_number)}${order.dest_complement ? ' — ' + esc(order.dest_complement) : ''}<br/>
      ${order.dest_neighborhood ? esc(order.dest_neighborhood) + ' — ' : ''}${esc(order.dest_city)}/${esc(order.dest_state)}<br/>
      CEP ${esc(order.dest_cep)}<br/>
      Tel ${esc(order.recipient_phone)}
    </div>
  </div>

  ${order.weight_grams ? `<div class="block"><span class="lbl">Peso: </span><span class="val">${order.weight_grams}g</span></div>` : ''}
  ${order.notes ? `<div class="block"><div class="lbl">Obs</div><div class="val">${esc(order.notes)}</div></div>` : ''}

  <div class="footer">Coleta e entrega Voltic Logística — Última Milha</div>
</body></html>`;
}

// ─── QR Code do Hub (estático, imprimir e colar na parede) ───────────────────

export async function getHubQrHtml(hubId = 'SP01'): Promise<string> {
  const QRCode  = (await import('qrcode')).default;
  const hubCode = `VLTC-HUB-${hubId}`;
  const qrSvg   = await QRCode.toString(hubCode, { type: 'svg', width: 300, margin: 2 });

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 20mm; }
  body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; }
  .qr svg { width: 200px; height: 200px; }
  h1 { font-size: 32px; letter-spacing: 6px; margin: 12px 0 4px; }
  h2 { font-size: 18px; letter-spacing: 3px; color: #555; margin: 0; }
  p  { font-size: 12px; color: #888; margin-top: 16px; text-align: center; max-width: 280px; line-height: 1.6; }
  .code { font-family: monospace; font-size: 20px; font-weight: 700; letter-spacing: 3px; margin: 8px 0; border: 2px solid #000; padding: 6px 16px; }
</style></head><body>
  <h2>VOLTIC LOGÍSTICA</h2>
  <h1>HUB ${hubId}</h1>
  <div class="code">${hubCode}</div>
  <div class="qr">${qrSvg}</div>
  <p>Bipe este QR code no app do entregador ao chegar ou sair do hub para registrar a movimentação dos pacotes.</p>
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

// ─── Timeline da coleta ──────────────────────────────────────────────────────

export interface TimelineEvent {
  type:           string;
  label:          string;
  timestamp:      string | null;
  done:           boolean;
  photo_url?:     string | null;
  recipient_name?:string | null;
}

export interface CollectionTimeline {
  events:         TimelineEvent[];
  orders:         { id: string; tracking_number: string | null; platform: string; status: string }[];
  collector_name: string | null;
}

export async function getCollectionTimeline(
  sellerId: string,
  collectionId: string,
): Promise<CollectionTimeline> {
  const { data: col, error } = await supabase
    .from('collection_requests')
    .select('*')
    .eq('id', collectionId)
    .eq('seller_id', sellerId)
    .single();
  if (error || !col) throw new AppError(404, 'Coleta não encontrada');

  // Nome do coletor
  const collectorName = col.agent_id
    ? (await supabase.from('collectors').select('name').eq('id', col.agent_id).single()).data?.name ?? null
    : null;

  // Pedidos desta coleta (próprios + ML via ml_order_ids)
  const { data: proprioOrders } = await supabase
    .from('proprio_orders')
    .select('id, tracking_number, status')
    .eq('collection_id', collectionId);

  const mlIds: string[] = Array.isArray(col.ml_order_ids) ? col.ml_order_ids : [];
  const { data: mlOrders } = mlIds.length > 0
    ? await supabase.from('orders').select('id, tracking_number, platform, status').in('external_order_id', mlIds)
    : { data: [] };

  // IDs da tabela orders vinculados a esta coleta (próprios via tracking)
  const proprioTrackings = (proprioOrders ?? []).map(o => o.tracking_number).filter(Boolean);
  const { data: ordersByTracking } = proprioTrackings.length > 0
    ? await supabase.from('orders').select('id, tracking_number, platform, status').in('tracking_number', proprioTrackings)
    : { data: [] };
  const orderIdsByColeta = (ordersByTracking ?? []).map(o => o.id);

  // Scans: por collection_request_id OU por order_id dos pedidos desta coleta
  const scansByColId = await supabase
    .from('scans')
    .select('scan_type, scanned_at, collection_request_id, order_id')
    .eq('collection_request_id', collectionId)
    .order('scanned_at', { ascending: true });

  const scansByOrderId = orderIdsByColeta.length > 0
    ? await supabase
        .from('scans')
        .select('scan_type, scanned_at, collection_request_id, order_id')
        .in('order_id', orderIdsByColeta)
        .order('scanned_at', { ascending: true })
    : { data: [] };

  // Manifesto desta coleta
  const { data: manifest } = await supabase
    .from('manifests')
    .select('id, created_at, package_count')
    .eq('collection_request_id', collectionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const allScans = [...(scansByColId.data ?? []), ...(scansByOrderId.data ?? [])];
  const hubScan     = allScans.find(s => s.scan_type === 'hub_arrival');
  const delivPickup = allScans.find(s => s.scan_type === 'delivery_pickup');

  // Comprovante de entrega
  const deliveryOrderIds = [...orderIdsByColeta, ...(mlOrders ?? []).map((o: any) => o.id)];
  const { data: deliveries } = deliveryOrderIds.length > 0
    ? await supabase
        .from('deliveries')
        .select('id, photo_url, recipient_name, delivered_at, order_id')
        .in('order_id', deliveryOrderIds)
        .order('delivered_at', { ascending: false })
        .limit(1)
    : { data: [] };
  const proof = deliveries?.[0] ?? null;

  const allOrders = [
    ...(proprioOrders ?? []).map(o => ({ id: o.id, tracking_number: o.tracking_number, platform: 'proprio', status: o.status as string })),
    ...(mlOrders ?? []).map((o: any) => ({ id: o.id, tracking_number: o.tracking_number, platform: o.platform, status: o.status as string })),
  ];
  const isDelivered = allOrders.some(o => o.status === 'delivered') || !!proof;

  const events: TimelineEvent[] = [
    { type: 'requested', label: 'Coleta solicitada',    timestamp: col.requested_at,  done: true },
    { type: 'accepted',  label: 'Coletor a caminho',    timestamp: col.accepted_at,   done: !!col.accepted_at  },
    { type: 'arrived',   label: 'Coletor no local',     timestamp: col.arrived_at,    done: !!col.arrived_at   },
    { type: 'collected', label: 'Pacotes coletados',    timestamp: col.collected_at,  done: !!col.collected_at },
    { type: 'hub',    label: 'Chegou ao Hub Voltic', timestamp: hubScan?.scanned_at ?? null,    done: !!hubScan    },
    { type: 'pickup', label: 'Saiu para entrega',    timestamp: delivPickup?.scanned_at ?? null, done: !!delivPickup },
    {
      type: 'delivered', label: 'Entregue',
      timestamp: proof?.delivered_at ?? null,
      done: isDelivered,
      photo_url:      proof?.photo_url ?? null,
      recipient_name: proof?.recipient_name ?? null,
    },
  ];

  return { events, orders: allOrders, collector_name: collectorName };
}
