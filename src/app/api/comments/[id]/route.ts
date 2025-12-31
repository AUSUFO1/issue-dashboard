import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { connectDB } from '@/lib/db';
import Comment from '@/models/Comment';
import AuditLog from '@/models/AuditLog';
import { updateCommentSchema } from '@/validators/issue.schema';
import { AuditAction } from '@/types';
import { ROLES } from '@/lib/constants';
import mongoose from 'mongoose';

// PATCH /api/comments/:id - Edit comment (only by comment author)
export const PATCH = withAuth(async (request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;
    const { user } = context;

    // Validate comment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid comment ID', 400);
    }

    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    // Find comment
    const comment = await Comment.findOne({ _id: id, deletedAt: null });
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if user is the author
    if (comment.userId.toString() !== user.userId) {
      throw new AppError('You can only edit your own comments', 403);
    }

    const oldText = comment.text;

    // Update comment
    comment.text = validatedData.text;
    await comment.save(); // isEdited and editedAt are handled by pre-save hook

    // Populate user info
    await comment.populate('userId', 'firstName lastName email');

    // Log audit trail
    await AuditLog.logAction(
      comment.issueId,
      new mongoose.Types.ObjectId(user.userId),
      AuditAction.COMMENT_EDITED,
      {
        field: 'text',
        oldValue: oldText.substring(0, 50) + '...',
        newValue: validatedData.text.substring(0, 50) + '...',
        metadata: {
          commentId: comment._id.toString(),
        },
      }
    );

    return successResponse(comment, 'Comment updated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Update comment error:', error);
    return errorResponse(new AppError('Failed to update comment', 500));
  }
});

// DELETE /api/comments/:id - Delete comment (author or admin)
export const DELETE = withAuth(async (_request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;
    const { user } = context;

    // Validate comment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid comment ID', 400);
    }

    // Find comment
    const comment = await Comment.findOne({ _id: id, deletedAt: null });
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check permission: author or admin
    const isAuthor = comment.userId.toString() === user.userId;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new AppError(
        'You do not have permission to delete this comment',
        403
      );
    }

    // Soft delete
    comment.deletedAt = new Date();
    await comment.save();

    // Log audit trail
    await AuditLog.logAction(
      comment.issueId,
      new mongoose.Types.ObjectId(user.userId),
      AuditAction.COMMENT_DELETED,
      {
        metadata: {
          commentId: comment._id.toString(),
          deletedBy: user.email,
          preview: comment.text.substring(0, 50) + '...',
        },
      }
    );

    return successResponse(null, 'Comment deleted successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Delete comment error:', error);
    return errorResponse(new AppError('Failed to delete comment', 500));
  }
});
