import { Redis, RedisConfigNodejs } from '@upstash/redis';

const redisConfig = {
  keepAlive: false,
  retry: {
    retries: parseInt(process.env.REDIS_RETRIES ?? '0', 10),
  },
} satisfies Omit<RedisConfigNodejs, 'url' | 'token'>;

export const redis = Redis.fromEnv(redisConfig);
