import Redis from 'ioredis';

class RedisManager {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    const options = {
      host,
      port,
      password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    try {
      // Main client for cache operations
      this.client = new Redis(options);

      // Subscriber for pub/sub
      this.subscriber = new Redis(options);

      // Publisher for pub/sub
      this.publisher = new Redis(options);

      // Event handlers
      this.client.on('connect', () => {
        console.log('✅ Redis connected');
      });

      this.client.on('error', (error) => {
        console.error('❌ Redis error:', error);
      });

      this.client.on('ready', () => {
        console.log('✅ Redis ready');
      });

      this.subscriber.on('error', (error) => {
        console.error('❌ Redis subscriber error:', error);
      });

      this.publisher.on('error', (error) => {
        console.error('❌ Redis publisher error:', error);
      });

      await this.client.ping();
      console.log('✅ Redis ping successful');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis client
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * Get Redis subscriber
   */
  getSubscriber(): Redis {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not initialized');
    }
    return this.subscriber;
  }

  /**
   * Get Redis publisher
   */
  getPublisher(): Redis {
    if (!this.publisher) {
      throw new Error('Redis publisher not initialized');
    }
    return this.publisher;
  }

  /**
   * Cache operations with automatic serialization
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = this.getClient();
    const serialized = JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    const data = await client.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as T;
    }
  }

  async del(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const client = this.getClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.incr(key);
  }

  async incrBy(key: string, increment: number): Promise<number> {
    const client = this.getClient();
    return await client.incrby(key, increment);
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: any): Promise<void> {
    const publisher = this.getPublisher();
    const serialized = JSON.stringify(message);
    await publisher.publish(channel, serialized);
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = this.getSubscriber();

    await subscriber.subscribe(channel);

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch {
          callback(message);
        }
      }
    });
  }

  /**
   * Disconnect all Redis connections
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      console.log('✅ Redis client disconnected');
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      console.log('✅ Redis subscriber disconnected');
    }

    if (this.publisher) {
      await this.publisher.quit();
      console.log('✅ Redis publisher disconnected');
    }
  }

  /**
   * Flush all data (use with caution)
   */
  async flushAll(): Promise<void> {
    const client = this.getClient();
    await client.flushall();
    console.log('⚠️ Redis flushed all data');
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<string> {
    const client = this.getClient();
    return await client.info();
  }
}

// Singleton instance
export const redisManager = new RedisManager();

export default redisManager;

