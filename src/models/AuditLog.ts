import mongoose, { Schema, Document, Model } from 'mongoose';

// Audit action types
export enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  COMMENTED = 'COMMENTED',
  COMMENT_EDITED = 'COMMENT_EDITED',
  COMMENT_DELETED = 'COMMENT_DELETED',
}

// TypeScript interface for AuditLog document
export interface IAuditLog extends Document {
  issueId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: AuditAction;
  field?: string; // What field was changed (e.g., "status", "priority")
  oldValue?: string; // Previous value
  newValue?: string; // New value
  metadata?: Record<string, any>; // Additional context
  createdAt: Date;
}

// Add static methods to model interface
interface AuditLogModel extends Model<IAuditLog> {
  logAction(
    issueId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    action: AuditAction,
    details?: {
      field?: string;
      oldValue?: string;
      newValue?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<IAuditLog>;

  getIssueTimeline(
    issueId: mongoose.Types.ObjectId,
    limit?: number
  ): mongoose.Query<IAuditLog[], IAuditLog>;

  getUserActivity(
    userId: mongoose.Types.ObjectId,
    limit?: number
  ): mongoose.Query<IAuditLog[], IAuditLog>;
}

// Mongoose schema
const AuditLogSchema = new Schema<IAuditLog>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'Issue ID is required'],
      index: true, // Frequently query logs by issue
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: [true, 'Action is required'],
      index: true,
    },
    field: {
      type: String,
      default: null,
    },
    oldValue: {
      type: String,
      default: null,
    },
    newValue: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for efficient queries
AuditLogSchema.index({ issueId: 1, createdAt: -1 }); // Issue timeline
AuditLogSchema.index({ userId: 1, createdAt: -1 }); // User activity
AuditLogSchema.index({ action: 1, createdAt: -1 }); // Filter by action type

// Static method: Create audit log entry
AuditLogSchema.statics.logAction = async function (
  issueId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  action: AuditAction,
  details?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, any>;
  }
) {
  return this.create({
    issueId,
    userId,
    action,
    field: details?.field,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
    metadata: details?.metadata || {},
  });
};

// Static method: Get issue timeline
AuditLogSchema.statics.getIssueTimeline = function (
  issueId: mongoose.Types.ObjectId,
  limit = 50
) {
  return this.find({ issueId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

// Static method: Get user activity
AuditLogSchema.statics.getUserActivity = function (
  userId: mongoose.Types.ObjectId,
  limit = 50
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('issueId', 'title');
};

// Create and export model
const AuditLog: AuditLogModel = (mongoose.models.AuditLog ||
  mongoose.model<IAuditLog, AuditLogModel>(
    'AuditLog',
    AuditLogSchema
  )) as AuditLogModel;

export default AuditLog;
