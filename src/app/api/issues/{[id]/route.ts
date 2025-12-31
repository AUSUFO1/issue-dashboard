import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { requireAdmin } from '@/middleware/rbac';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { connectDB } from '@/lib/db';
import Issue from '@/models/Issue';
import AuditLog from '@/models/AuditLog';
import { updateIssueSchema } from '@/validators/issue.schema';
import { AuditAction } from '@/types';
import mongoose from 'mongoose';

// GET /api/issues/:id - Get single issue with full details
export const GET = withAuth(async (_request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    const issue = await Issue.findOne({ _id: id, deletedAt: null })
      .populate('assignedTo', 'firstName lastName email')
      .populate('reportedBy', 'firstName lastName email')
      .lean();

    if (!issue) {
      throw new AppError('Issue not found', 404);
    }

    return successResponse(issue);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Get issue error:', error);
    return errorResponse(new AppError('Failed to fetch issue', 500));
  }
});

// PATCH /api/issues/:id - Update issue
export const PATCH = withAuth(async (request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;
    const { user } = context;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    const body = await request.json();
    const validatedData = updateIssueSchema.parse(body);

    // Find existing issue
    const issue = await Issue.findOne({ _id: id, deletedAt: null });
    if (!issue) {
      throw new AppError('Issue not found', 404);
    }

    // Track changes for audit log
    const changes: Array<{
      field: string;
      oldValue: string;
      newValue: string;
      action: AuditAction;
    }> = [];

    // Check each field for changes
    if (validatedData.title && validatedData.title !== issue.title) {
      changes.push({
        field: 'title',
        oldValue: issue.title,
        newValue: validatedData.title,
        action: AuditAction.UPDATED,
      });
    }

    if (
      validatedData.description &&
      validatedData.description !== issue.description
    ) {
      changes.push({
        field: 'description',
        oldValue: issue.description.substring(0, 100) + '...',
        newValue: validatedData.description.substring(0, 100) + '...',
        action: AuditAction.UPDATED,
      });
    }

    if (validatedData.status && validatedData.status !== issue.status) {
      changes.push({
        field: 'status',
        oldValue: issue.status,
        newValue: validatedData.status,
        action: AuditAction.STATUS_CHANGED,
      });
    }

    if (validatedData.priority && validatedData.priority !== issue.priority) {
      changes.push({
        field: 'priority',
        oldValue: issue.priority,
        newValue: validatedData.priority,
        action: AuditAction.PRIORITY_CHANGED,
      });
    }

    if (validatedData.type && validatedData.type !== issue.type) {
      changes.push({
        field: 'type',
        oldValue: issue.type,
        newValue: validatedData.type,
        action: AuditAction.UPDATED,
      });
    }

    // Handle assignment changes
    if ('assignedTo' in validatedData) {
      const oldAssignedTo = issue.assignedTo?.toString() || null;
      const newAssignedTo = validatedData.assignedTo || null;

      if (oldAssignedTo !== newAssignedTo) {
        if (newAssignedTo === null) {
          changes.push({
            field: 'assignedTo',
            oldValue: oldAssignedTo || 'unassigned',
            newValue: 'unassigned',
            action: AuditAction.UNASSIGNED,
          });
        } else {
          // Verify assignee exists
          const User = (await import('@/models/User')).default;
          const assignee = await User.findById(newAssignedTo);
          if (!assignee) {
            throw new AppError('Assigned user not found', 404);
          }

          changes.push({
            field: 'assignedTo',
            oldValue: oldAssignedTo || 'unassigned',
            newValue: newAssignedTo,
            action: AuditAction.ASSIGNED,
          });
        }
      }
    }

    // Update issue
    Object.assign(issue, validatedData);
    await issue.save();

    // Populate references
    await issue.populate([
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'reportedBy', select: 'firstName lastName email' },
    ]);

    // Log all changes to audit trail
    const userId = new mongoose.Types.ObjectId(user.userId);
    await Promise.all(
      changes.map((change) =>
        AuditLog.logAction(issue._id, userId, change.action, {
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        })
      )
    );

    return successResponse(issue, 'Issue updated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Update issue error:', error);
    return errorResponse(new AppError('Failed to update issue', 500));
  }
});

// DELETE /api/issues/:id - Soft delete issue (admin only)
export const DELETE = withAuth(async (_request: NextRequest, context: any) => {
  try {
    // Apply RBAC check
    const rbacCheck = await requireAdmin(context);
    if (rbacCheck) return rbacCheck; // Return error response if not admin

    await connectDB();

    const { id } = context.params;
    const { user } = context;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    const issue = await Issue.findOne({ _id: id, deletedAt: null });
    if (!issue) {
      throw new AppError('Issue not found', 404);
    }

    // Soft delete
    issue.deletedAt = new Date();
    await issue.save();

    // Log audit trail
    await AuditLog.logAction(
      issue._id,
      new mongoose.Types.ObjectId(user.userId),
      AuditAction.DELETED,
      {
        metadata: {
          title: issue.title,
          deletedBy: user.email,
        },
      }
    );

    return successResponse(null, 'Issue deleted successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Delete issue error:', error);
    return errorResponse(new AppError('Failed to delete issue', 500));
  }
});
