import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AuthenticationError, AppError } from '@/lib/errors';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
} from '@/lib/auth';

/*
 * POST /api/auth/refresh
 * Get new access token using refresh token
 * Implements token rotation for security
 */
export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();

    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token not found');
    }

    // Hash the token to compare with stored hash
    const hashedToken = hashRefreshToken(refreshToken);

    // Find user with this refresh token
    const user = await User.findOne({
      'refreshTokens.token': hashedToken,
      'refreshTokens.expiresAt': { $gt: new Date() },
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Remove the old refresh token (token rotation)
    user.refreshTokens = user.refreshTokens.filter(
      (token) => token.token !== hashedToken
    );

    // Generate new token pair
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken();
    const hashedNewRefreshToken = hashRefreshToken(newRefreshToken);

    // Store new refresh token
    user.refreshTokens.push({
      token: hashedNewRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    await user.save();

    // Create response
    const response = successResponse(
      {
        accessToken: newAccessToken,
      },
      'Token refreshed successfully'
    );

    // Set new refresh token cookie
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);

    if (error instanceof AppError) {
      return errorResponse(error);
    }

    return errorResponse(new AppError('Token refresh failed', 500));
  }
}
