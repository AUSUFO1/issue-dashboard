import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractBearerToken, JWTPayload } from '@/lib/auth';
import { errorResponse } from '@/lib/api-response';
import { AuthenticationError } from '@/lib/errors';

// Extend NextRequest to include user data
export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user data to request
 */
export async function authMiddleware(
  request: NextRequest
): Promise<{ user: JWTPayload } | NextResponse> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify token
    const payload = verifyAccessToken(token);

    if (!payload) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Return user payload
    return { user: payload };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error);
    }

    return errorResponse(new AuthenticationError('Authentication failed'));
  }
}

/*
 * Higher-order function to wrap API routes with auth
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { user: JWTPayload }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authMiddleware(request);

    // If authResult is a NextResponse, it's an error response
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Otherwise, call the handler with user context
    return handler(request, authResult);
  };
}
