// core/config/env.js
const dotenv = require('dotenv');
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  MONGO_URI: process.env.MONGODB_URL,
  JWT_SECRET: process.env.SECRET || process.env.JWT_SECRET || 'secret-key-change-me-in-production',
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || null
};

// Validate critical values
if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'secret-key-change-me-in-production') {
  console.warn('⚠️ WARNING: JWT_SECRET is not configured for production. Using system default.');
}

module.exports = env;
