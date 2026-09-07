const { createClient } = require("redis");

const redis = createClient({
  socket: {
    host: "redis-auth", //localhost if runs outside docker/"redis-auth"
    port: 6379, //6378
  },
});

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis connection error:", err));

(async () => {
  await redis.connect();
})();

module.exports = redis;