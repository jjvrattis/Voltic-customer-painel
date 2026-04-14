import { supabase } from '../lib/supabase';
import { syncMLOrders } from '../services/syncService';
import { logger } from '../lib/logger';

/**
 * Sincroniza pedidos de todos os sellers ML com token válido (não expirado).
 * Roda para cada seller em série para evitar sobrecarga na API do ML.
 */
export async function syncAllMLOrders(): Promise<void> {
  const now = new Date().toISOString();

  const { data: tokens, error } = await supabase
    .from('seller_tokens')
    .select('seller_id')
    .eq('platform', 'mercadolivre')
    .gt('expires_at', now);

  if (error) {
    logger.error({ err: error }, '[orderSyncer] Erro ao buscar sellers ativos');
    return;
  }

  if (!tokens || tokens.length === 0) {
    logger.debug('[orderSyncer] Nenhum seller ML com token ativo');
    return;
  }

  logger.info({ count: tokens.length }, '[orderSyncer] Iniciando sync ML para sellers ativos');

  let totalSynced = 0;
  let totalErrors = 0;

  for (const row of tokens) {
    try {
      const count = await syncMLOrders(row.seller_id);
      totalSynced += count;
      logger.info({ sellerId: row.seller_id, synced: count }, '[orderSyncer] Sync ML concluído');
    } catch (err) {
      totalErrors++;
      logger.error({ sellerId: row.seller_id, err }, '[orderSyncer] Falha no sync ML');
    }
  }

  logger.info(
    { totalSynced, totalErrors, sellers: tokens.length },
    '[orderSyncer] Ciclo de sync ML finalizado',
  );
}
