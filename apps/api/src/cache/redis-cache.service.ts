import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { env } from '../config.js';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClientType | undefined;
  private ready = false;

  async onModuleInit(): Promise<void> {
    if (!env.cache.enabled) {
      this.logger.log('Redis cache disabled');
      return;
    }

    const client = createClient({ url: env.cache.redisUrl });
    client.on('error', (err) => {
      this.ready = false;
      this.logger.warn(`Redis error: ${(err as Error).message}`);
    });

    try {
      await client.connect();
      this.client = client as RedisClientType;
      this.ready = true;
      this.logger.log('Redis cache connected');
    } catch (err) {
      this.ready = false;
      client.destroy();
      this.logger.warn(`Redis cache unavailable: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    this.client.destroy();
    this.ready = false;
  }

  async getJson<T>(key: string): Promise<T | undefined> {
    if (!this.ready || !this.client) return undefined;

    try {
      const raw = await this.client.get(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Redis get failed for ${key}: ${(err as Error).message}`);
      return undefined;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.ready || !this.client) return;

    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
      this.logger.warn(`Redis set failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.ready || !this.client || keys.length === 0) return;

    try {
      await this.client.del(keys);
    } catch (err) {
      this.logger.warn(`Redis del failed: ${(err as Error).message}`);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    if (!this.ready || !this.client) return;

    const keys: string[] = [];
    try {
      for await (const keyOrKeys of this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
        if (Array.isArray(keyOrKeys)) keys.push(...keyOrKeys);
        else keys.push(keyOrKeys);

        if (keys.length >= 100) {
          await this.client.del(keys.splice(0, keys.length));
        }
      }

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (err) {
      this.logger.warn(`Redis prefix delete failed for ${prefix}: ${(err as Error).message}`);
    }
  }
}
