import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { AppError } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function collectorLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone, pin } = req.body as { phone?: string; pin?: string };
    if (!phone || !pin) throw new AppError(400, 'Telefone e PIN são obrigatórios');
    if (!/^\d{4}$/.test(pin)) throw new AppError(400, 'PIN deve ter 4 dígitos');

    const cleanPhone = phone.replace(/\D/g, '');

    const { data: collector, error } = await supabase
      .from('collectors')
      .select('id, name, pin_hash, active')
      .eq('phone', cleanPhone)
      .single();

    if (error || !collector)  throw new AppError(401, 'Telefone ou PIN inválidos');
    if (!collector.active)    throw new AppError(403, 'Coletor inativo');
    if (!collector.pin_hash)  throw new AppError(401, 'PIN não cadastrado — contate o admin');

    const valid = await bcrypt.compare(pin, collector.pin_hash);
    if (!valid) throw new AppError(401, 'Telefone ou PIN inválidos');

    const sessionToken = crypto.randomUUID();
    await supabase
      .from('collectors')
      .update({ session_token: sessionToken })
      .eq('id', collector.id);

    const body: ApiResponse<{ token: string; collector: { id: string; name: string } }> = {
      success: true,
      data: { token: sessionToken, collector: { id: collector.id, name: collector.name } },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

// ── Coleta (Fase 1) ──────────────────────────────────────────────────────────

export async function todayCollections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const dow = new Date().getDay();

    const { data: assignments, error: aErr } = await supabase
      .from('collector_assignments')
      .select('seller_id, days_of_week, active')
      .eq('collector_id', collectorId)
      .eq('active', true);
    if (aErr) throw new AppError(500, aErr.message);

    const sellerIds = (assignments ?? [])
      .filter(a => (a.days_of_week as number[]).includes(dow))
      .map(a => a.seller_id);

    if (sellerIds.length === 0) {
      res.json({ success: true, data: { items: [] } } satisfies ApiResponse);
      return;
    }

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: requests, error: rErr } = await supabase
      .from('collection_requests')
      .select('*')
      .in('seller_id', sellerIds)
      .in('status', ['pending', 'accepted', 'en_route', 'arrived', 'collected'])
      .gte('requested_at', cutoff)
      .order('requested_at', { ascending: true });
    if (rErr) throw new AppError(500, rErr.message);

    const sellerProfiles = await supabase
      .from('seller_profiles')
      .select('seller_id, name, phone, cep, street, street_number, complement, neighborhood, city, state, location_type, access_notes')
      .in('seller_id', sellerIds);

    const profileMap = new Map(
      (sellerProfiles.data ?? []).map(p => [p.seller_id, p]),
    );

    const items = (requests ?? []).map(r => ({
      ...r,
      seller_profile: profileMap.get(r.seller_id) ?? null,
    }));

    res.json({ success: true, data: { items } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

export async function updateCollectionStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    const allowed = ['accepted', 'en_route', 'arrived', 'collected', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      throw new AppError(400, `status deve ser um de: ${allowed.join(', ')}`);
    }

    const stamp: Record<string, string> = {
      accepted:  'accepted_at',
      en_route:  'en_route_at',
      arrived:   'arrived_at',
      collected: 'collected_at',
    };

    const update: Record<string, unknown> = {
      status,
      agent_id: collectorId,
    };
    if (stamp[status]) update[stamp[status]] = new Date().toISOString();

    const { error } = await supabase
      .from('collection_requests')
      .update(update)
      .eq('id', id);
    if (error) throw new AppError(500, error.message);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Scans (todas as fases) ───────────────────────────────────────────────────

export async function registerScan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const { tracking_code, scan_type, collection_request_id, lat, lng } = req.body as {
      tracking_code?: string;
      scan_type?: string;
      collection_request_id?: string;
      lat?: number;
      lng?: number;
    };

    if (!tracking_code) throw new AppError(400, 'tracking_code obrigatório');
    const allowed = ['pickup', 'hub_arrival', 'delivery_pickup', 'delivered'];
    if (!scan_type || !allowed.includes(scan_type)) {
      throw new AppError(400, `scan_type deve ser um de: ${allowed.join(', ')}`);
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('tracking_number', tracking_code)
      .maybeSingle();

    const { data: scan, error } = await supabase
      .from('scans')
      .insert({
        collector_id: collectorId,
        tracking_code,
        scan_type,
        order_id: order?.id ?? null,
        collection_request_id: collection_request_id ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
      })
      .select()
      .single();
    if (error) throw new AppError(500, error.message);

    if (order) {
      // Bloqueia re-scan de pedidos já finalizados na fase de entrega
      if (scan_type === 'delivery_pickup' && ['delivered', 'occurrence'].includes(order.status as string)) {
        throw new AppError(400, 'Este pedido já foi entregue ou tem ocorrência registrada');
      }

      const newStatus =
        scan_type === 'pickup'           ? 'collected' :
        scan_type === 'hub_arrival'      ? 'collected' :
        scan_type === 'delivery_pickup'  ? 'shipped'   :
        scan_type === 'delivered'        ? 'delivered' : null;

      if (newStatus) {
        const update: Record<string, unknown> = { status: newStatus, collector_id: collectorId };
        if (scan_type === 'pickup')    update['collected_at']  = new Date().toISOString();
        if (scan_type === 'delivered') update['delivered_at']  = new Date().toISOString();
        await supabase.from('orders').update(update).eq('id', order.id);
      }
    }

    res.json({ success: true, data: { scan, order_found: !!order } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Entregas (Fase 3) ────────────────────────────────────────────────────────

export async function todayDeliveries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cepZones = req.collectorCepZones ?? [];
    if (cepZones.length === 0) {
      res.json({ success: true, data: { items: [] } } satisfies ApiResponse);
      return;
    }

    // orders é a fonte de verdade para todos os tipos (ML, Shopee, próprio)
    // próprios são inseridos em orders ao criar o pedido com endereço completo
    const orFilters = cepZones.map(z => `delivery_cep.like.${z}%`).join(',');

    const cutoffHistory = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('orders')
      .select('id, platform, external_order_id, tracking_number, status, delivery_cep, raw_payload, created_at')
      .in('status', ['shipped', 'delivered', 'occurrence'])
      .gte('created_at', cutoffHistory)
      .not('delivery_cep', 'is', null);
    query = query.or(orFilters);

    const { data, error } = await query.order('created_at', { ascending: true }).limit(200);

    if (error) throw new AppError(500, error.message);

    const items = (data ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    res.json({ success: true, data: { items } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

export async function completeDelivery(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const { id } = req.params;
    const { recipient_name, recipient_document, photo_url, notes } = req.body as {
      recipient_name?: string;
      recipient_document?: string;
      photo_url?: string;
      notes?: string;
    };

    if (!recipient_name) throw new AppError(400, 'recipient_name obrigatório');

    const now = new Date().toISOString();

    // Verifica se é um pedido próprio
    const { data: proprio } = await supabase
      .from('proprio_orders')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (proprio) {
      const { error: pErr } = await supabase
        .from('proprio_orders')
        .update({ status: 'delivered', delivered_at: now })
        .eq('id', id);
      if (pErr) throw new AppError(500, pErr.message);

      await supabase.from('deliveries').upsert(
        { order_id: id, collector_id: collectorId, recipient_name, recipient_document: recipient_document ?? null, photo_url: photo_url ?? null, notes: notes ?? null, delivered_at: now },
        { onConflict: 'order_id' },
      );

      res.json({ success: true } satisfies ApiResponse);
      return;
    }

    const { error: dErr } = await supabase
      .from('deliveries')
      .upsert(
        { order_id: id, collector_id: collectorId, recipient_name, recipient_document: recipient_document ?? null, photo_url: photo_url ?? null, notes: notes ?? null },
        { onConflict: 'order_id' },
      );
    if (dErr) throw new AppError(500, dErr.message);

    const { error: oErr } = await supabase
      .from('orders')
      .update({ status: 'delivered', delivered_at: now, collector_id: collectorId })
      .eq('id', id);
    if (oErr) throw new AppError(500, oErr.message);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Perfil do coletor ────────────────────────────────────────────────────────

export async function getCollectorProfile(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('collectors')
      .select('id, name, phone, phone_contact, cpf, bank_name, bank_agency, bank_account, pix_key, photo_url, cep_zones')
      .eq('id', req.collectorId!)
      .single();
    if (error) throw new AppError(500, error.message);
    res.json({ success: true, data } satisfies ApiResponse);
  } catch (err) { next(err); }
}

export async function updateCollectorProfile(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { name, phone_contact, cpf, bank_name, bank_agency, bank_account, pix_key, photo_url } =
      req.body as {
        name?: string; phone_contact?: string; cpf?: string;
        bank_name?: string; bank_agency?: string; bank_account?: string;
        pix_key?: string; photo_url?: string;
      };

    const update: Record<string, unknown> = {};
    if (name         !== undefined) update['name']          = name.trim();
    if (phone_contact!== undefined) update['phone_contact'] = phone_contact.trim();
    if (cpf          !== undefined) update['cpf']           = cpf.replace(/\D/g, '');
    if (bank_name    !== undefined) update['bank_name']     = bank_name.trim();
    if (bank_agency  !== undefined) update['bank_agency']   = bank_agency.trim();
    if (bank_account !== undefined) update['bank_account']  = bank_account.trim();
    if (pix_key      !== undefined) update['pix_key']       = pix_key.trim();
    if (photo_url    !== undefined) update['photo_url']     = photo_url;

    if (Object.keys(update).length === 0) {
      res.json({ success: true } satisfies ApiResponse);
      return;
    }

    const { error } = await supabase
      .from('collectors')
      .update(update)
      .eq('id', req.collectorId!);
    if (error) throw new AppError(500, error.message);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err) { next(err); }
}

// ── Logout (invalida token no banco) ────────────────────────────────────────

export async function collectorLogout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await supabase
      .from('collectors')
      .update({ session_token: null })
      .eq('id', req.collectorId!);
    res.json({ success: true } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Upload de foto de perfil → Supabase Storage ──────────────────────────────

export async function uploadCollectorPhoto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { photo_base64, mime_type } = req.body as {
      photo_base64?: string;
      mime_type?: string;
    };

    if (!photo_base64) throw new AppError(400, 'photo_base64 obrigatório');

    const mime    = mime_type ?? 'image/jpeg';
    const ext     = mime === 'image/png' ? 'png' : 'jpg';
    const buffer  = Buffer.from(photo_base64, 'base64');
    const path    = `${req.collectorId!}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('collector-photos')
      .upload(path, buffer, { contentType: mime, upsert: true });

    if (uploadErr) throw new AppError(500, `Upload falhou: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('collector-photos')
      .getPublicUrl(path);

    // Atualiza photo_url no banco
    await supabase
      .from('collectors')
      .update({ photo_url: publicUrl })
      .eq('id', req.collectorId!);

    res.json({ success: true, data: { photo_url: publicUrl } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Localização em tempo real ────────────────────────────────────────────────

export async function updateLocation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const { lat, lng, heading, speed, is_active } = req.body as {
      lat?: number; lng?: number;
      heading?: number; speed?: number;
      is_active?: boolean;
    };

    if (lat === undefined || lng === undefined) {
      throw new AppError(400, 'lat e lng são obrigatórios');
    }

    const { error } = await supabase
      .from('collector_locations')
      .upsert({
        collector_id: collectorId,
        lat,
        lng,
        heading:   heading  ?? null,
        speed:     speed    ?? null,
        is_active: is_active !== false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'collector_id' });

    if (error) throw new AppError(500, error.message);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Histórico ────────────────────────────────────────────────────────────────

export async function scanHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '50'), 10), 200);

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('collector_id', collectorId)
      .order('scanned_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError(500, error.message);

    res.json({ success: true, data: { items: data ?? [] } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Ocorrências de entrega ────────────────────────────────────────────────────

export async function createOccurrence(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const { id } = req.params;
    const { reason, photo_url, notes } = req.body as {
      reason?: string;
      photo_url?: string;
      notes?: string;
    };

    if (!reason) throw new AppError(400, 'reason obrigatório');
    if (!photo_url) throw new AppError(400, 'photo_url obrigatório');

    const { error: occErr } = await supabase
      .from('delivery_occurrences')
      .insert({ order_id: id, collector_id: collectorId, reason, photo_url, notes: notes ?? null });
    if (occErr) throw new AppError(500, occErr.message);

    const { error: oErr } = await supabase
      .from('orders')
      .update({ status: 'occurrence' as never })
      .eq('id', id);
    if (oErr) throw new AppError(500, oErr.message);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

// ── Relatórios de entregas ────────────────────────────────────────────────────
// Cursor-based pagination — escalável para milhões de registros.
// Nunca faz COUNT(*) total; usa delivered_at como cursor.

export async function deliveryReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collectorId = req.collectorId!;
    const limit       = Math.min(Number(req.query['limit'] ?? 20), 50);
    const cursor      = req.query['cursor'] as string | undefined; // ISO datetime
    const dateFrom    = req.query['date_from'] as string | undefined;
    const dateTo      = req.query['date_to']   as string | undefined;
    const platform    = req.query['platform']  as string | undefined;

    // ── Histórico de entregas (paginado por cursor) ──────────────────────────
    let q = supabase
      .from('deliveries')
      .select(`
        id, delivered_at, recipient_name,
        orders ( id, tracking_number, platform, delivery_cep, raw_payload )
      `)
      .eq('collector_id', collectorId)
      .order('delivered_at', { ascending: false })
      .limit(limit + 1); // +1 para saber se tem próxima página

    if (cursor) q = q.lt('delivered_at', cursor);
    if (dateFrom) q = q.gte('delivered_at', dateFrom);
    if (dateTo)   q = q.lte('delivered_at', dateTo);
    if (platform) q = (q as any).eq('orders.platform', platform);

    const { data: rows, error: rErr } = await q;
    if (rErr) throw new AppError(500, rErr.message);

    const hasMore   = (rows ?? []).length > limit;
    const items     = (rows ?? []).slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1]?.delivered_at ?? null : null;

    // ── Stats do período (sem COUNT global — usa apenas o window da query) ───
    const periodFrom = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: statsRows }, { count: occCount }] = await Promise.all([
      supabase
        .from('deliveries')
        .select('orders ( platform )')
        .eq('collector_id', collectorId)
        .gte('delivered_at', periodFrom)
        .limit(5000),
      supabase
        .from('delivery_occurrences')
        .select('id', { count: 'exact', head: true })
        .eq('collector_id', collectorId)
        .gte('created_at', periodFrom),
    ]);

    const platCount: Record<string, number> = {};
    (statsRows ?? []).forEach((r: any) => {
      const p = r.orders?.platform ?? 'outros';
      platCount[p] = (platCount[p] ?? 0) + 1;
    });

    res.json({
      success: true,
      data: {
        items,
        next_cursor: nextCursor,
        has_more:    hasMore,
        stats: {
          total:       (statsRows ?? []).length,
          occurrences: occCount ?? 0,
          by_platform: platCount,
        },
      },
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
