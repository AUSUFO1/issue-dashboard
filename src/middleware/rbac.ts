import { NextResponse } from 'next/server';
import { JWTPayload } from '@/lib/auth';
import { Role } from '@/types';
import { errorResponse } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';

/*
 * Role-Based Access Control Middleware
 * Checks if user has required role(s)
 */
export function checkRole(allowedRoles: Role[]) {
  return (user: JWTPayload): NextResponse | null => {
    if (!allowedRoles.includes(user.role)) {
      return errorResponse(
        new AuthorizationError(
          'You do not have permission to access this resource'
        )
      );
    }

    return null; // No error, user has permission
  };
}

/**
 * Check if user is admin
 */
export function requireAdmin(user: JWTPayload): NextResponse | null {
  return checkRole(['ADMIN'])(user);
}

/* Check if user is manager or admin */
export function requireManagerOrAdmin(user: JWTPayload): NextResponse | null {
  return checkRole(['MANAGER', 'ADMIN'])(user);
}

/* Higher-order function to wrap API routes with RBAC */
export function withRole(allowedRoles: Role[]) {
  return function <T>(
    handler: (
      request: Request,
      context: T & { user: JWTPayload }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: Request,
      context: T & { user: JWTPayload }
    ): Promise<NextResponse> => {
      // Check if user has required role
      const roleCheck = checkRole(allowedRoles)(context.user);

      if (roleCheck) {
        return roleCheck; // Return error response
      }

      // User has permission, call handler
      return handler(request, context);
    };
  };
}
