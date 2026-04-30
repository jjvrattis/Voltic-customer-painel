import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from './errorHandler';

declare module 'express-serve-static-core' {
  interface Request {
    adminId?: string;
  }
}

export async function adminAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw new AppError(401, 'Token de admin não informado');

    const { data: admin, error } = await supabase
      .from('admin_accounts')
      .select('id')
      .eq('session_token', token)
      .single();

    if (error || !admin) throw new AppError(401, 'Token de admin inválido');

    req.adminId = admin.id as string;
    next();
  } catch (err) {
    next(err);
  }
}
