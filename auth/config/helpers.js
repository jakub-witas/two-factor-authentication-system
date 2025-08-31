const { hotp } = require("otplib");
const redis = require("./redisClient.js");
// tempSecret helpers

async function createTempSecret(userId, method, secret, ttlSeconds = 300) {
  const key = `tempSecret:${userId}:${method}`;
  const value = JSON.stringify({ userId, method, secret });
  await redis.setEx(key, ttlSeconds, value);
  return key;
}

async function verifyTempSecret(userId, method) {
  const key = `tempSecret:${userId}:${method}`;
  const value = await redis.get(key);
  if (!value) return null;
  await redis.del(key);
  return JSON.parse(value);
}

// HOTP helpers

async function initHOTP(userId, ttlSeconds = 300) {
  const key = `HOTP:${userId}:counter`;
  await redis.setEx(key, ttlSeconds, '1');
  return 1;
}

async function incrementHOTP(userId, ttlSeconds = 300) {
  const key = `HOTP:${userId}:counter`;
  const counter = await redis.incr(key);
  await redis.expire(key, ttlSeconds); //reset TTL
  return counter;
}

async function getHOTP(userId) {
  const key = `HOTP:${userId}:counter`;
  const value = await redis.get(key);
  return value ? parseInt(value) : null;
}

async function deleteHOTP(userId) {
  const key = `HOTP:${userId}:counter`;
  await redis.del(key);
}

async function storeHOTP(userId, counter, ttl = 300) {
  const key = `HOTP:${userId}:${counter}`;
  await redis.set(key, Date.now().toString(), { EX: ttl });
  return key;
}

async function checkHOTP(userId, counter) {
  const key = `HOTP:${userId}:${counter}`;
  const timestamp = await redis.get(key);

  if (!timestamp) return null;

  await redis.del(key);

  return timestamp;
}

module.exports = { checkHOTP, storeHOTP, deleteHOTP, getHOTP, incrementHOTP, initHOTP, verifyTempSecret, createTempSecret };