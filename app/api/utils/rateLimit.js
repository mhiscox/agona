// Simple in-memory rate limiter (for serverless, consider Redis/Upstash for production)
// This works per-instance, so for true distributed rate limiting, use Upstash Redis

const rateLimitStore = new Map();

export function rateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.windowStart < windowStart) {
    // New window or expired window
    entry = {
      count: 0,
      windowStart: now,
    };
  }

  entry.count++;

  // Clean up old entries periodically (simple cleanup)
  if (Math.random() < 0.01) { // 1% chance to cleanup
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.windowStart < windowStart) {
        rateLimitStore.delete(key);
      }
    }
  }

  rateLimitStore.set(identifier, entry);

  const remaining = Math.max(0, maxRequests - entry.count);
  const reset = entry.windowStart + windowMs;

  return {
    allowed: entry.count <= maxRequests,
    remaining,
    reset,
    limit: maxRequests,
  };
}

export function getClientIdentifier(req) {
  // Try to get API key first
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (apiKey) {
    return `api_key:${apiKey}`;
  }

  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

