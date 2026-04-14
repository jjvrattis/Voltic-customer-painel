import app from './app';
import { logger } from './lib/logger';
import { startJobs, stopJobs } from './jobs/index';

const PORT = Number(process.env.PORT ?? 3000);

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Voltic API running');
  startJobs();
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Sinal de encerramento recebido, desligando...');
  stopJobs();
  server.close(() => {
    logger.info('Servidor encerrado com sucesso');
    process.exit(0);
  });

  // Forçar encerramento após 10s se travado
  setTimeout(() => {
    logger.error('Forçando encerramento após timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
