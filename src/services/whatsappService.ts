import axios from 'axios';
import { logger } from '../lib/logger';

const EVOLUTION_URL   = process.env['EVOLUTION_API_URL']        ?? 'http://localhost:4000';
const INSTANCE_TOKEN  = process.env['EVOLUTION_INSTANCE_TOKEN'] ?? '';

const evolutionClient = axios.create({
  baseURL: EVOLUTION_URL,
  headers: { apikey: INSTANCE_TOKEN, 'Content-Type': 'application/json' },
  timeout: 10_000,
});

export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  await evolutionClient.post('/send/text', { number: phone, text });
  logger.info({ phone }, 'WhatsApp text sent');
}

export async function sendOtpCode(phone: string, code: string): Promise<void> {
  const text =
    `🔐 Seu código de verificação Voltic: *${code}*\n\n` +
    `Válido por 5 minutos. Não compartilhe com ninguém.`;
  try {
    await sendWhatsAppText(phone, text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ phone, err: msg }, 'Falha ao enviar OTP via WhatsApp');
    throw new Error('Falha ao enviar código via WhatsApp. Tente novamente.');
  }
}

export async function isNumberOnWhatsApp(phone: string): Promise<boolean> {
  try {
    const { data } = await evolutionClient.post<{ IsInWhatsapp: boolean }[]>(
      '/user/check',
      { number: [phone] },
    );
    return data[0]?.IsInWhatsapp ?? false;
  } catch {
    return false;
  }
}
