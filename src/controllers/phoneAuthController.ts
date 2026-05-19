import { Request, Response, NextFunction } from 'express';
import {
  sendVerificationCode,
  phoneLoginSeller,
  normalizePhone,
} from '../services/phoneAuthService';

export async function sendCodeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) {
      res.status(400).json({ success: false, error: 'Número de telefone obrigatório' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    await sendVerificationCode(phone, ip);
    res.json({ success: true, message: 'Código enviado via WhatsApp' });
  } catch (err) {
    next(err);
  }
}

export async function verifySellerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone, code, device_info } = req.body as {
      phone?:       string;
      code?:        string;
      device_info?: Record<string, unknown>;
    };

    if (!phone || !code) {
      res.status(400).json({ success: false, error: 'phone e code são obrigatórios' });
      return;
    }

    const result = await phoneLoginSeller(phone, code, device_info);

    res.json({
      success: true,
      data: {
        token:      result.sessionToken,
        seller_id:  result.sellerId,
        name:       result.sellerName,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Normaliza número no frontend antes de exibir (útil pro app preencher automaticamente)
export function normalizePhoneHandler(req: Request, res: Response): void {
  const { phone } = req.query as { phone?: string };
  if (!phone) { res.status(400).json({ success: false, error: 'phone obrigatório' }); return; }
  res.json({ success: true, data: { phone: normalizePhone(phone) } });
}
