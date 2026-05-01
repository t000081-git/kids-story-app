const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 25; // 25 per hour — generous for personal/family use

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string): {
  allowed: boolean;
  minutesUntilReset: number;
} {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, minutesUntilReset: 0 };
  }

  if (bucket.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      minutesUntilReset: Math.ceil((bucket.resetAt - now) / 60000),
    };
  }

  bucket.count++;
  return { allowed: true, minutesUntilReset: 0 };
}
