import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { registerSchema } from '@/validators/auth.schema';
import { errorResponse, createdResponse } from '@/lib/api-response';
import { ValidationError, ConflictError, AppError } from '@/lib/errors';
import {
  generateTokenPair,
  hashRefreshToken,
  getRefreshTokenExpiry,
} from '@/lib/auth';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid input data',
        validationResult.error.flatten().fieldErrors
      );
    }

    const { email, password, firstName, lastName } = validationResult.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    // Create new user
    const user = await User.create({
      email,
      password, // Will be hashed by pre-save middleware
      firstName,
      lastName,
      role: 'USER',
      isActive: true,
      isVerified: false, // In production, send verification email
    });

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

    // Prepare response data (exclude sensitive fields)
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

    // Create response with refresh token in HTTP-only cookie
    const response = createdResponse(
      {
        user: userData,
        accessToken: tokenPair.accessToken,
      },
      'Registration successful'
    );

    // Set refresh token cookie
    response.cookies.set('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof AppError) {
      return errorResponse(error);
    }

    return errorResponse(
      new AppError('Registration failed. Please try again.', 500)
    );
  }
}
