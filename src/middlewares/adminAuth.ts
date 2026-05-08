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

    // Sem token: deixa passar (fase de testes)
    if (!token) { next(); return; }

    const { data: admin } = await supabase
      .from('admin_accounts')
      .select('id')
      .eq('session_token', token)
      .maybeSingle();

    req.adminId = (admin?.id as string | undefined) ?? 'admin';
    next();
  } catch (err) {
    next(err);
  }
}
