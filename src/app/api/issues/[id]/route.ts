import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { connectDB } from '@/lib/db';
import Issue from '@/models/Issue';
import AuditLog from '@/models/AuditLog';
import { updateIssueSchema } from '@/validators/issue.schema';
import { AuditAction } from '@/types';
import { ROLES } from '@/lib/constants';
import mongoose from 'mongoose';

// GET /api/issues/:id - Get single issue
export const GET = withAuth(async (_request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;

    // Validate issue ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    // Find issue (exclude soft-deleted)
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

    // Validate issue ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    const body = await request.json();
    const validatedData = updateIssueSchema.parse(body);

    // Find issue
    const issue = await Issue.findOne({ _id: id, deletedAt: null });
    if (!issue) {
      throw new AppError('Issue not found', 404);
    }

    // Check permissions for certain fields
    const isAdmin = user.role === ROLES.ADMIN;
    const isManager = user.role === ROLES.MANAGER;
    const canEdit = isAdmin || isManager;

    if (!canEdit) {
      // Regular users can only update status and add comments
      const allowedFields = ['status'];
      const updatingFields = Object.keys(validatedData);
      const hasRestrictedFields = updatingFields.some(
        (field) => !allowedFields.includes(field)
      );

      if (hasRestrictedFields) {
        throw new AppError(
          'You do not have permission to edit this issue',
          403
        );
      }
    }

    // Verify assignedTo user exists if being updated
    if (validatedData.assignedTo !== undefined) {
      if (validatedData.assignedTo) {
        const User = (await import('@/models/User')).default;
        const assignee = await User.findById(validatedData.assignedTo);
        if (!assignee) {
          throw new AppError('Assigned user not found', 404);
        }
      }
    }

    // Track changes for audit log
    const changes: any[] = [];
    const updateFields: Record<string, any> = {};

    // Check each field for changes
    for (const [key, value] of Object.entries(validatedData)) {
      const oldValue = issue[key as keyof typeof issue];

      // Handle ObjectId comparison for assignedTo
      if (key === 'assignedTo') {
        const oldId = oldValue ? oldValue.toString() : null;
        const newId = value ? value.toString() : null;
        if (oldId !== newId) {
          changes.push({
            field: key,
            oldValue: oldId,
            newValue: newId,
          });
          updateFields[key] = value;
        }
      }
      // Handle array comparison for tags
      else if (key === 'tags') {
        const oldTags = (oldValue as string[]) || [];
        const newTags = (value as string[]) || [];
        if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
          changes.push({
            field: key,
            oldValue: oldTags.join(', '),
            newValue: newTags.join(', '),
          });
          updateFields[key] = value;
        }
      }
      // Handle simple value comparison
      else if (oldValue !== value) {
        changes.push({
          field: key,
          oldValue: String(oldValue),
          newValue: String(value),
        });
        updateFields[key] = value;
      }
    }

    // If status changed to RESOLVED, set resolvedAt
    if (updateFields.status === 'RESOLVED' && issue.status !== 'RESOLVED') {
      updateFields.resolvedAt = new Date();
    }

    // Update issue
    Object.assign(issue, updateFields);
    await issue.save();

    // Populate references
    await issue.populate([
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'reportedBy', select: 'firstName lastName email' },
    ]);

    // Log each change in audit trail
    for (const change of changes) {
      await AuditLog.logAction(
        issue._id,
        new mongoose.Types.ObjectId(user.userId),
        AuditAction.UPDATED,
        change
      );
    }

    return successResponse(issue, 'Issue updated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Update issue error:', error);
    return errorResponse(new AppError('Failed to update issue', 500));
  }
});

// DELETE /api/issues/:id - Delete issue (soft delete, admin/manager only)
export const DELETE = withAuth(async (_request: NextRequest, context: any) => {
  try {
    await connectDB();

    const { id } = context.params;
    const { user } = context;

    // Validate issue ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid issue ID', 400);
    }

    // Check permissions
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.MANAGER) {
      throw new AppError('You do not have permission to delete issues', 403);
    }

    // Find issue
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
