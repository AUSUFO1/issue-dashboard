import mongoose, { Schema, Document, Model } from 'mongoose';

// TypeScript interface for Comment document
export interface IComment extends Document {
  issueId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  isEdited: boolean;
  editedAt?: Date;
  deletedAt?: Date; // Soft delete
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  softDelete(): Promise<this>;
}

// Add static methods to model interface
interface CommentModel extends Model<IComment> {
  findActive(
    filter?: Record<string, any>
  ): mongoose.Query<IComment[], IComment>;
}

// Mongoose schema
const CommentSchema = new Schema<IComment>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'Issue ID is required'],
      index: true, // Frequently query comments by issue
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      minlength: [1, 'Comment must be at least 1 character'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
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

// Compound index for efficient queries
CommentSchema.index({ issueId: 1, createdAt: -1 }); // Get issue comments ordered by date
CommentSchema.index({ issueId: 1, deletedAt: 1 }); // Get non-deleted comments

// Pre-save middleware: Track edits
CommentSchema.pre('save', function () {
  if (this.isModified('text') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
});

// Static method: Find active comments (not soft-deleted)
CommentSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, deletedAt: null });
};

// Instance method: Soft delete
CommentSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// Create and export model
const Comment: CommentModel = (mongoose.models.Comment ||
  mongoose.model<IComment, CommentModel>(
    'Comment',
    CommentSchema
  )) as CommentModel;

export default Comment;
