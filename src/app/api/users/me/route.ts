import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { NotFoundError, AppError } from '@/lib/errors';

/**
 * GET /api/users/me
 * Get current user profile
 * Protected route - requires authentication
 */
export const GET = withAuth(async (_request: NextRequest, { user }) => {
  try {
    await connectDB();

    // Find user by ID from JWT payload
    const userData = await User.findById(user.userId);

    if (!userData) {
      throw new NotFoundError('User');
    }

    // Return user data
    return successResponse({
      user: {
        id: userData._id.toString(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: userData.isActive,
        isVerified: userData.isVerified,
        createdAt: userData.createdAt.toISOString(),
        updatedAt: userData.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);

    if (error instanceof AppError) {
      return errorResponse(error);
    }

    return errorResponse(new AppError('Failed to get user profile', 500));
  }
});
