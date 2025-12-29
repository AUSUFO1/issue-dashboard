import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/validators/auth.schema';
import { successResponse, errorResponse } from '@/lib/api-response';
import { ValidationError, AuthenticationError, AppError } from '@/lib/errors';
import {
  generateTokenPair,
  hashRefreshToken,
  getRefreshTokenExpiry,
} from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/middleware/rate-limit';

/*
 * POST /api/auth/login
 * Authenticate user and return tokens
 * Rate limited to prevent brute force attacks
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(RATE_LIMITS.AUTH)(request);
  if (rateLimitResult) {
    return rateLimitResult; // Return rate limit error
  }

  try {
    // Connect to database
    await connectDB();

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid input data',
        validationResult.error.flatten().fieldErrors
      );
    }

    const { email, password } = validationResult.data;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil(
        (user.lockUntil!.getTime() - Date.now()) / 60000
      );
      throw new AppError(
        `Account is locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes.`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incrementLoginAttempts();
      throw new AuthenticationError('Invalid email or password');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const tokenPair = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Hash and store refresh token
    const hashedRefreshToken = hashRefreshToken(tokenPair.refreshToken);
    user.refreshTokens.push({
      token: hashedRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });
    await user.save();

    // Prepare response data
    const userData = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    };

    // Create response
    const response = successResponse(
      {
        user: userData,
        accessToken: tokenPair.accessToken,
      },
      'Login successful'
    );

    // Set refresh token cookie
    response.cookies.set('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof AppError) {
      return errorResponse(error);
    }

    return errorResponse(new AppError('Login failed. Please try again.', 500));
  }
}
