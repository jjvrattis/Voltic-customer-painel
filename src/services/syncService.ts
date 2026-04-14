import axios from 'axios';
import { supabase } from '../lib/supabase';
import { generateShopeeSign } from './shopeeService';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';
import { SellerToken, Order } from '../types';

const ML_BASE_URL = 'https://api.mercadolibre.com';
const SHOPEE_BASE_URL = 'https://partner.shopeemobile.com';

async function getToken(sellerId: string, platform: string): Promise<SellerToken> {
  const { data, error } = await supabase
    .from('seller_tokens')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('platform', platform)
    .single();

  if (error || !data) throw new AppError(404, `Token not found for seller ${sellerId}`);

  const token = data as SellerToken;
  if (new Date(token.expires_at) <= new Date()) {
    throw new AppError(401, 'Token expired. Call /refresh first.');
  }
  return token;
}

// ── Mercado Livre ────────────────────────────────────────────────────────────

interface MLOrder {
  id: number;
  shipping: { id: number } | null;
  order_items: Array<{ item: { id: string; title: string } }>;
  seller: { id: number };
}

interface MLOrdersResponse {
  results: MLOrder[];
}

interface MLShipment {
  id: number;
  tracking_number: string | null;
}

async function fetchTrackingNumber(
  shippingId: number,
  accessToken: string,
): Promise<string | null> {
  try {
    const { data } = await axios.get<MLShipment>(
      `${ML_BASE_URL}/shipments/${shippingId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data.tracking_number ?? null;
  } catch {
    return null;
  }
}

export async function syncMLOrders(sellerId: string): Promise<number> {
  const token = await getToken(sellerId, 'mercadolivre');

  const { data: response } = await axios.get<MLOrdersResponse>(
    `${ML_BASE_URL}/orders/search`,
    {
      params: {
        seller: sellerId,
        'order.status': 'paid',
        limit: 50,
        sort: 'date_desc',
      },
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );

  const orders = response.results;
  if (!orders.length) return 0;

  // Busca tracking numbers reais via /shipments/{id} em paralelo
  const trackingMap = new Map<number, string | null>();
  await Promise.all(
    orders
      .filter((o) => o.shipping?.id)
      .map(async (o) => {
        const tracking = await fetchTrackingNumber(o.shipping!.id, token.access_token);
        trackingMap.set(o.shipping!.id, tracking);
      }),
  );

  const upsertRows = orders.map((o) => ({
    platform: 'mercadolivre' as const,
    external_order_id: String(o.id),
    seller_id: sellerId,
    tracking_number: o.shipping?.id ? (trackingMap.get(o.shipping.id) ?? null) : null,
    status: 'ready_to_ship' as const,
    raw_payload: o as unknown as Record<string, unknown>,
  }));

  const { error } = await supabase
    .from('orders')
    .upsert(upsertRows, { onConflict: 'platform,external_order_id' });

  if (error) throw new AppError(500, `Supabase upsert error: ${error.message}`);
  logger.info({ sellerId, count: orders.length }, 'ML orders synced');
  return orders.length;
}

// ── Shopee ───────────────────────────────────────────────────────────────────

interface ShopeeOrder {
  order_sn: string;
  tracking_no: string;
  order_status: string;
}

interface ShopeeOrderListResponse {
  response: {
    order_list: Array<{ order_sn: string }>;
    more: boolean;
  };
  error: string;
  message: string;
}

interface ShopeeOrderDetailResponse {
  response: {
    order_list: ShopeeOrder[];
  };
  error: string;
  message: string;
}

export async function syncShopeeOrders(sellerId: string): Promise<number> {
  const token = await getToken(sellerId, 'shopee');
  const partnerId = process.env.SHOPEE_PARTNER_ID ?? '';
  const partnerKey = process.env.SHOPEE_PARTNER_KEY ?? '';

  const listPath = '/api/v2/order/get_order_list';
  const timestamp = Math.floor(Date.now() / 1000);
  const listSign = generateShopeeSign(
    partnerId,
    listPath,
    timestamp,
    token.access_token,
    sellerId,
    partnerKey,
  );

  const { data: listResponse } = await axios.get<ShopeeOrderListResponse>(
    `${SHOPEE_BASE_URL}${listPath}`,
    {
      params: {
        partner_id: partnerId,
        timestamp,
        sign: listSign,
        access_token: token.access_token,
        shop_id: sellerId,
        order_status: 'READY_TO_SHIP',
        page_size: 50,
        time_range_field: 'create_time',
        time_from: Math.floor(Date.now() / 1000) - 7 * 24 * 3600,
        time_to: Math.floor(Date.now() / 1000),
      },
    },
  );

  if (listResponse.error) {
    throw new AppError(400, `Shopee error: ${listResponse.message}`);
  }

  const orderSns = listResponse.response.order_list.map((o) => o.order_sn);
  if (!orderSns.length) return 0;

  const detailPath = '/api/v2/order/get_order_detail';
  const detailTimestamp = Math.floor(Date.now() / 1000);
  const detailSign = generateShopeeSign(
    partnerId,
    detailPath,
    detailTimestamp,
    token.access_token,
    sellerId,
    partnerKey,
  );

  const { data: detailResponse } = await axios.get<ShopeeOrderDetailResponse>(
    `${SHOPEE_BASE_URL}${detailPath}`,
    {
      params: {
        partner_id: partnerId,
        timestamp: detailTimestamp,
        sign: detailSign,
        access_token: token.access_token,
        shop_id: sellerId,
        order_sn_list: orderSns.join(','),
      },
    },
  );

  if (detailResponse.error) {
    throw new AppError(400, `Shopee detail error: ${detailResponse.message}`);
  }

  const upsertRows = detailResponse.response.order_list.map((o) => ({
    platform: 'shopee' as const,
    external_order_id: o.order_sn,
    seller_id: sellerId,
    tracking_number: o.tracking_no ?? null,
    status: 'ready_to_ship' as const,
    raw_payload: o as unknown as Record<string, unknown>,
  }));

  const { error } = await supabase
    .from('orders')
    .upsert(upsertRows, { onConflict: 'platform,external_order_id' });

  if (error) throw new AppError(500, `Supabase upsert error: ${error.message}`);
  logger.info({ sellerId, count: upsertRows.length }, 'Shopee orders synced');
  return upsertRows.length;
}

// ── Orders list + collect ────────────────────────────────────────────────────

export async function listOrders(filters: {
  status?: string;
  platform?: string;
  polo?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Order[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('orders').select('*', { count: 'exact' });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.platform) query = query.eq('platform', filters.platform);
  if (filters.polo) query = query.eq('polo', filters.polo);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new AppError(500, `Supabase query error: ${error.message}`);
  return { items: (data ?? []) as Order[], total: count ?? 0 };
}

export async function collectOrder(
  id: string,
  body: { collectedAt: string; collectorId: string; trackingScanned: boolean },
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'collected',
      collected_at: body.collectedAt,
      collector_id: body.collectorId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError(500, `Supabase update error: ${error.message}`);
  if (!data) throw new AppError(404, 'Order not found');

  logger.info({ orderId: id, collectorId: body.collectorId }, 'Order collected');
  return data as Order;
}
