import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { connectDB } from '@/lib/db';
import Issue from '@/models/Issue';
import { issueQuerySchema, createIssueSchema } from '@/validators/issue.schema';
import AuditLog from '@/models/AuditLog';
import { AuditAction } from '@/types';
import mongoose from 'mongoose';

// GET /api/issues - List issues with filters, pagination, search
export const GET = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedQuery = issueQuerySchema.parse(queryParams);

    // Build MongoDB filter
    const filter: any = { deletedAt: null }; // Exclude soft-deleted

    // Status filter
    if (validatedQuery.status) {
      filter.status = { $in: validatedQuery.status };
    }

    // Priority filter
    if (validatedQuery.priority) {
      filter.priority = { $in: validatedQuery.priority };
    }

    // Type filter
    if (validatedQuery.type) {
      filter.type = { $in: validatedQuery.type };
    }

    // Assigned to filter
    if (validatedQuery.assignedTo) {
      filter.assignedTo = new mongoose.Types.ObjectId(
        validatedQuery.assignedTo
      );
    }

    // Reported by filter
    if (validatedQuery.reportedBy) {
      filter.reportedBy = new mongoose.Types.ObjectId(
        validatedQuery.reportedBy
      );
    }

    // Tags filter (match any tag)
    if (validatedQuery.tags && validatedQuery.tags.length > 0) {
      filter.tags = { $in: validatedQuery.tags };
    }

    // Full-text search (searches title and description)
    if (validatedQuery.search) {
      filter.$text = { $search: validatedQuery.search };
    }

    // Calculate pagination
    const page = validatedQuery.page;
    const limit = validatedQuery.limit;
    const skip = (page - 1) * limit;

    // Build sort object
    const sortField = validatedQuery.sortBy;
    const sortOrder = validatedQuery.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // If searching, sort by text score first
    if (validatedQuery.search) {
      sort.score = { $meta: 'textScore' };
    }

    // Execute query with pagination
    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'firstName lastName email')
        .populate('reportedBy', 'firstName lastName email')
        .lean(),
      Issue.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    // ✅ FIXED: Pass data, message, and meta as separate arguments
    return successResponse(issues, 'Issues fetched successfully', {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Get issues error:', error);
    return errorResponse(new AppError('Failed to fetch issues', 500));
  }
});

// POST /api/issues - Create new issue
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    await connectDB();

    const body = await request.json();
    const validatedData = createIssueSchema.parse(body);

    // Verify assignedTo user exists if provided
    if (validatedData.assignedTo) {
      const User = (await import('@/models/User')).default;
      const assignee = await User.findById(validatedData.assignedTo);
      if (!assignee) {
        throw new AppError('Assigned user not found', 404);
      }
    }

    // Create issue
    const issue = await Issue.create({
      ...validatedData,
      reportedBy: user.userId,
    });

    // Populate references
    await issue.populate([
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'reportedBy', select: 'firstName lastName email' },
    ]);

    // Log audit trail
    await AuditLog.logAction(
      issue._id,
      new mongoose.Types.ObjectId(user.userId),
      AuditAction.CREATED,
      {
        metadata: {
          title: issue.title,
          type: issue.type,
          priority: issue.priority,
        },
      }
    );

    return successResponse(issue, 'Issue created successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Create issue error:', error);
    return errorResponse(new AppError('Failed to create issue', 500));
  }
});
