import { supabase } from '../lib/supabase';
import { refreshMLToken } from '../services/mlService';
import { logger } from '../lib/logger';

/**
 * Renova tokens ML que vão expirar nas próximas 2 horas.
 * Só renova tokens que possuem refresh_token (fluxo OAuth real).
 * Tokens client_credentials não têm refresh_token e são ignorados.
 */
export async function refreshExpiringTokens(): Promise<void> {
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data: tokens, error } = await supabase
    .from('seller_tokens')
    .select('seller_id, platform, expires_at')
    .eq('platform', 'mercadolivre')
    .lt('expires_at', twoHoursFromNow)
    .not('refresh_token', 'is', null);

  if (error) {
    logger.error({ err: error }, '[tokenRefresher] Erro ao buscar tokens expirados');
    return;
  }

  if (!tokens || tokens.length === 0) {
    logger.debug('[tokenRefresher] Nenhum token ML precisa renovação agora');
    return;
  }

  logger.info({ count: tokens.length }, '[tokenRefresher] Renovando tokens ML expirados em breve');

  const results = await Promise.allSettled(
    tokens.map(async (row) => {
      await refreshMLToken(row.seller_id);
      logger.info({ sellerId: row.seller_id }, '[tokenRefresher] Token ML renovado');
    }),
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    failures.forEach((f) => {
      if (f.status === 'rejected') {
        logger.error({ err: f.reason }, '[tokenRefresher] Falha ao renovar token ML');
      }
    });
  }
}
