import 'server-only';
import Redis from 'ioredis';

// Singleton ioredis partagé (sessions + stores BFF). Réutilisé entre hot-reloads via globalThis.
declare global {
  var __appRedis: Redis | undefined;
}

export function redis(): Redis {
  if (!globalThis.__appRedis) {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? '6379');
    const password = process.env.REDIS_PASSWORD || undefined;
    globalThis.__appRedis = new Redis({ host, port, password, lazyConnect: false });
  }
  return globalThis.__appRedis;
}
