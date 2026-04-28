import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from './errorHandler';

declare module 'express-serve-static-core' {
  interface Request {
    collectorId?: string;
    collectorName?: string;
    collectorCepZones?: string[];
  }
}

export async function collectorAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) throw new AppError(401, 'Token de coletor não informado');

    const { data: collector, error } = await supabase
      .from('collectors')
      .select('id, name, active, cep_zones')
      .eq('session_token', token)
      .single();

    if (error || !collector) throw new AppError(401, 'Token inválido');
    if (!collector.active)   throw new AppError(403, 'Coletor inativo');

    req.collectorId       = collector.id;
    req.collectorName     = collector.name;
    req.collectorCepZones = collector.cep_zones ?? [];
    next();
  } catch (err) {
    next(err);
  }
}
