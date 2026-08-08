import 'server-only';
import Redis from 'ioredis';
import { logger } from '@/server/logger';

// Singleton ioredis partagé (sessions + stores BFF). Réutilisé entre hot-reloads via globalThis.
declare global {
  var __appRedis: Redis | undefined;
}

export function redis(): Redis {
  if (!globalThis.__appRedis) {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? '6379');
    const password = process.env.REDIS_PASSWORD || undefined;
    const client = new Redis({ host, port, password, lazyConnect: false });
    // Redis peut être brièvement indisponible pendant son redémarrage lors d'un déploiement.
    // Sans listener, ioredis expose cela comme un évènement non géré malgré ses retries internes.
    client.on('error', (cause) => {
      logger.warn({ cause, host, port }, 'redis.connection_error');
    });
    globalThis.__appRedis = client;
  }
  return globalThis.__appRedis;
}
