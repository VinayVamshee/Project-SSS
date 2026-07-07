// infrastructure/queue/redis.js
const Redis = require('ioredis');
const env = require('../../core/config/env');
const logger = require('../../core/logger/logger');

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy(times) {
    if (times > 3) return null; // Stop retrying
    return Math.min(times * 150, 1000);
  }
};

if (env.REDIS_PASSWORD) {
  redisConfig.password = env.REDIS_PASSWORD;
}

const connection = new Redis(redisConfig);

let hasLoggedError = false;

connection.on('connect', () => {
  logger.info('🔑 Redis queue connection established successfully.');
});

connection.on('error', (err) => {
  if (!hasLoggedError) {
    logger.warn('⚠️ Local Redis is offline. Queue and analytics jobs will run in memory mock-mode.');
    hasLoggedError = true;
  }
});

module.exports = connection;
