import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { connectDB } from '@/lib/db';
import Issue from '@/models/Issue';
import AuditLog from '@/models/AuditLog';
import mongoose from 'mongoose';

// GET /api/issues/:id/timeline - Get complete audit trail for an issue
export const GET = withAuth(async (request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate issue ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    // Verify issue exists
    const issue = await Issue.findOne({ _id: id, deletedAt: null });
    if (!issue) {
      throw new AppError('Issue not found', 404);
    }

    // Get audit trail
    const timeline = await AuditLog.find({ issueId: id })
      .sort({ createdAt: -1 }) // Newest first
      .limit(Math.min(limit, 100)) // Max 100 entries
      .populate('userId', 'firstName lastName email')
      .lean();

    return successResponse({
      issueId: id,
      issueTitle: issue.title,
      timeline,
      total: timeline.length,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Get timeline error:', error);
    return errorResponse(new AppError('Failed to fetch timeline', 500));
  }
});
