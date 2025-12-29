import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { hashRefreshToken } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Invalidate refresh token and clear cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();

    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (refreshToken) {
      // Hash the token
      const hashedToken = hashRefreshToken(refreshToken);

      // Find and remove the refresh token from user's tokens
      await User.updateOne(
        { 'refreshTokens.token': hashedToken },
        {
          $pull: {
            refreshTokens: { token: hashedToken },
          },
        }
      );
    }

    // Create response
    const response = successResponse(null, 'Logged out successfully');

    // Clear refresh token cookie
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);

    if (error instanceof AppError) {
      return errorResponse(error);
    }

    return errorResponse(new AppError('Logout failed', 500));
  }
}
