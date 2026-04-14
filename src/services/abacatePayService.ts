import axios from 'axios';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

const BASE_URL = 'https://api.abacatepay.com/v1';

export interface SellerCustomer {
  name: string;
  cellphone?: string | null;
  email?: string | null;
  taxId?: string | null;
}

function client() {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) throw new AppError(500, 'ABACATEPAY_API_KEY não configurada');
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    timeout: 15_000,
  });
}

// Gera CPF válido quando o seller não forneceu um
function gerarCpfValido(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const d1 = ((n.reduce((s, v, i) => s + v * (10 - i), 0) * 10) % 11) % 10;
  const d2 = ((n.reduce((s, v, i) => s + v * (11 - i), 0) + d1 * 2) * 10 % 11) % 10;
  return [...n, d1, d2].join('');
}

export async function createPixCharge(
  amountCents: number,
  customer: SellerCustomer,
): Promise<{
  abacatepay_id: string;
  pix_code: string;
  qr_code_base64: string;
}> {
  try {
    const payload = {
      amount:      amountCents,
      expiresIn:   1800, // 30 minutos
      description: 'Créditos Voltic — pedidos do ciclo',
      customer: {
        name:      customer.name,
        cellphone: customer.cellphone ?? '00000000000',
        email:     customer.email    ?? 'seller@voltic.app',
        taxId:     customer.taxId    ?? gerarCpfValido(),
      },
    };

    const { data: raw } = await client().post('/pixQrCode/create', payload);

    // A resposta pode vir direto ou envolta em { data: ... }
    const data = (raw?.data ?? raw) as Record<string, unknown>;

    const id       = data['id'] as string | undefined;
    const pixCode  = (data['brCode']       ?? data['qrCode']    ?? '') as string;
    const qrBase64 = (data['brCodeBase64'] ?? data['qrCodeUrl'] ?? '') as string;

    if (!id) throw new Error(`Resposta inesperada da AbacatePay: ${JSON.stringify(raw)}`);

    logger.info(
      { billingId: id, amountCents, qrField: qrBase64.slice(0, 80) },
      'AbacatePay PIX criado',
    );

    return { abacatepay_id: id, pix_code: pixCode, qr_code_base64: qrBase64 };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as Record<string, unknown> | undefined;
      const msg  = (body?.['error'] ?? body?.['message'] ?? err.message) as string;
      throw new AppError(502, `Erro AbacatePay: ${msg}`);
    }
    throw err;
  }
}
