import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../lib/logger';
import { refreshExpiringTokens } from './tokenRefresher';
import { syncAllMLOrders } from './orderSyncer';
import { checkAndGenerateCharges } from './billingChecker';

let tasks: ScheduledTask[] = [];

/**
 * Inicia todos os jobs em background.
 *
 * Intervalos:
 *   - Sync de pedidos ML:   a cada 10 minutos
 *   - Refresh de tokens ML: a cada 30 minutos
 */
export function startJobs(): void {
  // ── Sync de pedidos ML — a cada 10 minutos ──────────────────────────────
  const syncTask = cron.schedule('*/10 * * * *', async () => {
    try {
      await syncAllMLOrders();
    } catch (err) {
      logger.error({ err }, '[jobs] Erro inesperado no syncAllMLOrders');
    }
  });

  // ── Refresh de tokens ML — a cada 30 minutos ────────────────────────────
  const refreshTask = cron.schedule('*/30 * * * *', async () => {
    try {
      await refreshExpiringTokens();
    } catch (err) {
      logger.error({ err }, '[jobs] Erro inesperado no refreshExpiringTokens');
    }
  });

  // ── Verificação de cobranças — diariamente às 09:00 ────────────────────────
  const billingTask = cron.schedule('0 9 * * *', async () => {
    try {
      await checkAndGenerateCharges();
    } catch (err) {
      logger.error({ err }, '[jobs] Erro inesperado no checkAndGenerateCharges');
    }
  });

  tasks = [syncTask, refreshTask, billingTask];

  logger.info('[jobs] Jobs iniciados: sync ML (10min), refresh tokens (30min), billing check (09h diário)');

  // Roda o sync imediatamente na inicialização para não esperar 10 minutos
  syncAllMLOrders().catch((err) =>
    logger.error({ err }, '[jobs] Erro no sync inicial ao subir o servidor'),
  );
}

/**
 * Para todos os jobs — chamado no graceful shutdown.
 */
export function stopJobs(): void {
  tasks.forEach((t) => t.stop());
  tasks = [];
  logger.info('[jobs] Jobs encerrados');
}
