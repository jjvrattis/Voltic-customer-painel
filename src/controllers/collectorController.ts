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

    const { data: requests, error: rErr } = await supabase
      .from('collection_requests')
      .select('*')
      .in('seller_id', sellerIds)
      .in('status', ['pending', 'accepted', 'en_route', 'arrived'])
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

    let query = supabase
      .from('orders')
      .select('id, platform, external_order_id, tracking_number, status, delivery_cep, raw_payload, created_at')
      .eq('status', 'shipped')
      .not('delivery_cep', 'is', null);

    const orFilters = cepZones.map(z => `delivery_cep.like.${z}%`).join(',');
    query = query.or(orFilters);

    const { data, error } = await query.order('created_at', { ascending: true }).limit(200);
    if (error) throw new AppError(500, error.message);

    res.json({ success: true, data: { items: data ?? [] } } satisfies ApiResponse);
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

    const { error: dErr } = await supabase
      .from('deliveries')
      .upsert(
        {
          order_id: id,
          collector_id: collectorId,
          recipient_name,
          recipient_document: recipient_document ?? null,
          photo_url: photo_url ?? null,
          notes: notes ?? null,
        },
        { onConflict: 'order_id' },
      );
    if (dErr) throw new AppError(500, dErr.message);

    const { error: oErr } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        collector_id: collectorId,
      })
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
