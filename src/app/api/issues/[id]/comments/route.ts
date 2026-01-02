import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import {
  successResponse,
  errorResponse,
  createdResponse,
} from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { connectDB } from '@/lib/db';
import Issue from '@/models/Issue';
import Comment from '@/models/Comment';
import AuditLog from '@/models/AuditLog';
import { createCommentSchema } from '@/validators/issue.schema';
import { AuditAction } from '@/types';
import mongoose from 'mongoose';

// GET /api/issues/:id/comments - Get all comments for an issue
export const GET = withAuth(async (_request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;

    // Validate issue ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    // Verify issue exists
    const issue = await Issue.findOne({ _id: id, deletedAt: null });
    if (!issue) {
      throw new AppError('Issue not found', 404);
    }

    // Get comments (non-deleted only)
    const comments = await Comment.find({
      issueId: id,
      deletedAt: null,
    })
      .sort({ createdAt: -1 }) // Newest first
      .populate('userId', 'firstName lastName email')
      .lean();

    return successResponse(comments, 'Comments fetched successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Get comments error:', error);
    return errorResponse(new AppError('Failed to fetch comments', 500));
  }
});

// POST /api/issues/:id/comments - Add comment to issue
export const POST = withAuth(async (request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;
    const { user } = context;

    // Validate issue ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    // Verify issue exists
    const issue = await Issue.findOne({ _id: id, deletedAt: null });
    if (!issue) {
      throw new AppError('Issue not found', 404);
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Create comment
    const comment = await Comment.create({
      issueId: id,
      userId: user.userId,
      text: validatedData.text,
    });

    // Populate user info
    await comment.populate('userId', 'firstName lastName email');

    // Log audit trail
    await AuditLog.logAction(
      new mongoose.Types.ObjectId(id),
      new mongoose.Types.ObjectId(user.userId),
      AuditAction.COMMENTED,
      {
        metadata: {
          commentId: comment._id.toString(),
          preview: validatedData.text.substring(0, 50) + '...',
        },
      }
    );

    return createdResponse(comment, 'Comment added successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Create comment error:', error);
    return errorResponse(new AppError('Failed to add comment', 500));
  }
});
