import { Request, Response, NextFunction } from 'express';
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
  runRecurringCollections,
} from '../services/sellerExtraService';
import { AppError } from '../middlewares/errorHandler';

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
    res.json({ success: true, data: { html } });
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
