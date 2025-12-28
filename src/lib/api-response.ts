import { NextResponse } from 'next/server';
import { ApiResponse, PaginationMeta } from '@/types';
import { AppError } from './errors';

export function successResponse<T>(
  data: T,
  message?: string,
  meta?: PaginationMeta
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    meta,
  });
}

export function errorResponse(
  error: Error | AppError,
  statusCode: number = 500
): NextResponse<ApiResponse> {
  const isAppError = error instanceof AppError;

  const response: ApiResponse = {
    success: false,
    error: {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message: error.message,
      statusCode: isAppError ? error.statusCode : statusCode,
      details: isAppError ? error.details : undefined,
    },
  };

  // Don't expose stack trace in production
  if (process.env.NODE_ENV === 'development' && !isAppError) {
    response.error!.details = error.stack;
  }

  return NextResponse.json(response, {
    status: isAppError ? error.statusCode : statusCode,
  });
}

export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: 201 }
  );
}
