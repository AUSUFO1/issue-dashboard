import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('JWT secrets defined in environment variables');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/*
 * Generate JWT access token
 * Short-lived (15 minutes)
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

/*
 * Verify and decode JWT access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    } as jwt.VerifyOptions) as JWTPayload;
    return decoded;
  } catch (error) {
    // Token expired, invalid, or malformed
    return null;
  }
}

/*
 * Generate refresh token
 * Long-lived (7 days), stored in HTTP-only cookie
 */
export function generateRefreshToken(): string {
  // Generate cryptographically secure random token
  return crypto.randomBytes(32).toString('hex');
}

/*
 * Calculate refresh token expiration date
 */
export function getRefreshTokenExpiry(): Date {
  const expiryMs =
    REFRESH_TOKEN_EXPIRES_IN === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000; // Default 7 days
  return new Date(Date.now() + expiryMs);
}

/*
 * Hash refresh token before storing in database
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// TOKEN PAIR

/*
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  return {
    accessToken,
    refreshToken,
  };
}

// PASSWORD VALIDATION

/*
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// EXTRACT TOKEN

/*
 Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

//  TOKEN EXPIRY

/*
 Check if token is about to expire (within 2 minutes)
  Used for automatic refresh on frontend */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;

    return expiryTime - now < twoMinutes;
  } catch {
    return true;
  }
}
