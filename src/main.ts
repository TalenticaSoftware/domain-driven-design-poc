import 'reflect-metadata';
import { appDataSource } from './shared/infrastructure/data-source';
import { config } from './shared/infrastructure/config';
import { logger } from './shared/infrastructure/logger';
import { buildApp } from './app';

const bootstrap = async (): Promise<void> => {
  await appDataSource.initialize();
  logger.info({ database: config.db.database }, 'Database connection established');

  const app = buildApp(appDataSource);
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Order fulfillment service started');
  });
};

bootstrap().catch((error: Error) => {
  logger.error({ message: error.message, stack: error.stack }, 'Failed to start application');
  process.exit(1);
});
