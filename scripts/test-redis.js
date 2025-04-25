// This script tests the Redis connection
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

// Get Redis URL from environment
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('REDIS_URL environment variable is not set.');
  process.exit(1);
}

console.log('Redis URL configured:', redisUrl.replace(/:\/\/.*@/, '://***@'));

// Configure Redis client options
const options = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
};

// Only enable TLS if URL starts with rediss://
if (redisUrl.startsWith('rediss://')) {
  console.log('Using TLS for Redis connection');
  options.tls = {
    rejectUnauthorized: false
  };
} else {
  console.log('Not using TLS for Redis connection');
}

// Create Redis client with options
const redis = new Redis(redisUrl, options);

// Listen for events
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('ready', () => {
  console.log('Redis connection is ready');
  // Test ping
  redis.ping()
    .then((result) => {
      console.log('Ping successful:', result);
      // Test set/get
      return redis.set('test-key', 'test-value', 'EX', 60);
    })
    .then(() => {
      console.log('Set operation successful');
      return redis.get('test-key');
    })
    .then((value) => {
      console.log('Get operation successful:', value);
      // Success - close connection and exit
      redis.quit();
      console.log('Redis connection test completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Redis operation failed:', err);
      redis.quit();
      process.exit(1);
    });
});

// Set timeout for the entire test
setTimeout(() => {
  console.error('Redis connection test timed out after 15 seconds');
  redis.disconnect();
  process.exit(1);
}, 15000); 