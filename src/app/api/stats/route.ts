import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { connectDB } from '@/lib/db';
import Issue from '@/models/Issue';
import AuditLog from '@/models/AuditLog';
import { ISSUE_STATUS, ISSUE_PRIORITY, ISSUE_TYPE } from '@/lib/constants';
import type { IssueStatus, IssuePriority, IssueType } from '@/lib/constants';
import mongoose from 'mongoose';

// GET /api/stats - Get dashboard statistics
export const GET = withAuth(async (_request: NextRequest, { user }) => {
  try {
    await connectDB();

    const userId = new mongoose.Types.ObjectId(user.userId);

    // Run all stats queries in parallel for performance
    const [
      totalIssues,
      issuesByStatus,
      issuesByPriority,
      issuesByType,
      myAssignedIssues,
      myReportedIssues,
      criticalIssues,
      highPriorityIssues,
      resolvedIssues,
      recentActivity,
    ] = await Promise.all([
      // Total active issues
      Issue.countDocuments({ deletedAt: null }),

      // Issues grouped by status
      Issue.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Issues grouped by priority
      Issue.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      // Issues grouped by type
      Issue.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),

      // My assigned issues
      Issue.countDocuments({
        assignedTo: userId,
        deletedAt: null,
        status: { $nin: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.RESOLVED] },
      }),

      // My reported issues
      Issue.countDocuments({
        reportedBy: userId,
        deletedAt: null,
      }),

      // Critical issues
      Issue.countDocuments({
        priority: ISSUE_PRIORITY.CRITICAL,
        deletedAt: null,
        status: { $nin: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.RESOLVED] },
      }),

      // High priority issues
      Issue.countDocuments({
        priority: ISSUE_PRIORITY.HIGH,
        deletedAt: null,
        status: { $nin: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.RESOLVED] },
      }),

      // Get resolved issues for avg resolution time
      Issue.find({
        status: ISSUE_STATUS.RESOLVED,
        deletedAt: null,
        resolvedAt: { $exists: true },
      })
        .select('createdAt resolvedAt')
        .lean(),

      // Recent activity (last 10 actions)
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName email')
        .populate('issueId', 'title')
        .lean(),
    ]);

    // Convert aggregation results to objects
    const statusCounts: Record<IssueStatus, number> = {
      [ISSUE_STATUS.OPEN]: 0,
      [ISSUE_STATUS.IN_PROGRESS]: 0,
      [ISSUE_STATUS.RESOLVED]: 0,
      [ISSUE_STATUS.CLOSED]: 0,
    };
    issuesByStatus.forEach((item: any) => {
      statusCounts[item._id as IssueStatus] = item.count;
    });

    const priorityCounts: Record<IssuePriority, number> = {
      [ISSUE_PRIORITY.LOW]: 0,
      [ISSUE_PRIORITY.MEDIUM]: 0,
      [ISSUE_PRIORITY.HIGH]: 0,
      [ISSUE_PRIORITY.CRITICAL]: 0,
    };
    issuesByPriority.forEach((item: any) => {
      priorityCounts[item._id as IssuePriority] = item.count;
    });

    const typeCounts: Record<IssueType, number> = {
      [ISSUE_TYPE.BUG]: 0,
      [ISSUE_TYPE.FEATURE]: 0,
      [ISSUE_TYPE.TASK]: 0,
      [ISSUE_TYPE.INCIDENT]: 0,
    };
    issuesByType.forEach((item: any) => {
      typeCounts[item._id as IssueType] = item.count;
    });

    // Calculate average resolution time (in hours)
    let averageResolutionTime = 0;
    if (resolvedIssues.length > 0) {
      const totalResolutionTime = resolvedIssues.reduce(
        (sum: number, issue: any) => {
          const resolutionTime =
            (new Date(issue.resolvedAt).getTime() -
              new Date(issue.createdAt).getTime()) /
            (1000 * 60 * 60); // Convert to hours
          return sum + resolutionTime;
        },
        0
      );
      averageResolutionTime = Math.round(
        totalResolutionTime / resolvedIssues.length
      );
    }

    // Prepare response
    const stats = {
      totalIssues,
      openIssues: statusCounts[ISSUE_STATUS.OPEN],
      inProgressIssues: statusCounts[ISSUE_STATUS.IN_PROGRESS],
      resolvedIssues: statusCounts[ISSUE_STATUS.RESOLVED],
      closedIssues: statusCounts[ISSUE_STATUS.CLOSED],
      myAssignedIssues,
      myReportedIssues,
      criticalIssues,
      highPriorityIssues,
      averageResolutionTime,
      issuesByStatus: statusCounts,
      issuesByPriority: priorityCounts,
      issuesByType: typeCounts,
      recentActivity,
    };

    return successResponse(stats);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error('Get stats error:', error);
    return errorResponse(new AppError('Failed to fetch statistics', 500));
  }
});
