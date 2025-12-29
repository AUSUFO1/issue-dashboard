import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { RateLimitError } from '@/lib/errors';

// In-memory store for rate limiting
const rateLimitStore = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

/*
 * Rate Limiting Middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Get client identifier (IP address)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    const key = `rate-limit:${ip}`;
    const now = Date.now();

    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(key);

    // Reset if window has passed
    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    // Increment request count
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);

    // Check if limit exceeded
    if (rateLimitData.count > config.maxRequests) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);

      const response = errorResponse(
        new RateLimitError(
          `Too many requests. Please try again in ${retryAfter} seconds.`
        )
      );

      response.headers.set('Retry-After', retryAfter.toString());
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set(
        'X-RateLimit-Reset',
        new Date(rateLimitData.resetTime).toISOString()
      );

      return response;
    }

    // Add rate limit headers to response
    return null; // No error, continue
  };
}

/*
 * Cleanup expired rate limit entries
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/*
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Very strict for auth endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  // Moderate for general API
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  // Lenient for public endpoints
  PUBLIC: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
  },
};
