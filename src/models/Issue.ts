import mongoose, { Schema, Document, Model } from 'mongoose';
import { ISSUE_STATUS, ISSUE_PRIORITY, ISSUE_TYPE } from '@/lib/constants';

// TypeScript interface for Issue document
export interface IIssue extends Document {
  title: string;
  description: string;
  status: (typeof ISSUE_STATUS)[keyof typeof ISSUE_STATUS];
  priority: (typeof ISSUE_PRIORITY)[keyof typeof ISSUE_PRIORITY];
  type: (typeof ISSUE_TYPE)[keyof typeof ISSUE_TYPE];
  tags: string[];
  assignedTo?: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  closedAt?: Date;
  deletedAt?: Date; // Soft delete
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  softDelete(): Promise<this>;
  isOverdue(): boolean;
}

// Add static methods to model interface
interface IssueModel extends Model<IIssue> {
  findActive(filter?: Record<string, any>): mongoose.Query<IIssue[], IIssue>;
}

// Mongoose schema
const IssueSchema = new Schema<IIssue>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(ISSUE_STATUS),
      default: ISSUE_STATUS.OPEN,
      required: true,
      index: true, // Filter by status frequently
    },
    priority: {
      type: String,
      enum: Object.values(ISSUE_PRIORITY),
      default: ISSUE_PRIORITY.MEDIUM,
      required: true,
      index: true, // Filter by priority frequently
    },
    type: {
      type: String,
      enum: Object.values(ISSUE_TYPE),
      required: [true, 'Issue type is required'],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 10;
        },
        message: 'Cannot have more than 10 tags',
      },
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true, // Filter by assignee frequently
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true, // For soft delete queries
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
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

// Compound indexes for common query patterns
IssueSchema.index({ status: 1, priority: -1, createdAt: -1 }); // List view
IssueSchema.index({ assignedTo: 1, status: 1 }); // User's assigned issues
IssueSchema.index({ reportedBy: 1, createdAt: -1 }); // User's reported issues
IssueSchema.index({ deletedAt: 1, createdAt: -1 }); // Exclude soft-deleted

// Full-text search index (title + description)
IssueSchema.index({ title: 'text', description: 'text' });

// Virtual for resolution time (in hours)
IssueSchema.virtual('resolutionTime').get(function () {
  if (this.resolvedAt && this.createdAt) {
    const diff = this.resolvedAt.getTime() - this.createdAt.getTime();
    return Math.round(diff / (1000 * 60 * 60)); // Convert to hours
  }
  return null;
});

// Pre-save middleware: Auto-set resolvedAt when status changes to RESOLVED
IssueSchema.pre('save', function () {
  if (this.isModified('status')) {
    if (this.status === ISSUE_STATUS.RESOLVED && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
    if (this.status === ISSUE_STATUS.CLOSED && !this.closedAt) {
      this.closedAt = new Date();
    }
  }
});

// Static method: Find active issues (not soft-deleted)
IssueSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, deletedAt: null });
};

// Instance method: Soft delete
IssueSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// Instance method: Check if issue is overdue (open for > 7 days)
IssueSchema.methods.isOverdue = function () {
  if (
    this.status === ISSUE_STATUS.CLOSED ||
    this.status === ISSUE_STATUS.RESOLVED
  ) {
    return false;
  }
  const daysSinceCreation =
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation > 7;
};

// Create and export model
const Issue: IssueModel = (mongoose.models.Issue ||
  mongoose.model<IIssue, IssueModel>('Issue', IssueSchema)) as IssueModel;

export default Issue;
