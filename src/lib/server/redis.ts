import { Redis } from "@upstash/redis";

function createRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// null when env vars are absent (e.g. CI without Redis)
export const redis = createRedis();
