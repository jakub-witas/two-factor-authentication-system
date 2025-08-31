const { createClient } = require("redis");

const redis = createClient({
  socket: {
    host: "redis-main", //localhost if server runs outside container
    port: 6379,
  },
});

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis connection error:", err));

(async () => {
  await redis.connect();
})();

module.exports = redis;