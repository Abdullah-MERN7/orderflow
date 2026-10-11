import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

await redisClient.connect();

export default redisClient;


export const incrementTokenVersion = async (userId) => {
  const key = `user:${userId}:tokenVersion`;

  const newVersion = await redisClient.incr(key);

  return newVersion;
};