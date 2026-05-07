import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import {
  getReadyToCollect,
  quickCollect,
  getCollectionDetail,
  getRecurring,
  upsertRecurring,
  registerPushToken,
  getIntegrations,
  createProprioOrder,
  listProprioOrders,
  getProprioOrder,
  cancelProprioOrder,
  getProprioLabelHtml,
  getHubQrHtml,
  runRecurringCollections,
  getOrderDetailService,
  getCollectionTimeline,
} from '../services/sellerExtraService';
import { AppError } from '../middlewares/errorHandler';
import { supabase } from '../lib/supabase';

// ─── Quick Collect ────────────────────────────────────────────────────────────

export async function readyToCollectHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const ready = await getReadyToCollect(req.sellerId!);
    res.json({ success: true, data: ready });
  } catch (err) { next(err); }
}

export async function quickCollectHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { time_window } = (req.body ?? {}) as { time_window?: string };
    const result = await quickCollect(req.sellerId!, time_window);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// ─── Coleta Detalhe ───────────────────────────────────────────────────────────

export async function collectionDetailHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id || typeof id !== 'string') throw new AppError(400, 'id obrigatório');
    const data = await getCollectionDetail(req.sellerId!, id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function collectionTimelineHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id || typeof id !== 'string') throw new AppError(400, 'id obrigatório');
    const data = await getCollectionTimeline(req.sellerId!, id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── Recurring ────────────────────────────────────────────────────────────────

export async function getRecurringHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await getRecurring(req.sellerId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function upsertRecurringHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await upsertRecurring(req.sellerId!, req.body ?? {});
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── Push Token ───────────────────────────────────────────────────────────────

export async function registerPushTokenHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { token, platform } = req.body as { token?: string; platform?: string };
    if (!token || !platform) throw new AppError(400, 'token e platform são obrigatórios');
    await registerPushToken(req.sellerId!, token, platform);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export async function integrationsHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await getIntegrations(req.sellerId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── Pedidos Próprios ─────────────────────────────────────────────────────────

export async function createProprioHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await createProprioOrder(req.sellerId!, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function listProprioHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const status = req.query['status'] as string | undefined;
    const data = await listProprioOrders(req.sellerId!, status);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getProprioHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id || typeof id !== 'string') throw new AppError(400, 'id obrigatório');
    const data = await getProprioOrder(req.sellerId!, id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function cancelProprioHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id || typeof id !== 'string') throw new AppError(400, 'id obrigatório');

    const { reason } = req.body as { reason?: string };

    // Verifica status atual
    const { data: order } = await supabase
      .from('proprio_orders')
      .select('status')
      .eq('id', id)
      .eq('seller_id', req.sellerId!)
      .maybeSingle();

    if (!order) throw new AppError(404, 'Pedido não encontrado');

    const requireReason = ['collected', 'shipped', 'delivered'];
    if (requireReason.includes(order.status as string) && !reason?.trim()) {
      throw new AppError(400, `Pedido já ${order.status === 'delivered' ? 'entregue' : 'coletado'}. Informe o motivo do cancelamento.`);
    }

    await cancelProprioOrder(req.sellerId!, id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function proprioLabelHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id || typeof id !== 'string') throw new AppError(400, 'id obrigatório');
    const html = await getProprioLabelHtml(req.sellerId!, id);
    // Se query param ?print=1 retorna HTML direto para impressão
    if (req.query['print'] === '1') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }
    res.json({ success: true, data: { html } });
  } catch (err) { next(err); }
}

// ─── Hub QR Code (admin/público) ─────────────────────────────────────────────

export async function hubQrHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const hubId = typeof req.query['hub'] === 'string' ? req.query['hub'].toUpperCase() : 'SP01';
    const html  = await getHubQrHtml(hubId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
}

// ─── Cron Trigger (admin/internal) ────────────────────────────────────────────

export async function runRecurringHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const secret = req.headers['x-cron-secret'];
    if (!process.env['CRON_SECRET'] || secret !== process.env['CRON_SECRET']) {
      throw new AppError(401, 'Cron secret inválido');
    }
    const result = await runRecurringCollections();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// ─── Order Detail ─────────────────────────────────────────────────────────────

export async function orderDetailHandler(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['orderId'];
    if (!id || typeof id !== 'string') throw new AppError(400, 'orderId obrigatório');
    const data = await getOrderDetailService(req.sellerId!, id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ── Mapa de pedidos ──────────────────────────────────────────────────────────

export async function ordersMapHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.sellerId!;

    // Busca pedidos recentes do seller
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, tracking_number, platform, status, delivery_cep, raw_payload, collector_id')
      .eq('seller_id', sellerId)
      .in('status', ['ready_to_ship', 'shipped', 'delivered', 'occurrence', 'collected'])
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new AppError(500, error.message);

    const orderIds = (orders ?? []).map(o => o.id);

    // Coordenadas dos últimos scans por pedido
    const { data: scans } = await supabase
      .from('scans')
      .select('order_id, lat, lng, scan_type, scanned_at')
      .in('order_id', orderIds)
      .not('lat', 'is', null)
      .order('scanned_at', { ascending: false });

    // Comprovantes de entrega
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('order_id, photo_url, recipient_name')
      .in('order_id', orderIds);

    // Ocorrências
    const { data: occurrences } = await supabase
      .from('delivery_occurrences')
      .select('order_id, photo_url, reason')
      .in('order_id', orderIds);

    // Localização atual dos coletores para pedidos em trânsito
    const collectorIds = [...new Set(
      (orders ?? []).filter(o => o.collector_id && ['shipped', 'collected'].includes(o.status as string))
        .map(o => o.collector_id as string),
    )];
    const { data: locations } = collectorIds.length > 0
      ? await supabase.from('collector_locations').select('collector_id, lat, lng').in('collector_id', collectorIds)
      : { data: [] };

    // Indexar por order_id (pega o mais recente de cada)
    const scanMap = new Map<string, { lat: number; lng: number }>();
    (scans ?? []).forEach(s => {
      if (!scanMap.has(s.order_id) && s.lat && s.lng) scanMap.set(s.order_id, { lat: Number(s.lat), lng: Number(s.lng) });
    });
    const deliveryMap  = new Map((deliveries  ?? []).map((d: any) => [d.order_id, d]));
    const occurrenceMap= new Map((occurrences ?? []).map((o: any) => [o.order_id, o]));
    const locationMap  = new Map((locations   ?? []).map((l: any) => [l.collector_id, l]));

    const items = (orders ?? []).map(o => {
      let lat: number | null = null;
      let lng: number | null = null;

      // Prioridade: scan real → localização do coletor em trânsito
      if (scanMap.has(o.id)) {
        ({ lat, lng } = scanMap.get(o.id)!);
      } else if (o.collector_id && locationMap.has(o.collector_id as string)) {
        const loc = locationMap.get(o.collector_id as string) as any;
        lat = Number(loc.lat);
        lng = Number(loc.lng);
      }

      const delivery   = deliveryMap.get(o.id);
      const occurrence = occurrenceMap.get(o.id);

      return {
        id:                o.id,
        tracking_number:   o.tracking_number,
        platform:          o.platform,
        status:            o.status,
        delivery_cep:      o.delivery_cep,
        lat,
        lng,
        photo_url:         (delivery as any)?.photo_url ?? (occurrence as any)?.photo_url ?? null,
        recipient_name:    (delivery as any)?.recipient_name ?? null,
        occurrence_reason: (occurrence as any)?.reason ?? null,
      };
    });

    res.json({ success: true, data: { items } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
