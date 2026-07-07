// infrastructure/queue/queueManager.js
const { Queue } = require('bullmq');
const connection = require('./redis');
const logger = require('../../core/logger/logger');

// Define default queue options
const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  }
};

// Initialize system queues
const systemNotificationsQueue = new Queue('system-notifications', {
  connection,
  defaultJobOptions
});

systemNotificationsQueue.on('error', () => {});

logger.info('📦 BullMQ Queues initialized successfully.');

module.exports = {
  systemNotificationsQueue
};
